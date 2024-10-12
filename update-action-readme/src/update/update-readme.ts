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
};

export const updateReadme = ({
  readme,
  replaceActionVersions,
}: UpdateReadmeOptions) => {
  const tree = processor.parse(readme);

  visit(tree, "code", (code) => {
    if (code.lang !== "yaml") return;

    if (!isGitHubWorkflow(parse(code.value))) return;
    code.value = updateYaml({ workflow: code.value, replaceActionVersions });
  });

  return processor.stringify(tree);
};
