import * as core from "@actions/core";
import type { getOctokit } from "@actions/github";
import type { Context } from "@actions/github/lib/context";
import getChangesets from "@changesets/read";
import type { VersionType } from "@changesets/types";
import { dumpOutputs } from "./generated/github-action";
import type { ActionInputs } from "./main";
import { runPublish } from "./publish";
import { runVersion } from "./version";

const VersionIndex = {
  none: 0,
  patch: 1,
  minor: 2,
  major: 3,
} satisfies Record<VersionType, number>;

export type Inputs = ActionInputs & {
  readonly branch?: string;
  readonly context: Context;
  readonly octokit: ReturnType<typeof getOctokit>;
  readonly changesetCliInstallDir: string;
};

export const run = async (inputs: Inputs) => {
  const changesets = await getChangesets(inputs.cwd);
  const versionType = changesets
    .flatMap((v) => v.releases.map((v) => v.type))
    .reduce((acc, cur) => {
      return VersionIndex[cur] > VersionIndex[acc] ? cur : acc;
    }, "none");

  dumpOutputs({
    "pr-number": "",
    published: "false",
  });

  if (
    versionType === "none" &&
    changesets.length !== 0 &&
    changesets.every((changeset) => changeset.releases.length === 0)
  ) {
    core.info("All changesets are empty; not creating PR");
    return;
  }

  if (changesets.length !== 0) {
    const { pullRequestNumber } = await runVersion(inputs);

    dumpOutputs({
      "pr-number": pullRequestNumber.toString(),
    });
    return;
  }

  core.info("No changesets found, attempting to release");
  const { published } = await runPublish(inputs);
  dumpOutputs({
    published: published.toString(),
  });
};
