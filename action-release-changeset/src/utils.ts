import { existsSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type Package, getPackages } from "@manypkg/get-packages";
import * as mdast from "mdast-util-to-string";
import type prettier from "prettier";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import resolveFrom from "resolve-from";
import { unified } from "unified";

// To avoid that, we ensure to cap the message to 60k chars.
const MAX_CHARACTERS_PER_MESSAGE = 60000;

const BumpLevels = {
  dep: 0,
  patch: 1,
  minor: 2,
  major: 3,
} as const;

export const getChangelogEntry = (changelog: string, version: string) => {
  const ast = unified().use(remarkParse).parse(changelog);

  let highestLevel: number = BumpLevels.dep;

  const nodes = ast.children;
  let headingStartInfo:
    | {
        index: number;
        depth: number;
      }
    | undefined;
  let endIndex: number | undefined;

  for (let i = 0; i < nodes.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const node = nodes[i]!;
    if (node.type === "heading") {
      const stringified: string = mdast.toString(node);
      const match = stringified.toLowerCase().match(/(major|minor|patch)/);
      if (match !== null) {
        const level = BumpLevels[match[0] as "major" | "minor" | "patch"];
        highestLevel = Math.max(level, highestLevel);
      }
      if (headingStartInfo === undefined && stringified === version) {
        headingStartInfo = {
          index: i,
          depth: node.depth,
        };
        continue;
      }
      if (
        endIndex === undefined &&
        headingStartInfo !== undefined &&
        headingStartInfo.depth === node.depth
      ) {
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
    highestLevel: highestLevel,
  };
};

export type GetVersionPRBodyOptions = {
  branch: string;
  cwd: string;
  versionsByDirectory: Map<string, string>;
};

export const getVersionPrBody = async ({
  branch,
  cwd,
  versionsByDirectory,
}: GetVersionPRBodyOptions): Promise<string> => {
  const { packages } = await getPackages(cwd);
  const changedPackagesSet = new Set<Package>();
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
        "utf8",
      );

      const entry = getChangelogEntry(
        changelogContents,
        pkg.packageJson.version,
      );
      return {
        highestLevel: entry.highestLevel,
        content: entry.content,
        header: `## ${pkg.packageJson.name}@${pkg.packageJson.version}`,
      };
    }),
  );

  const messageHeader = `\
This PR was opened by the [Changesets release](https://github.com/YutaUra/actions) GitHub action. \
When you're ready to do a release, you can merge this and the action will be released automatically. \
If you're not ready to do a release yet, that's fine, whenever you add more changesets to ${branch}, this PR will be updated.
`;

  const messageReleasesHeading = "# Releases";

  let fullMessage = [
    messageHeader,
    messageReleasesHeading,
    ...changedPackagesInfo.map((info) => `${info.header}\n\n${info.content}`),
  ].join("\n");

  // Check that the message does not exceed the size limit.
  // If not, omit the changelog entries of each package.
  if (fullMessage.length > MAX_CHARACTERS_PER_MESSAGE) {
    fullMessage = [
      messageHeader,
      messageReleasesHeading,
      "\n> The changelog information of each package has been omitted from this message, as the content exceeds the size limit.\n",
      ...changedPackagesInfo.map((info) => `${info.header}\n\n`),
    ].join("\n");
  }

  // Check (again) that the message is within the size limit.
  // If not, omit all release content this time.
  if (fullMessage.length > MAX_CHARACTERS_PER_MESSAGE) {
    fullMessage = [
      messageHeader,
      messageReleasesHeading,
      "\n> All release information have been omitted from this message, as the content exceeds the size limit.",
    ].join("\n");
  }

  return fullMessage;
};

const writeFormattedMarkdownFile = async (
  filePath: string,
  content: string,
  prettierInstance: typeof prettier,
) => {
  await writeFile(
    filePath,
    // Prettier v3 returns a promise
    await prettierInstance.format(content, {
      ...(await prettierInstance.resolveConfig(filePath)),
      filepath: filePath,
      parser: "markdown",
    }),
  );
};

const prependFile = async (
  filePath: string,
  data: string,
  name: string,
  prettierInstance: typeof prettier,
) => {
  const fileData = await readFile(filePath, "utf-8");
  // if the file exists but doesn't have the header, we'll add it in
  if (!fileData) {
    const completelyNewChangelog = `# ${name}${data}`;
    await writeFormattedMarkdownFile(
      filePath,
      completelyNewChangelog,
      prettierInstance,
    );
    return;
  }
  const newChangelog = fileData.replace("\n", data);

  await writeFormattedMarkdownFile(filePath, newChangelog, prettierInstance);
};

export const updateChangelog = async (
  changelogPath: string,
  changelog: string,
  name: string,
  prettierInstance: typeof prettier,
) => {
  const templateString = `\n\n${changelog.trim()}\n`;

  try {
    if (existsSync(changelogPath)) {
      await prependFile(changelogPath, templateString, name, prettierInstance);
    } else {
      await writeFormattedMarkdownFile(
        changelogPath,
        `# ${name}${templateString}`,
        prettierInstance,
      );
    }
  } catch (e) {
    console.warn(e);
  }
};

export const requireChangesetsCliPkgJson = (cwd: string) => {
  try {
    return JSON.parse(
      readFileSync(resolveFrom(cwd, "@changesets/cli/package.json"), "utf-8"),
    );
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "MODULE_NOT_FOUND"
    ) {
      throw new Error(
        `Have you forgotten to install \`@changesets/cli\` in "${cwd}"?`,
      );
    }
    throw err;
  }
};

export const escapeMarkdownString = (content: string) =>
  content.replaceAll("__", "\\_\\_");
