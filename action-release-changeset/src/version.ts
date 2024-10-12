import { join } from "node:path";
import * as core from "@actions/core";
import { exec } from "@actions/exec";
import type { getOctokit } from "@actions/github";
import type { Context } from "@actions/github/lib/context";
import { getPackages } from "@manypkg/get-packages";
import resolveFrom from "resolve-from";
import { lt } from "semver";
import type { ActionInputs } from "./main";
import { getVersionPrBody, requireChangesetsCliPkgJson } from "./utils";
import * as git from "./utils/git";

type VersionInput = ActionInputs & {
  readonly branch?: string;
  readonly context: Context;
  readonly changesetCliInstallDir: string;
  readonly octokit: ReturnType<typeof getOctokit>;
};

export const runVersion = async (inputs: VersionInput) => {
  // switch to version branch
  const branch = inputs.branch ?? inputs.context.ref.replace("refs/heads/", "");
  const versionBranch = `action-release-changeset/${branch}`;
  await git.switchBranch(inputs.cwd, versionBranch);
  await git.resetHard(inputs.cwd, inputs.context.sha);

  const versionsByDirectory = new Map(
    (await getPackages(inputs.cwd)).packages.map((x) => [
      x.dir,
      x.packageJson.version,
    ]),
  );

  const changesetsCliPkgJson = requireChangesetsCliPkgJson(
    inputs.changesetCliInstallDir,
  );
  const cmd = lt(changesetsCliPkgJson.version, "2.0.0") ? "bump" : "version";
  await exec(
    "node",
    [resolveFrom(inputs.changesetCliInstallDir, "@changesets/cli/bin.js"), cmd],
    {
      cwd: inputs.cwd,
      env: { NODE_PATH: join(inputs.changesetCliInstallDir, "node_modules") },
    },
  );

  // commit
  // configure git user
  if (inputs["setup-git-user"]) {
    await git.configure(inputs.cwd);
  }
  await git.commit(
    inputs.cwd,
    inputs["commit-message"] || "Version Action",
    ".",
  );
  await git.push(inputs.cwd, versionBranch, inputs.token);

  // fetch PR
  const pulls = await inputs.octokit.rest.pulls.list({
    ...inputs.context.repo,
    state: "open",
    head: `${inputs.context.repo.owner}:${versionBranch}`,
    base: branch,
  });

  const prBody = await getVersionPrBody({
    branch,
    cwd: inputs.cwd,
    versionsByDirectory,
  });

  if (pulls.data.length === 0) {
    core.info("creating pull request");
    const { data } = await inputs.octokit.rest.pulls.create({
      ...inputs.context.repo,
      base: branch,
      head: versionBranch,
      title: inputs["pr-title"] || "Release Action",
      body: prBody,
    });
    if (inputs["auto-merge"]) {
      await git.autoMerge(data.number, inputs.context, inputs.octokit);
    }
    return {
      pullRequestNumber: data.number,
    };
  }
  // biome-ignore lint/style/noNonNullAssertion: length is checked
  const pullRequest = pulls.data[0]!;
  core.info(`updating found pull request #${pullRequest.number}`);

  await inputs.octokit.rest.pulls.update({
    ...inputs.context.repo,
    pull_number: pullRequest.number,
    title: inputs["pr-title"] || "Release Action",
    body: prBody,
    state: "open",
  });

  if (inputs["auto-merge"]) {
    await git.autoMerge(pullRequest.number, inputs.context, inputs.octokit);
  }
  return {
    pullRequestNumber: pullRequest.number,
  };
};
