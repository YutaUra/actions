import { ok } from "node:assert";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { info } from "@actions/core";
import type { Context } from "@actions/github/lib/context";
import { getPackages } from "@manypkg/get-packages";
import { updateReadme } from "./update/update-readme";
import * as git from "./utils/git";

export type Inputs = {
  readonly context: Context;
  readonly token: string;
  readonly cwd: string;
  readonly setupGitUser: boolean;
};

export const run = async (inputs: Inputs) => {
  // fetch base ~ head commits
  ok(inputs.context.payload.pull_request, "Expected pull_request event");
  const base = inputs.context.payload.pull_request.base.sha;
  const baseRef = inputs.context.payload.pull_request.base.ref;
  const head = inputs.context.payload.pull_request.head.sha;
  const headRef = inputs.context.payload.pull_request.head.ref;
  ok(base, "Expected base sha");
  ok(baseRef, "Expected base ref");
  ok(head, "Expected head sha");
  ok(headRef, "Expected head ref");
  await git.fetch(inputs.cwd, inputs.token, base, head);
  await git.checkout(inputs.cwd, head);

  const { packages } = await getPackages(inputs.cwd);

  for (const pkg of packages) {
    const readmePath = join(pkg.dir, "README.md");
    if (!existsSync(readmePath)) continue;

    const readme = await readFile(readmePath, "utf-8");
    const updatedReadme = updateReadme({
      readme,
      replaceActionVersions: packages.map((pkg) => ({
        name: `${inputs.context.repo.owner}/${inputs.context.repo.repo}${pkg.relativeDir === "" ? "" : `/${pkg.relativeDir}`}`,
        version: pkg.packageJson.version,
      })),
    });
    await writeFile(readmePath, updatedReadme);
  }

  // if git status is dirty, commit and push
  if (!(await git.isDirty(inputs.cwd))) {
    info("No changes");
    return;
  }

  if (inputs.setupGitUser) {
    await git.configure(inputs.cwd);
  }

  // commit, pull --rebase and push
  await git.commitAll(inputs.cwd, "chore: update changeset");
  await git.pullRebase(inputs.cwd, inputs.token, baseRef);
  await git.push(inputs.cwd, inputs.token, headRef);

  // pr should be updated, so this action should be failed
  throw new Error("some files are updated, this PR should be updated");
};