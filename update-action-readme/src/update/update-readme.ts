import type { GithubAction } from "github-action-yaml";
import { markdownTable } from "markdown-table";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { parse } from "yaml";
import { isGitHubWorkflow } from "../utils/isGitHubWorkflow";
import { type ReplaceActionVersion, updateYaml } from "./update-yaml";

const processor = unified().use(remarkParse).use(remarkStringify);

export type UpdateReadmeOptions = {
  readonly readme: string;
  readonly replaceActionVersions: readonly ReplaceActionVersion[];
  readonly actionYaml: GithubAction;
};

export const updateReadme = ({
  readme,
  replaceActionVersions,
  actionYaml,
}: UpdateReadmeOptions) => {
  const tree = processor.parse(readme);

  visit(tree, "code", (code) => {
    if (code.lang !== "yaml") return;

    if (!isGitHubWorkflow(parse(code.value))) return;
    code.value = updateYaml({ workflow: code.value, replaceActionVersions });
  });

  const versionReadme = processor.stringify(tree);

  return versionReadme
    .replace(
      /(?<=<!-- update-action-readme:inputs:start -->\n).*(?=\n<!-- update-action-readme:inputs:end -->)/s,
      markdownTable([
        ["Name", "Default", "Description"],
        ...Object.entries(actionYaml.inputs ?? {})
          .filter(
            ([, value]) => typeof value.deprecationMessage === "undefined",
          )
          .map(([name, value]) => [
            name,
            value.default ?? "",
            value.description ?? "",
          ]),
      ]),
    )
    .replace(
      /(?<=<!-- update-action-readme:outputs:start -->\n).*(?=\n<!-- update-action-readme:outputs:end -->)/s,
      markdownTable([
        ["Name", "Description"],
        ...Object.entries(
          (actionYaml.outputs ?? {}) as Record<string, { description: string }>,
        ).map(([name, value]) => [name, value.description ?? ""]),
      ]),
    );
};
