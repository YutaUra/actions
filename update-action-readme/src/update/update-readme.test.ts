import { updateReadme } from "./update-readme";

describe("update-readme", () => {
  it("if readme has no yaml, do nothing", async () => {
    // given
    const readme = `\
# Hello, World!

This is a test.
`;

    // when
    const updatedReadme = updateReadme({ readme, replaceActionVersions: [] });

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

    // when
    const updatedReadme = updateReadme({
      readme,
      replaceActionVersions: [],
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

    // when
    const updatedReadme = updateReadme({
      readme,
      replaceActionVersions: [{ name: "test-action", version: "v101" }],
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
});
