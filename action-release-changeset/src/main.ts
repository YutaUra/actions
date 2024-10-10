import { resolve } from "node:path";
import { getBooleanInput, getInput, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { run } from "./run";

const main = async (): Promise<void> => {
  const cwd = resolve(getInput("cwd", { required: true }));
  const commitMessage = getInput("commit-message") || "Version Action";
  const prTitle = getInput("pr-title") || "Release Action";
  const token = getInput("token") || process.env.GITHUB_TOKEN || "";
  const setupGitUser = getBooleanInput("setup-git-user");
  await run({
    cwd,
    context: context,
    commitMessage: commitMessage,
    prTitle: prTitle,
    token: token,
    octokit: getOctokit(token),
    changesetCliInstallDir: cwd,
    setupGitUser,
    autoMerge: getBooleanInput("auto-merge"),
    preTagScript: getInput("pre-tag-script"),
  });
};

main().catch((e: Error) => {
  console.error(e);
  setFailed(e);
});
