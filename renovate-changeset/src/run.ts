import { ok } from "node:assert";
import { existsSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { info } from "@actions/core";
import type { Context } from "@actions/github/lib/context";
import { getPackages } from "@manypkg/get-packages";
import sanitize from "sanitize-filename";
import type { ActionInputs } from "./main";
import { isPackageJson, isPackageLockFile } from "./utils";
import * as git from "./utils/git";

export type Inputs = ActionInputs & {
  readonly context: Context;
};

export const run = async (inputs: Inputs) => {
  // fetch base ~ head commits
  ok(inputs.context.payload.pull_request, "Expected pull_request event");
  const base = inputs.context.payload.pull_request.base.sha;
  const baseRef = inputs.context.payload.pull_request.base.ref;
  const head = inputs.context.payload.pull_request.head.sha;
  const headRef = inputs.context.payload.pull_request.head.ref;
  const title = inputs.context.payload.pull_request.title;
  ok(base, "Expected base sha");
  ok(baseRef, "Expected base ref");
  ok(head, "Expected head sha");
  ok(headRef, "Expected head ref");
  ok(title, "Expected title");
  await git.fetch(inputs.cwd, inputs.token, base, head);
  await git.checkout(inputs.cwd, head);

  // get diff between base ~ head
  const changedFiles = await git.diffFiles(inputs.cwd, base, head);
  const diffPackages = Array.from(
    new Set(
      changedFiles
        .filter((filepath) => {
          const filename = basename(filepath);
          return isPackageJson(filename) || isPackageLockFile(filename);
        })
        .map((filepath) => {
          return dirname(filepath);
        }),
    ),
  );

  const { packages } = await getPackages(inputs.cwd);

  const affectedPackages = packages.filter((pkg) =>
    diffPackages.includes(pkg.relativeDir || "."),
  );

  const filename = join(
    inputs.cwd,
    ".changeset",
    sanitize(`${baseRef}__${headRef}.md`),
  );

  if (affectedPackages.length === 0) {
    // delete file
    info("No packages affected");
    if (existsSync(filename)) {
      await unlink(filename);
    }
  } else {
    // create changeset file
    info("Creating changeset file");

    await writeFile(
      filename,
      `\
---
${affectedPackages.map((v) => `"${v.packageJson.name}": patch`).join("\n")}
---

${title}
`,
    );
  }

  // if git status is dirty, commit and push
  if (!(await git.isDirty(inputs.cwd))) {
    info("No changes");
    return;
  }

  if (inputs["setup-git-user"]) {
    await git.configure(inputs.cwd);
  }

  // commit, pull --rebase and push
  await git.commitAll(inputs.cwd, "chore: update changeset");
  await git.pullRebase(inputs.cwd, inputs.token, headRef);
  await git.push(inputs.cwd, inputs.token, headRef, true);

  // pr should be updated, so this action should be failed
  throw new Error("some files are updated, this PR should be updated");
};
