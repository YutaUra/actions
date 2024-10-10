import * as core from "@actions/core";
import type { getOctokit } from "@actions/github";
import type { Context } from "@actions/github/lib/context";
import getChangesets from "@changesets/read";
import type { VersionType } from "@changesets/types";
import { runPublish } from "./publish";
import { runVersion } from "./version";

const VersionIndex = {
  none: 0,
  patch: 1,
  minor: 2,
  major: 3,
} satisfies Record<VersionType, number>;

export type Inputs = {
  readonly cwd: string;
  readonly branch?: string;
  readonly context: Context;
  readonly commitMessage: string;
  readonly prTitle: string;
  readonly token: string;
  readonly octokit: ReturnType<typeof getOctokit>;
  readonly changesetCliInstallDir: string;
  readonly setupGitUser: boolean;
  readonly autoMerge: boolean;
  readonly preTagScript: string;
};

export const run = async (inputs: Inputs) => {
  const changesets = await getChangesets(inputs.cwd);
  const versionType = changesets
    .flatMap((v) => v.releases.map((v) => v.type))
    .reduce((acc, cur) => {
      return VersionIndex[cur] > VersionIndex[acc] ? cur : acc;
    }, "none");

  core.setOutput("pr-number", "");
  core.setOutput("published", false);

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

    core.setOutput("pr-number", pullRequestNumber.toString());
    return;
  }

  core.info("No changesets found, attempting to release");
  const { published } = await runPublish(inputs);
  core.setOutput("published", published);
};
