// src/main.ts
import { setFailed } from "@actions/core";
import { context } from "@actions/github";

// src/generated/github-action.ts
import * as core from "@actions/core";
var getInput2 = {
  string: core.getInput,
  boolean: core.getBooleanInput,
  multiline: core.getMultilineInput
};
var parseInputs = (options) => {
  return {
    "cwd": getInput2[options?.["cwd"]?.type ?? "string"]("cwd", { trimWhitespace: options?.cwd?.trimWhitespace }),
    "token": getInput2[options?.["token"]?.type ?? "string"]("token", { trimWhitespace: options?.cwd?.trimWhitespace }),
    "setup-git-user": getInput2[options?.["setup-git-user"]?.type ?? "string"]("setup-git-user", { trimWhitespace: options?.cwd?.trimWhitespace })
  };
};

// src/run.ts
import { ok } from "node:assert";
import { existsSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { info } from "@actions/core";
import { getPackages } from "@manypkg/get-packages";
import sanitize from "sanitize-filename";

// src/utils/index.ts
var isPackageJson = (filename) => {
  return filename === "package.json";
};
var isPackageLockFile = (filename) => {
  return filename === "package-lock.json" || filename === "yarn.lock" || filename === "pnpm-lock.yaml" || filename === "bun.lockb";
};

// src/utils/git.ts
import { setSecret } from "@actions/core";
import { exec, getExecOutput } from "@actions/exec";
var execWithToken = async (token, args, options) => {
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
      ...args
    ],
    options
  );
};
var fetch = async (cwd, token, base, head) => {
  return await execWithToken(
    token,
    ["fetch", "origin", base, head, "--no-tags"],
    { cwd }
  );
};
var diffFiles = async (cwd, base, head) => {
  const { stdout } = await getExecOutput(
    "git",
    ["diff", `${base}..${head}`, "--name-only"],
    { cwd }
  );
  return stdout.split("\n").map((v) => v.trim()).filter((v) => v.length > 0);
};
var isDirty = async (cwd) => {
  const { stdout } = await getExecOutput("git", ["status", "--porcelain"], {
    cwd
  });
  return stdout.trim().length > 0;
};
var commitAll = async (cwd, message) => {
  await exec("git", ["add", "."], { cwd });
  return await exec("git", ["commit", "-m", message], { cwd });
};
var pullRebase = async (cwd, token, base) => {
  return await execWithToken(token, ["pull", "--rebase", "origin", base], {
    cwd
  });
};
var push = async (cwd, token, head, force = false) => {
  return await execWithToken(
    token,
    ["push", "origin", `HEAD:${head}`, ...force ? ["--force"] : []],
    {
      cwd
    }
  );
};
var checkout = async (cwd, branch) => {
  return await exec("git", ["checkout", branch], { cwd });
};
var DEFAULT_GITHUB_ACTION_NAME = "github-actions[bot]";
var DEFAULT_GITHUB_ACTION_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com";
var configure = async (cwd) => {
  await exec("git", ["config", "user.name", DEFAULT_GITHUB_ACTION_NAME], {
    cwd
  });
  await exec("git", ["config", "user.email", DEFAULT_GITHUB_ACTION_EMAIL], {
    cwd
  });
};

// src/run.ts
var run = async (inputs2) => {
  ok(inputs2.context.payload.pull_request, "Expected pull_request event");
  const base = inputs2.context.payload.pull_request.base.sha;
  const baseRef = inputs2.context.payload.pull_request.base.ref;
  const head = inputs2.context.payload.pull_request.head.sha;
  const headRef = inputs2.context.payload.pull_request.head.ref;
  const title = inputs2.context.payload.pull_request.title;
  ok(base, "Expected base sha");
  ok(baseRef, "Expected base ref");
  ok(head, "Expected head sha");
  ok(headRef, "Expected head ref");
  ok(title, "Expected title");
  await fetch(inputs2.cwd, inputs2.token, base, head);
  await checkout(inputs2.cwd, head);
  const changedFiles = await diffFiles(inputs2.cwd, base, head);
  const diffPackages = Array.from(
    new Set(
      changedFiles.filter((filepath) => {
        const filename2 = basename(filepath);
        return isPackageJson(filename2) || isPackageLockFile(filename2);
      }).map((filepath) => {
        return dirname(filepath);
      })
    )
  );
  const { packages } = await getPackages(inputs2.cwd);
  const affectedPackages = packages.filter(
    (pkg) => diffPackages.includes(pkg.relativeDir || ".")
  );
  const filename = join(
    inputs2.cwd,
    ".changeset",
    sanitize(`${baseRef}__${headRef}.md`)
  );
  if (affectedPackages.length === 0) {
    info("No packages affected");
    if (existsSync(filename)) {
      await unlink(filename);
    }
  } else {
    info("Creating changeset file");
    await writeFile(
      filename,
      `---
${affectedPackages.map((v) => `"${v.packageJson.name}": patch`).join("\n")}
---

${title}
`
    );
  }
  if (!await isDirty(inputs2.cwd)) {
    info("No changes");
    return;
  }
  if (inputs2["setup-git-user"]) {
    await configure(inputs2.cwd);
  }
  await commitAll(inputs2.cwd, "chore: update changeset");
  await pullRebase(inputs2.cwd, inputs2.token, headRef);
  await push(inputs2.cwd, inputs2.token, headRef, true);
  throw new Error("some files are updated, this PR should be updated");
};

// src/main.ts
var inputs = parseInputs({ "setup-git-user": { type: "boolean" } });
var main = async () => {
  return run({
    context,
    ...inputs
  });
};
main().catch((error) => {
  console.error(error);
  setFailed(error);
});
