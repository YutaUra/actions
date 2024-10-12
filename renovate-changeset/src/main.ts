import { setFailed } from "@actions/core";
import { context } from "@actions/github";
import { parseInputs } from "./generated/github-action";
import { run } from "./run";

const inputs = parseInputs({ "setup-git-user": { type: "boolean" } });
export type ActionInputs = typeof inputs;

const main = async () => {
  return run({
    context,
    ...inputs,
  });
};

main().catch((error) => {
  console.error(error);
  setFailed(error);
});
