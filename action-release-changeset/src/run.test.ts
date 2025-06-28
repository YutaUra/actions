import childProcess from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import * as core from "@actions/core";
import type { Context } from "@actions/github/lib/context";
import type { WebhookPayload } from "@actions/github/lib/interfaces";
import type { GitHub } from "@actions/github/lib/utils.js";
import { getPackages } from "@manypkg/get-packages";
import { type Inputs, run } from "./run";
import { useDirectory } from "./tests/utils/useDirectory";

const execAsync = promisify(childProcess.exec);
const { setupDirectory } = await useDirectory();

const mockPullsList =
  vi.fn<InstanceType<typeof GitHub>["rest"]["pulls"]["list"]>();
const mockPullsCreate =
  vi.fn<InstanceType<typeof GitHub>["rest"]["pulls"]["create"]>();
const mockPullsUpdate =
  vi.fn<InstanceType<typeof GitHub>["rest"]["pulls"]["update"]>();
const mockCreateRelease =
  vi.fn<InstanceType<typeof GitHub>["rest"]["repos"]["createRelease"]>();

beforeEach(() => {
  vi.resetAllMocks();

  mockPullsList.mockResolvedValue({
    data: [],
    url: "",
    status: 200,
    headers: {},
  });
  mockPullsCreate.mockResolvedValue({
    // biome-ignore lint/suspicious/noExplicitAny: Because we are mocking
    data: { number: 0 } as any,
    status: 201,
    headers: {},
    url: "",
  });
});

class MockContext implements Context {
  readonly ref: string;
  readonly sha: string;
  readonly runAttempt: number;
  private constructor(
    base: Pick<Context, "ref" | "sha"> & { runAttempt?: number },
  ) {
    this.ref = base.ref;
    this.sha = base.sha;
    this.runAttempt = base.runAttempt ?? 1;
  }

  static async create(cwd: string) {
    const { stdout: sha } = await execAsync("git rev-parse HEAD", {
      cwd,
    });
    return new MockContext({ ref: "refs/heads/main", sha: sha.trim() });
  }

  get payload(): WebhookPayload {
    throw new Error("payload is not implemented");
  }
  get eventName(): string {
    throw new Error("eventName is not implemented");
  }
  get workflow(): string {
    throw new Error("workflow is not implemented");
  }
  get action(): string {
    throw new Error("action is not implemented");
  }
  get actor(): string {
    throw new Error("actor is not implemented");
  }
  get job(): string {
    throw new Error("job is not implemented");
  }
  get runNumber(): number {
    throw new Error("runNumber is not implemented");
  }
  get runId(): number {
    throw new Error("runId is not implemented");
  }
  get apiUrl(): string {
    throw new Error("apiUrl is not implemented");
  }
  get serverUrl(): string {
    throw new Error("serverUrl is not implemented");
  }
  get graphqlUrl(): string {
    throw new Error("graphqlUrl is not implemented");
  }
  get issue(): {
    owner: string;
    repo: string;
    number: number;
  } {
    throw new Error("issue is not implemented");
  }
  get repo(): {
    owner: string;
    repo: string;
  } {
    return {
      owner: "YutaUra",
      repo: "test-actions",
    };
  }
}

const TEMPLATES_DIR = join(__dirname, "tests/run.test.ts/templates");

describe("run", () => {
  const inputs = ({ cwd }: { cwd: string }) =>
    ({
      cwd,
      "commit-message": "Version Action",
      "pr-title": "Release Action",
      token: "test-token",
      "setup-git-user": true,
      octokit: {
        rest: {
          pulls: {
            list: mockPullsList,
            create: mockPullsCreate,
            update: mockPullsUpdate,
          },
          repos: {
            createRelease: mockCreateRelease,
          },
        },
      } as unknown as Inputs["octokit"],
      changesetCliInstallDir: join(__dirname, "../.."),
      "auto-merge": false,
      "pre-tag-script": "",
    }) satisfies Omit<Inputs, "context">;

  describe("multiple actions", () => {
    describe("has empty changeset(unusual case)", () => {
      const TEMPLATE_DIR = join(TEMPLATES_DIR, "monorepo-version-empty");

      it("nothing todo", async () => {
        // given
        const mockLog = vi.spyOn(core, "info");
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({ ...inputs({ cwd: local.path }), context });

        // then
        expect(mockLog).toHaveBeenCalledWith(
          "All changesets are empty; not creating PR",
        );
      });
    });

    describe("has changeset affected by single action", () => {
      const TEMPLATE_DIR = join(TEMPLATES_DIR, "monorepo-version");

      it("version root and all sub packages", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        const packages = await getPackages(local.path);
        expect(packages).toEqual(
          expect.objectContaining({
            rootPackage: expect.objectContaining({
              packageJson: expect.objectContaining({
                name: "action-release-changeset__tests__run.test.ts__monorepo-version",
                version: "0.0.1",
              }),
            }),
            packages: expect.arrayContaining([
              expect.objectContaining({
                packageJson: expect.objectContaining({
                  name: "action-1",
                  version: "0.0.1",
                }),
              }),
              expect.objectContaining({
                packageJson: expect.objectContaining({
                  name: "action-2",
                  version: "0.0.1",
                }),
              }),
            ]),
          }),
        );
      });

      it("when versionBranch exists, switch and reset", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        await execAsync("git switch -c action-release-changeset/main", {
          cwd: local.path,
        });
        await execAsync("git commit --allow-empty -m 'test-test'", {
          cwd: local.path,
        });
        const { stdout: before } = await execAsync("git rev-parse HEAD", {
          cwd: local.path,
        });
        await execAsync("git switch main", { cwd: local.path });

        // when
        await run({ ...inputs({ cwd: local.path }), context });

        // then
        // check before sha does not exist and context sha exists
        const commitHashes = await execAsync("git log --pretty=%H", {
          cwd: local.path,
        });
        expect(commitHashes.stdout).not.toContain(before.trim());
        expect(commitHashes.stdout).toContain(context.sha);
      });

      it("switch version branch", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", {
          cwd: local.path,
        });
        expect(stdout.trim()).toContain("action-release-changeset/main");
      });

      it("version commit is created", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        const { stdout } = await execAsync("git log --oneline", {
          cwd: local.path,
        });
        expect(stdout.trim()).toContain("Version Action");
      });

      it("create CHANGELOG.md", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        const CHANGELOG_MD = await readFile(
          join(local.path, "CHANGELOG.md"),
          "utf8",
        );
        expect(CHANGELOG_MD).toEqual(`\
# action-release-changeset**tests**run.test.ts\\_\\_monorepo-version

## 0.0.1
`);
      });

      it("push version branch", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        const localHead = await execAsync("git rev-parse HEAD", {
          cwd: local.path,
        });
        const remoteHead = await execAsync("git rev-parse --remote HEAD", {
          cwd: local.path,
        });
        expect(remoteHead.stdout.trim()).toEqual(
          expect.stringContaining(localHead.stdout.trim()),
        );
      });

      it("create PR, if not exists", async () => {
        // given
        mockPullsList.mockResolvedValue({
          status: 200,
          data: [],
          headers: {},
          url: "",
        });
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        expect(mockPullsCreate).toHaveBeenCalledWith({
          base: "main",
          head: "action-release-changeset/main",
          owner: "YutaUra",
          repo: "test-actions",
          title: "Release Action",
          body: expect.stringContaining(
            "## action-release-changeset__tests__run.test.ts__monorepo-version@0.0.1",
          ),
        });
      });

      it("update PR, if exists", async () => {
        // given
        mockPullsList.mockResolvedValue({
          status: 200,
          // biome-ignore lint/suspicious/noExplicitAny: Because we are mocking
          data: [{ number: 1 } as any],
          headers: {},
          url: "",
        });
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        expect(mockPullsUpdate).toHaveBeenCalledWith({
          owner: "YutaUra",
          repo: "test-actions",
          pull_number: 1,
          title: "Release Action",
          body: expect.stringContaining(
            "## action-release-changeset__tests__run.test.ts__monorepo-version@0.0.1",
          ),
          state: "open",
        });
      });
    });

    describe("has no changeset", () => {
      const TEMPLATE_DIR = join(TEMPLATES_DIR, "monorepo-publish");

      describe("git tag not exists on remote", () => {
        it("create tag and push", async () => {
          // given
          const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
          const context = await MockContext.create(local.path);

          // when
          await run({
            ...inputs({ cwd: local.path }),
            context,
          });

          // then
          const result = await execAsync(
            "git ls-remote --tags origin refs/tags/v0.0.1",
            {
              cwd: local.path,
            },
          );
          expect(result.stdout).toContain("refs/tags/v0.0.1");
        });

        it("create github release", async () => {
          // given
          const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
          const context = await MockContext.create(local.path);

          // when
          await run({
            ...inputs({ cwd: local.path }),
            context,
          });

          // then
          expect(mockCreateRelease).toHaveBeenCalledWith({
            owner: "YutaUra",
            repo: "test-actions",
            tag_name: "v0.0.1",
            name: "v0.0.1",
            body: `\
# action-release-changeset\\_\\_tests\\_\\_run.test.ts\\_\\_monorepo-publish v0.0.1

# action-1 v0.0.1

### Patch Changes

* cac5e86: patch action-1


# action-2 v0.0.1`,
          });
        });
      });
    });
  });

  describe("single actions", () => {
    describe("has empty changeset(unusual case)", () => {
      const TEMPLATE_DIR = join(TEMPLATES_DIR, "version-empty");

      it("nothing todo", async () => {
        // given
        const mockLog = vi.spyOn(core, "info");
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({ ...inputs({ cwd: local.path }), context });

        // then
        expect(mockLog).toHaveBeenCalledWith(
          "All changesets are empty; not creating PR",
        );
      });
    });

    describe("has changeset affected by single action", () => {
      const TEMPLATE_DIR = join(TEMPLATES_DIR, "version");

      it("version root and all sub packages", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        const packages = await getPackages(local.path);
        expect(packages).toEqual(
          expect.objectContaining({
            rootPackage: expect.objectContaining({
              packageJson: expect.objectContaining({
                name: "action-release-changeset__tests__run.test.ts__version",
                version: "0.0.1",
              }),
            }),
            packages: expect.arrayContaining([
              expect.objectContaining({
                packageJson: expect.objectContaining({
                  name: "action-release-changeset__tests__run.test.ts__version",
                  version: "0.0.1",
                }),
              }),
            ]),
          }),
        );
      });

      it("when versionBranch exists, switch and reset", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        await execAsync("git switch -c action-release-changeset/main", {
          cwd: local.path,
        });
        await execAsync("git commit --allow-empty -m 'test-test'", {
          cwd: local.path,
        });
        const { stdout: before } = await execAsync("git rev-parse HEAD", {
          cwd: local.path,
        });
        await execAsync("git switch main", { cwd: local.path });

        // when
        await run({ ...inputs({ cwd: local.path }), context });

        // then
        // check before sha does not exist and context sha exists
        const commitHashes = await execAsync("git log --pretty=%H", {
          cwd: local.path,
        });
        expect(commitHashes.stdout).not.toContain(before.trim());
        expect(commitHashes.stdout).toContain(context.sha);
      });

      it("switch version branch", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", {
          cwd: local.path,
        });
        expect(stdout.trim()).toContain("action-release-changeset/main");
      });

      it("version commit is created", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        const { stdout } = await execAsync("git log --oneline", {
          cwd: local.path,
        });
        expect(stdout.trim()).toContain("Version Action");
      });

      it("create CHANGELOG.md", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        const CHANGELOG_MD = await readFile(
          join(local.path, "CHANGELOG.md"),
          "utf8",
        );
        expect(CHANGELOG_MD).toEqual(
          expect.stringContaining(`\
# action-release-changeset**tests**run.test.ts\\_\\_version

## 0.0.1

### Patch Changes
`),
        );
      });

      it("push version branch", async () => {
        // given
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        const localHead = await execAsync("git rev-parse HEAD", {
          cwd: local.path,
        });
        const remoteHead = await execAsync("git rev-parse --remote HEAD", {
          cwd: local.path,
        });
        expect(remoteHead.stdout.trim()).toEqual(
          expect.stringContaining(localHead.stdout.trim()),
        );
      });

      it("create PR, if not exists", async () => {
        // given
        mockPullsList.mockResolvedValue({
          status: 200,
          data: [],
          headers: {},
          url: "",
        });
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        expect(mockPullsCreate).toHaveBeenCalledWith({
          base: "main",
          head: "action-release-changeset/main",
          owner: "YutaUra",
          repo: "test-actions",
          title: "Release Action",
          body: expect.stringContaining(
            "## action-release-changeset__tests__run.test.ts__version@0.0.1",
          ),
        });
      });

      it("update PR, if exists", async () => {
        // given
        mockPullsList.mockResolvedValue({
          status: 200,
          // biome-ignore lint/suspicious/noExplicitAny: Because we are mocking
          data: [{ number: 1 } as any],
          headers: {},
          url: "",
        });
        const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
        const context = await MockContext.create(local.path);

        // when
        await run({
          ...inputs({ cwd: local.path }),
          context,
        });

        // then
        expect(mockPullsUpdate).toHaveBeenCalledWith({
          owner: "YutaUra",
          repo: "test-actions",
          pull_number: 1,
          title: "Release Action",
          body: expect.stringContaining(
            "## action-release-changeset__tests__run.test.ts__version@0.0.1",
          ),
          state: "open",
        });
      });
    });

    describe("has no changeset", () => {
      const TEMPLATE_DIR = join(TEMPLATES_DIR, "publish");

      describe("git tag not exists on remote", () => {
        it("create tag and push", async () => {
          // given
          const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
          const context = await MockContext.create(local.path);

          // when
          await run({
            ...inputs({ cwd: local.path }),
            context,
          });

          // then
          const result = await execAsync(
            "git ls-remote --tags origin refs/tags/v0.0.1",
            {
              cwd: local.path,
            },
          );
          expect(result.stdout).toContain("refs/tags/v0.0.1");
        });

        it("create github release", async () => {
          // given
          const { local } = await setupDirectory({ templateDir: TEMPLATE_DIR });
          const context = await MockContext.create(local.path);

          // when
          await run({
            ...inputs({ cwd: local.path }),
            context,
          });

          // then
          expect(mockCreateRelease).toHaveBeenCalledWith({
            owner: "YutaUra",
            repo: "test-actions",
            tag_name: "v0.0.1",
            name: "v0.0.1",
            body: `\
# action-release-changeset\\_\\_tests\\_\\_run.test.ts\\_\\_publish v0.0.1

### Patch Changes

* xxxx: patch action-release-changeset\\_\\_tests\\_\\_run.test.ts\\_\\_publish
`,
          });
        });
      });
    });
  });
});
