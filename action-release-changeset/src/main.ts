import { resolve } from "node:path";
import { setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { parseInputs } from "./generated/github-action";
import { run } from "./run";

const inputs = parseInputs({
  "setup-git-user": { type: "boolean" },
  "auto-merge": { type: "boolean" },
});
export type ActionInputs = typeof inputs;

const main = async (): Promise<void> => {
  await run({
    ...inputs,
    cwd: resolve(inputs.cwd),
    context: context,
    octokit: getOctokit(inputs.token),
    changesetCliInstallDir: resolve(inputs.cwd),
  });
};

main().catch((e: Error) => {
  console.error(e);
  setFailed(e);
});
