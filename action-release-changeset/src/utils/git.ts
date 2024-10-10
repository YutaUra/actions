import { setSecret } from "@actions/core";
import { exec, getExecOutput } from "@actions/exec";
import type { getOctokit } from "@actions/github";
import type { Context } from "@actions/github/lib/context";

const DEFAULT_GITHUB_ACTION_NAME = "github-actions[bot]";
const DEFAULT_GITHUB_ACTION_EMAIL =
  "41898282+github-actions[bot]@users.noreply.github.com";

export const configure = async (cwd: string) => {
  await exec("git", ["config", "user.name", DEFAULT_GITHUB_ACTION_NAME], {
    cwd,
  });
  await exec("git", ["config", "user.email", DEFAULT_GITHUB_ACTION_EMAIL], {
    cwd,
  });
};

export const fetchIsTagExistsOnRemote = async (cwd: string, tag: string) => {
  // git ls-remote --tags origin tag
  const result = await getExecOutput(
    "git",
    ["ls-remote", "--tags", "origin", tag],
    { cwd },
  );
  if (result.exitCode !== 0) {
    throw new Error(`Failed to check if tag ${tag} exists: ${result.stderr}`);
  }
  return result.stdout.includes(tag);
};

export const tag = async (cwd: string, tag: string) => {
  await exec("git", ["tag", tag], { cwd });
};

export const pushTag = async (cwd: string) => {
  await getExecOutput("git", ["push", "--tags"], { cwd });
};

export const commit = async (
  cwd: string,
  message: string,
  files: string | string[] = ".",
) => {
  await exec("git", ["add", ...(Array.isArray(files) ? files : [files])], {
    cwd,
  });
  await exec("git", ["commit", "-m", message], {
    cwd,
  });
};

export const push = async (
  cwd: string,
  remoteBranch: string,
  token?: string,
) => {
  if (!token) {
    await exec("git", ["push", "origin", `HEAD:${remoteBranch}`, "--force"], {
      cwd,
    });

    return;
  }
  const credentials = Buffer.from(`x-access-token:${token}`).toString("base64");
  setSecret(credentials);
  await exec(
    "git",
    [
      // reset extraheader set by actions/checkout
      // https://github.com/actions/checkout/issues/162#issuecomment-590821598
      "-c",
      "http.https://github.com/.extraheader=",
      // replace the token
      "-c",
      `http.https://github.com/.extraheader=AUTHORIZATION: basic ${credentials}`,
      "push",
      "origin",
      `HEAD:${remoteBranch}`,
      "--force",
    ],
    { cwd },
  );
};

export const switchBranch = async (cwd: string, branch: string) => {
  // branch if not exists, create branch, then checkout
  const { stderr } = await getExecOutput("git", ["switch", "-c", branch], {
    cwd: cwd,
    ignoreReturnCode: true,
  });
  const isCreatingBranch = !stderr
    .toString()
    .includes(`Switched to a new branch '${branch}'`);
  if (!isCreatingBranch) {
    await exec("git", ["switch", branch], { cwd });
  }
};

export const resetHard = async (cwd: string, target: string) => {
  await exec("git", ["reset", "--hard", target], { cwd });
};

export const autoMerge = async (
  prNumber: number,
  context: Context,
  octokit: ReturnType<typeof getOctokit>,
) => {
  const {
    repository: { pullRequest },
  } = await octokit.graphql<{ repository: { pullRequest: { id: string } } }>(
    `
    query GetPullRequest($name: String!, $owner: String!, $prNumber: Int!) {
      repository(name: $name, owner: $owner) {
        pullRequest(number: $prNumber) {
          id
        }
      } 
    } 
`,
    {
      owner: context.repo.owner,
      name: context.repo.repo,
      prNumber: prNumber,
    },
  );

  await octokit.graphql<{ repository: { pullRequest: { id: string } } }>(
    `
    mutation EnableAutoMerge($pullRequestId: ID!) {
      enablePullRequestAutoMerge(input: {pullRequestId: $pullRequestId, mergeMethod: MERGE}) {
        clientMutationId
      }
    }
`,
    { pullRequestId: pullRequest.id },
  );
};
