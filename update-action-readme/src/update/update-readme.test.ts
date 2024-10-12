import { parse } from "yaml";
import { updateReadme } from "./update-readme";

describe("update-readme", () => {
  it("if readme has no yaml, do nothing", async () => {
    // given
    const readme = `\
# Hello, World!

This is a test.
`;
    const actionYaml = `\
name: update-action-readme
`;

    // when
    const updatedReadme = updateReadme({
      readme,
      replaceActionVersions: [],
      actionYaml: parse(actionYaml),
    });

    // then
    expect(updatedReadme).toBe(readme);
  });

  it("if readme has yaml which is not related, do nothing", async () => {
    // given
    const readme = `\
# Hello, World!

This is a test.

\`\`\`yaml
this: is yaml
\`\`\`
`;
    const actionYaml = `\
name: update-action-readme
`;

    // when
    const updatedReadme = updateReadme({
      readme,
      replaceActionVersions: [],
      actionYaml: parse(actionYaml),
    });

    // then
    expect(updatedReadme).toBe(readme);
  });

  it("if readme has yaml which related action, update version", async () => {
    // given
    const readme = `\
# Hello, World!

This is a test.

\`\`\`yaml
name: update-action-readme

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: test-action@v100
\`\`\`
`;
    const actionYaml = `\
name: update-action-readme
`;

    // when
    const updatedReadme = updateReadme({
      readme,
      replaceActionVersions: [{ name: "test-action", version: "v101" }],
      actionYaml: parse(actionYaml),
    });

    // then
    expect(updatedReadme).toBe(`\
# Hello, World!

This is a test.

\`\`\`yaml
name: update-action-readme

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: test-action@v101

\`\`\`
`);
  });

  it("create inputs", async () => {
    // given
    const readme = `\
# Hello, World!

## Inputs

<!-- update-action-readme:inputs:start -->
<!-- update-action-readme:inputs:end -->
`;
    const actionYaml = `\
name: update-action-readme
inputs:
  test-1:
    description: test
    default: test
  test-2:
    description: test
    default: abcd
  deprecated:
    description: test
    deprecationMessage: test
`;

    // when
    const updatedReadme = updateReadme({
      readme,
      replaceActionVersions: [{ name: "test-action", version: "v101" }],
      actionYaml: parse(actionYaml),
    });

    // then
    expect(updatedReadme).toBe(`\
# Hello, World!

## Inputs

<!-- update-action-readme:inputs:start -->
| Name   | Default | Description |
| ------ | ------- | ----------- |
| test-1 | test    | test        |
| test-2 | abcd    | test        |
<!-- update-action-readme:inputs:end -->
`);
  });

  it("update inputs", async () => {
    // given
    const readme = `\
# Hello, World!

## Inputs

<!-- update-action-readme:inputs:start -->
<!-- update-action-readme:inputs:end -->
`;
    const actionYaml = `\
name: update-action-readme
inputs:
  test-1:
    description: test
    default: test
  test-2:
    description: test
    default: abcd
  deprecated:
    description: test
`;

    // when
    const updatedReadme = updateReadme({
      readme,
      replaceActionVersions: [{ name: "test-action", version: "v101" }],
      actionYaml: parse(actionYaml),
    });

    // then
    expect(updatedReadme).toBe(`\
# Hello, World!

## Inputs

<!-- update-action-readme:inputs:start -->
| Name       | Default | Description |
| ---------- | ------- | ----------- |
| test-1     | test    | test        |
| test-2     | abcd    | test        |
| deprecated |         | test        |
<!-- update-action-readme:inputs:end -->
`);
  });
});
