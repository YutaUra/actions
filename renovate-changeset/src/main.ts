import { resolve } from "node:path";
import { getBooleanInput, getInput, setFailed } from "@actions/core";
import { context } from "@actions/github";
import { run } from "./run";

const main = async () => {
  const token = getInput("token", { required: true });

  return run({
    context,
    token,
    cwd: resolve(getInput("cwd", { required: true })),
    setupGitUser: getBooleanInput("setup-git-user"),
  });
};

main().catch((error) => {
  console.error(error);
  setFailed(error);
});
