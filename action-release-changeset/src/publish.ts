import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import * as core from "@actions/core";
import type { getOctokit } from "@actions/github";
import type { Context } from "@actions/github/lib/context";
import { getPackages } from "@manypkg/get-packages";
import type { ActionInputs } from "./main";
import { escapeMarkdownString, getChangelogEntry } from "./utils";
import * as git from "./utils/git";

const execAsync = promisify(exec);

export type Inputs = ActionInputs & {
  readonly octokit: ReturnType<typeof getOctokit>;
  readonly context: Context;
};

export const runPublish = async (inputs: Inputs) => {
  const { rootPackage } = await getPackages(inputs.cwd);

  const version = rootPackage?.packageJson.version;

  if (!version) {
    throw new Error("No version found in root package.json");
  }

  // check version tag exists
  const isTagExists = await git.fetchIsTagExistsOnRemote(
    inputs.cwd,
    `v${version}`,
  );

  if (isTagExists) {
    core.info(`v${version} tag already exists`);
    core.info("Skipping release");
    return { published: false };
  }
  if (inputs["setup-git-user"]) {
    await git.configure(inputs.cwd);
  }

  if (inputs["pre-tag-script"] && inputs["pre-tag-script"].trim().length > 0) {
    await execAsync(inputs["pre-tag-script"].trim(), { cwd: inputs.cwd });
    if (await git.isDirty(inputs.cwd)) {
      await git.commit(inputs.cwd, "pre tag script result", ".");
    }
  }

  await git.tag(inputs.cwd, `v${version}`);
  await git.pushTag(inputs.cwd);

  const { packages, rootDir } = await getPackages(inputs.cwd);
  const entries = await Promise.all(
    packages.map(async ({ dir, packageJson }) => {
      const changelogFileName = join(dir, "CHANGELOG.md");

      const changelog = await readFile(changelogFileName, "utf8");
      const content = getChangelogEntry(changelog, version).content.trim();

      const headerLevel = rootDir === dir ? "#" : "#";
      if (!content)
        return `${headerLevel} ${escapeMarkdownString(packageJson.name)} v${version}`;

      return `\
${headerLevel} ${escapeMarkdownString(packageJson.name)} v${version}

${content}
`;
    }),
  );

  await inputs.octokit.rest.repos.createRelease({
    ...inputs.context.repo,
    name: `v${version}`,
    tag_name: `v${version}`,
    body: entries.join("\n\n"),
  });
  return { published: true };
};
