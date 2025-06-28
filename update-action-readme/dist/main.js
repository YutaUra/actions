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
import { ok as ok2 } from "assert";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { info } from "@actions/core";
import { getPackages } from "@manypkg/get-packages";
import { parse as parse2 } from "yaml";

// src/update/update-readme.ts
import { markdownTable } from "markdown-table";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { parse } from "yaml";

// src/utils/isGitHubWorkflow.ts
var isGitHubWorkflowJobStep = (content) => {
  if (typeof content !== "object" || content === null) return false;
  if ("uses" in content) {
    return typeof content.uses === "string";
  }
  return true;
};
var isGitHubWorkflowJob = (content) => {
  if (typeof content !== "object" || content === null) return false;
  if ("steps" in content) {
    if (!Array.isArray(content.steps)) return false;
    return content.steps.every(isGitHubWorkflowJobStep);
  }
  return false;
};
var isGitHubWorkflow = (content) => {
  if (typeof content !== "object" || content === null) return false;
  if ("jobs" in content) {
    if (typeof content.jobs !== "object" || content.jobs === null) return false;
    return Object.values(content.jobs).every(isGitHubWorkflowJob);
  }
  return false;
};

// src/update/update-yaml.ts
import { ok } from "assert";
import { parseDocument, Scalar, YAMLMap, YAMLSeq } from "yaml";
var updateYaml = ({
  workflow,
  replaceActionVersions
}) => {
  const parsed = parseDocument(workflow, {});
  ok(parsed.contents instanceof YAMLMap);
  const jobs = parsed.get("jobs");
  ok(jobs instanceof YAMLMap);
  for (const { value: job } of jobs.items) {
    ok(job instanceof YAMLMap);
    const steps = job.get("steps");
    ok(steps instanceof YAMLSeq);
    for (const step of steps.items) {
      ok(step instanceof YAMLMap);
      const uses = step.get("uses", true);
      if (!uses) continue;
      ok(uses instanceof Scalar);
      ok(typeof uses.value === "string");
      const [actionName] = uses.value.split("@");
      ok(actionName);
      const newActionVersion = replaceActionVersions.find(
        (v) => v.name === actionName
      );
      if (!newActionVersion) continue;
      if (newActionVersion.hash) {
        uses.value = `${actionName}@${newActionVersion.hash}`;
        uses.comment = ` ${newActionVersion.version}`;
      } else {
        uses.value = `${actionName}@${newActionVersion.version}`;
      }
    }
  }
  return parsed.toString();
};

// src/update/update-readme.ts
var processor = unified().use(remarkParse).use(remarkStringify);
var updateReadme = ({
  readme,
  replaceActionVersions,
  actionYaml
}) => {
  const tree = processor.parse(readme);
  visit(tree, "code", (code) => {
    if (code.lang !== "yaml") return;
    if (!isGitHubWorkflow(parse(code.value))) return;
    code.value = updateYaml({ workflow: code.value, replaceActionVersions });
  });
  const versionReadme = processor.stringify(tree);
  return versionReadme.replace(
    /(?<=<!-- update-action-readme:inputs:start -->\n).*(?=\n<!-- update-action-readme:inputs:end -->)/s,
    markdownTable([
      ["Name", "Default", "Description"],
      ...Object.entries(actionYaml.inputs ?? {}).filter(
        ([, value]) => typeof value.deprecationMessage === "undefined"
      ).map(([name, value]) => [
        name,
        value.default ?? "",
        value.description ?? ""
      ])
    ])
  ).replace(
    /(?<=<!-- update-action-readme:outputs:start -->\n).*(?=\n<!-- update-action-readme:outputs:end -->)/s,
    markdownTable([
      ["Name", "Description"],
      ...Object.entries(
        actionYaml.outputs ?? {}
      ).map(([name, value]) => [name, value.description ?? ""])
    ])
  );
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
  ok2(inputs2.context.payload.pull_request, "Expected pull_request event");
  const base = inputs2.context.payload.pull_request.base.sha;
  const head = inputs2.context.payload.pull_request.head.sha;
  const headRef = inputs2.context.payload.pull_request.head.ref;
  ok2(base, "Expected base sha");
  ok2(head, "Expected head sha");
  ok2(headRef, "Expected head ref");
  await fetch(inputs2.cwd, inputs2.token, base, head);
  await checkout(inputs2.cwd, head);
  const { packages } = await getPackages(inputs2.cwd);
  for (const pkg of packages) {
    const readmePath = join(pkg.dir, "README.md");
    if (!existsSync(readmePath)) continue;
    const readme = await readFile(readmePath, "utf-8");
    const actionYamlPath = existsSync(join(pkg.dir, "action.yml")) ? join(pkg.dir, "action.yml") : join(pkg.dir, "action.yaml");
    const actionYaml = parse2(
      await readFile(actionYamlPath, "utf-8")
    );
    const updatedReadme = updateReadme({
      readme,
      replaceActionVersions: packages.map((pkg2) => ({
        name: `${inputs2.context.repo.owner}/${inputs2.context.repo.repo}${pkg2.relativeDir === "" ? "" : `/${pkg2.relativeDir}`}`,
        version: pkg2.packageJson.version
      })),
      actionYaml
    });
    await writeFile(readmePath, updatedReadme);
  }
  if (!await isDirty(inputs2.cwd)) {
    info("No changes");
    return;
  }
  if (inputs2["setup-git-user"]) {
    await configure(inputs2.cwd);
  }
  await commitAll(inputs2.cwd, "chore: update readme");
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
