import { ok } from "node:assert";
import { parseDocument, Scalar, YAMLMap, YAMLSeq } from "yaml";

export type ReplaceActionVersion = {
  readonly name: string;
  readonly version: string;
  readonly hash?: string;
};

export type UpdateYamlOptions = {
  readonly workflow: string;
  readonly replaceActionVersions: readonly ReplaceActionVersion[];
};

export const updateYaml = ({
  workflow,
  replaceActionVersions,
}: UpdateYamlOptions) => {
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
      // without uses, do nothing
      if (!uses) continue;
      ok(uses instanceof Scalar);
      ok(typeof uses.value === "string");
      const [actionName] = uses.value.split("@");
      ok(actionName);
      const newActionVersion = replaceActionVersions.find(
        (v) => v.name === actionName,
      );
      // if action not found, do nothing
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
