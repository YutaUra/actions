// src/main.ts
import { resolve } from "node:path";
import { setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";

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
    "commit-message": getInput2[options?.["commit-message"]?.type ?? "string"]("commit-message", { trimWhitespace: options?.cwd?.trimWhitespace }),
    "pr-title": getInput2[options?.["pr-title"]?.type ?? "string"]("pr-title", { trimWhitespace: options?.cwd?.trimWhitespace }),
    "token": getInput2[options?.["token"]?.type ?? "string"]("token", { trimWhitespace: options?.cwd?.trimWhitespace }),
    "setup-git-user": getInput2[options?.["setup-git-user"]?.type ?? "string"]("setup-git-user", { trimWhitespace: options?.cwd?.trimWhitespace }),
    "auto-merge": getInput2[options?.["auto-merge"]?.type ?? "string"]("auto-merge", { trimWhitespace: options?.cwd?.trimWhitespace }),
    "pre-tag-script": getInput2[options?.["pre-tag-script"]?.type ?? "string"]("pre-tag-script", { trimWhitespace: options?.cwd?.trimWhitespace })
  };
};
var dumpOutputs = (outputs) => {
  for (const [name, value] of Object.entries(outputs)) {
    core.setOutput(name, value);
  }
};

// src/run.ts
import * as core4 from "@actions/core";
import getChangesets from "@changesets/read";

// src/publish.ts
import { exec as exec2 } from "node:child_process";
import { readFile as readFile2 } from "node:fs/promises";
import { join as join2 } from "node:path";
import { promisify } from "node:util";
import * as core2 from "@actions/core";
import { getPackages as getPackages2 } from "@manypkg/get-packages";

// src/utils.ts
import { existsSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getPackages } from "@manypkg/get-packages";
import * as mdast from "mdast-util-to-string";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import resolveFrom from "resolve-from";
import { unified } from "unified";
var MAX_CHARACTERS_PER_MESSAGE = 6e4;
var BumpLevels = {
  dep: 0,
  patch: 1,
  minor: 2,
  major: 3
};
var getChangelogEntry = (changelog, version) => {
  const ast = unified().use(remarkParse).parse(changelog);
  let highestLevel = BumpLevels.dep;
  const nodes = ast.children;
  let headingStartInfo;
  let endIndex;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === "heading") {
      const stringified = mdast.toString(node);
      const match = stringified.toLowerCase().match(/(major|minor|patch)/);
      if (match !== null) {
        const level = BumpLevels[match[0]];
        highestLevel = Math.max(level, highestLevel);
      }
      if (headingStartInfo === void 0 && stringified === version) {
        headingStartInfo = {
          index: i,
          depth: node.depth
        };
        continue;
      }
      if (endIndex === void 0 && headingStartInfo !== void 0 && headingStartInfo.depth === node.depth) {
        endIndex = i;
        break;
      }
    }
  }
  if (headingStartInfo) {
    ast.children = ast.children.slice(headingStartInfo.index + 1, endIndex);
  }
  return {
    content: unified().use(remarkStringify).stringify(ast),
    highestLevel
  };
};
var getVersionPrBody = async ({
  branch,
  cwd,
  versionsByDirectory
}) => {
  const { packages } = await getPackages(cwd);
  const changedPackagesSet = /* @__PURE__ */ new Set();
  for (const pkg of packages) {
    const previousVersion = versionsByDirectory.get(pkg.dir);
    if (previousVersion !== pkg.packageJson.version) {
      changedPackagesSet.add(pkg);
    }
  }
  const changedPackages = Array.from(changedPackagesSet);
  const changedPackagesInfo = await Promise.all(
    changedPackages.map(async (pkg) => {
      const changelogContents = await readFile(
        join(pkg.dir, "CHANGELOG.md"),
        "utf8"
      );
      const entry = getChangelogEntry(
        changelogContents,
        pkg.packageJson.version
      );
      return {
        highestLevel: entry.highestLevel,
        content: entry.content,
        header: `## ${pkg.packageJson.name}@${pkg.packageJson.version}`
      };
    })
  );
  const messageHeader = `This PR was opened by the [Changesets release](https://github.com/YutaUra/actions) GitHub action. When you're ready to do a release, you can merge this and the action will be released automatically. If you're not ready to do a release yet, that's fine, whenever you add more changesets to ${branch}, this PR will be updated.
`;
  const messageReleasesHeading = "# Releases";
  let fullMessage = [
    messageHeader,
    messageReleasesHeading,
    ...changedPackagesInfo.map((info4) => `${info4.header}

${info4.content}`)
  ].join("\n");
  if (fullMessage.length > MAX_CHARACTERS_PER_MESSAGE) {
    fullMessage = [
      messageHeader,
      messageReleasesHeading,
      "\n> The changelog information of each package has been omitted from this message, as the content exceeds the size limit.\n",
      ...changedPackagesInfo.map((info4) => `${info4.header}

`)
    ].join("\n");
  }
  if (fullMessage.length > MAX_CHARACTERS_PER_MESSAGE) {
    fullMessage = [
      messageHeader,
      messageReleasesHeading,
      "\n> All release information have been omitted from this message, as the content exceeds the size limit."
    ].join("\n");
  }
  return fullMessage;
};
var requireChangesetsCliPkgJson = (cwd) => {
  try {
    return JSON.parse(
      readFileSync(resolveFrom(cwd, "@changesets/cli/package.json"), "utf-8")
    );
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "MODULE_NOT_FOUND") {
      throw new Error(
        `Have you forgotten to install \`@changesets/cli\` in "${cwd}"?`
      );
    }
    throw err;
  }
};
var escapeMarkdownString = (content) => content.replaceAll("__", "\\_\\_");

// src/utils/git.ts
import { setSecret } from "@actions/core";
import { exec, getExecOutput } from "@actions/exec";
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
var fetchIsTagExistsOnRemote = async (cwd, tag2) => {
  const result = await getExecOutput(
    "git",
    ["ls-remote", "--tags", "origin", tag2],
    { cwd }
  );
  if (result.exitCode !== 0) {
    throw new Error(`Failed to check if tag ${tag2} exists: ${result.stderr}`);
  }
  return result.stdout.includes(tag2);
};
var tag = async (cwd, tag2) => {
  await exec("git", ["tag", tag2], { cwd });
};
var pushTag = async (cwd) => {
  await getExecOutput("git", ["push", "--tags"], { cwd });
};
var commit = async (cwd, message, files = ".") => {
  await exec("git", ["add", ...Array.isArray(files) ? files : [files]], {
    cwd
  });
  await exec("git", ["commit", "-m", message], {
    cwd
  });
};
var push = async (cwd, remoteBranch, token) => {
  if (!token) {
    await exec("git", ["push", "origin", `HEAD:${remoteBranch}`, "--force"], {
      cwd
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
      "--force"
    ],
    { cwd }
  );
};
var switchBranch = async (cwd, branch) => {
  const { stderr } = await getExecOutput("git", ["switch", "-c", branch], {
    cwd,
    ignoreReturnCode: true
  });
  const isCreatingBranch = !stderr.toString().includes(`Switched to a new branch '${branch}'`);
  if (!isCreatingBranch) {
    await exec("git", ["switch", branch], { cwd });
  }
};
var resetHard = async (cwd, target) => {
  await exec("git", ["reset", "--hard", target], { cwd });
};
var autoMerge = async (prNumber, context2, octokit) => {
  const {
    repository: { pullRequest }
  } = await octokit.graphql(
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
      owner: context2.repo.owner,
      name: context2.repo.repo,
      prNumber
    }
  );
  await octokit.graphql(
    `
    mutation EnableAutoMerge($pullRequestId: ID!) {
      enablePullRequestAutoMerge(input: {pullRequestId: $pullRequestId, mergeMethod: MERGE}) {
        clientMutationId
      }
    }
`,
    { pullRequestId: pullRequest.id }
  );
};
var isDirty = async (cwd) => {
  const { stdout } = await getExecOutput("git", ["status", "--porcelain"], {
    cwd
  });
  return stdout.trim().length > 0;
};

// src/publish.ts
var execAsync = promisify(exec2);
var runPublish = async (inputs2) => {
  const { rootPackage } = await getPackages2(inputs2.cwd);
  const version = rootPackage?.packageJson.version;
  if (!version) {
    throw new Error("No version found in root package.json");
  }
  const isTagExists = await fetchIsTagExistsOnRemote(
    inputs2.cwd,
    `v${version}`
  );
  if (isTagExists) {
    core2.info(`v${version} tag already exists`);
    core2.info("Skipping release");
    return { published: false };
  }
  if (inputs2["setup-git-user"]) {
    await configure(inputs2.cwd);
  }
  if (inputs2["pre-tag-script"] && inputs2["pre-tag-script"].trim().length > 0) {
    await execAsync(inputs2["pre-tag-script"].trim(), { cwd: inputs2.cwd });
    if (await isDirty(inputs2.cwd)) {
      await commit(inputs2.cwd, "pre tag script result", ".");
    }
  }
  await tag(inputs2.cwd, `v${version}`);
  await pushTag(inputs2.cwd);
  const { packages, rootDir } = await getPackages2(inputs2.cwd);
  const entries = await Promise.all(
    packages.map(async ({ dir, packageJson }) => {
      const changelogFileName = join2(dir, "CHANGELOG.md");
      const changelog = await readFile2(changelogFileName, "utf8");
      const content = getChangelogEntry(changelog, version).content.trim();
      const headerLevel = rootDir === dir ? "#" : "#";
      if (!content)
        return `${headerLevel} ${escapeMarkdownString(packageJson.name)} v${version}`;
      return `${headerLevel} ${escapeMarkdownString(packageJson.name)} v${version}

${content}
`;
    })
  );
  await inputs2.octokit.rest.repos.createRelease({
    ...inputs2.context.repo,
    name: `v${version}`,
    tag_name: `v${version}`,
    body: entries.join("\n\n")
  });
  return { published: true };
};

// src/version.ts
import { join as join3 } from "node:path";
import * as core3 from "@actions/core";
import { exec as exec3 } from "@actions/exec";
import { getPackages as getPackages3 } from "@manypkg/get-packages";
import resolveFrom2 from "resolve-from";
import { lt } from "semver";
var runVersion = async (inputs2) => {
  const branch = inputs2.branch ?? inputs2.context.ref.replace("refs/heads/", "");
  const versionBranch = `action-release-changeset/${branch}`;
  await switchBranch(inputs2.cwd, versionBranch);
  await resetHard(inputs2.cwd, inputs2.context.sha);
  const versionsByDirectory = new Map(
    (await getPackages3(inputs2.cwd)).packages.map((x) => [
      x.dir,
      x.packageJson.version
    ])
  );
  const changesetsCliPkgJson = requireChangesetsCliPkgJson(
    inputs2.changesetCliInstallDir
  );
  const cmd = lt(changesetsCliPkgJson.version, "2.0.0") ? "bump" : "version";
  await exec3(
    "node",
    [resolveFrom2(inputs2.changesetCliInstallDir, "@changesets/cli/bin.js"), cmd],
    {
      cwd: inputs2.cwd,
      env: { NODE_PATH: join3(inputs2.changesetCliInstallDir, "node_modules") }
    }
  );
  if (inputs2["setup-git-user"]) {
    await configure(inputs2.cwd);
  }
  await commit(
    inputs2.cwd,
    inputs2["commit-message"] || "Version Action",
    "."
  );
  await push(inputs2.cwd, versionBranch, inputs2.token);
  const pulls = await inputs2.octokit.rest.pulls.list({
    ...inputs2.context.repo,
    state: "open",
    head: `${inputs2.context.repo.owner}:${versionBranch}`,
    base: branch
  });
  const prBody = await getVersionPrBody({
    branch,
    cwd: inputs2.cwd,
    versionsByDirectory
  });
  if (pulls.data.length === 0) {
    core3.info("creating pull request");
    const { data } = await inputs2.octokit.rest.pulls.create({
      ...inputs2.context.repo,
      base: branch,
      head: versionBranch,
      title: inputs2["pr-title"] || "Release Action",
      body: prBody
    });
    if (inputs2["auto-merge"]) {
      await autoMerge(data.number, inputs2.context, inputs2.octokit);
    }
    return {
      pullRequestNumber: data.number
    };
  }
  const pullRequest = pulls.data[0];
  core3.info(`updating found pull request #${pullRequest.number}`);
  await inputs2.octokit.rest.pulls.update({
    ...inputs2.context.repo,
    pull_number: pullRequest.number,
    title: inputs2["pr-title"] || "Release Action",
    body: prBody,
    state: "open"
  });
  if (inputs2["auto-merge"]) {
    await autoMerge(pullRequest.number, inputs2.context, inputs2.octokit);
  }
  return {
    pullRequestNumber: pullRequest.number
  };
};

// src/run.ts
var VersionIndex = {
  none: 0,
  patch: 1,
  minor: 2,
  major: 3
};
var run = async (inputs2) => {
  const changesets = await getChangesets(inputs2.cwd);
  const versionType = changesets.flatMap((v) => v.releases.map((v2) => v2.type)).reduce((acc, cur) => {
    return VersionIndex[cur] > VersionIndex[acc] ? cur : acc;
  }, "none");
  dumpOutputs({
    "pr-number": "",
    published: "false"
  });
  if (versionType === "none" && changesets.length !== 0 && changesets.every((changeset) => changeset.releases.length === 0)) {
    core4.info("All changesets are empty; not creating PR");
    return;
  }
  if (changesets.length !== 0) {
    const { pullRequestNumber } = await runVersion(inputs2);
    dumpOutputs({
      "pr-number": pullRequestNumber.toString()
    });
    return;
  }
  core4.info("No changesets found, attempting to release");
  const { published } = await runPublish(inputs2);
  dumpOutputs({
    published: published.toString()
  });
};

// src/main.ts
var inputs = parseInputs({
  "setup-git-user": { type: "boolean" },
  "auto-merge": { type: "boolean" }
});
var main = async () => {
  await run({
    ...inputs,
    cwd: resolve(inputs.cwd),
    context,
    octokit: getOctokit(inputs.token),
    changesetCliInstallDir: resolve(inputs.cwd)
  });
};
main().catch((e) => {
  console.error(e);
  setFailed(e);
});
