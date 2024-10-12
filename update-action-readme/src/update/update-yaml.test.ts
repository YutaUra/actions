import { updateYaml } from "./update-yaml";

describe("update-yaml", () => {
  it("if action not found, do nothing", async () => {
    // given
    const workflow = `\
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
      - uses: some-action
        with:
          some: value
      - uses: other-action@1234567890 # v0.0.1
        with:
          some: value
      - run: echo "Hello, World!"
`;

    // when
    const updatedYaml = updateYaml({ workflow, replaceActionVersions: [] });

    // then
    expect(updatedYaml).toBe(workflow);
  });

  it("update version", async () => {
    // given
    const workflow = `\
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
`;

    // when
    const updatedYaml = updateYaml({
      workflow,
      replaceActionVersions: [{ name: "test-action", version: "v101" }],
    });

    // then
    expect(updatedYaml).toBe(`\
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
`);
  });

  it("update version with keep comment", async () => {
    // given
    const workflow = `\
name: update-action-readme
on:
  push:
    branches:
      - main
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: test-action@xyz1234 # v0.0.1
`;

    // when
    const updatedYaml = updateYaml({
      workflow,
      replaceActionVersions: [
        { name: "test-action", version: "v101", hash: "abc678" },
      ],
    });

    // then
    expect(updatedYaml).toBe(`\
name: update-action-readme
on:
  push:
    branches:
      - main
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: test-action@abc678 # v101
`);
  });
});
