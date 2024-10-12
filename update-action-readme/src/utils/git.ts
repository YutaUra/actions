import { setSecret } from "@actions/core";
import { type ExecOptions, exec, getExecOutput } from "@actions/exec";

const execWithToken = async (
  token: string,
  args: readonly string[],
  options?: ExecOptions,
) => {
  const credentials = Buffer.from(`x-access-token:${token}`).toString("base64");
  setSecret(credentials);
  return await exec(
    "git",
    [
      // reset extraheader set by actions/checkout
      // https://github.com/actions/checkout/issues/162#issuecomment-590821598
      "-c",
      "http.https://github.com/.extraheader=",
      // replace the token
      "-c",
      `http.https://github.com/.extraheader=AUTHORIZATION: basic ${credentials}`,
      ...args,
    ],
    options,
  );
};

export const fetch = async (
  cwd: string,
  token: string,
  base: string,
  head: string,
) => {
  return await execWithToken(
    token,
    ["fetch", "origin", base, head, "--no-tags"],
    { cwd },
  );
};

export const diffFiles = async (cwd: string, base: string, head: string) => {
  const { stdout } = await getExecOutput(
    "git",
    ["diff", `${base}..${head}`, "--name-only"],
    { cwd },
  );

  return stdout
    .split("\n")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
};

export const isDirty = async (cwd: string) => {
  const { stdout } = await getExecOutput("git", ["status", "--porcelain"], {
    cwd,
  });
  return stdout.trim().length > 0;
};

export const commitAll = async (cwd: string, message: string) => {
  await exec("git", ["add", "."], { cwd });
  return await exec("git", ["commit", "-m", message], { cwd });
};

export const pullRebase = async (cwd: string, token: string, base: string) => {
  return await execWithToken(token, ["pull", "--rebase", "origin", base], {
    cwd,
  });
};

export const push = async (
  cwd: string,
  token: string,
  head: string,
  force = false,
) => {
  return await execWithToken(
    token,
    ["push", "origin", `HEAD:${head}`, ...(force ? ["--force"] : [])],
    {
      cwd,
    },
  );
};

export const checkout = async (cwd: string, branch: string) => {
  return await exec("git", ["checkout", branch], { cwd });
};

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
