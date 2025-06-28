import { exec } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { promisify } from "node:util";
import { glob } from "glob";

const execAsync = promisify(exec);

export type UseDirectoryItOptions = {
  readonly templateDir?: string;
};

export const useDirectory = async () => {
  const TEMP_DIR = await mkdtemp(
    join(tmpdir(), "action-release-changeset-test-"),
  );

  let testCase = 0;

  afterAll(async () => {
    await rm(TEMP_DIR, { recursive: true, force: true });
  });

  const setupDirectory = async (
    { templateDir }: UseDirectoryItOptions = {
      templateDir: undefined,
    },
  ) => {
    const localPath = join(TEMP_DIR, `dir-${testCase++}`);
    const remotePath = join(TEMP_DIR, `dir-${testCase++}`);

    await mkdir(localPath, { recursive: true });
    await mkdir(remotePath, { recursive: true });

    // git init

    await execAsync("git init", { cwd: localPath });
    await execAsync("git checkout -b main", { cwd: localPath });
    await execAsync("git commit --allow-empty -m 'initial commit'", {
      cwd: localPath,
    });

    // init template
    if (templateDir) {
      const templateFilePaths = await glob(join(templateDir, "**/*"), {
        ignore: ["**/node_modules/**"],
        dot: true,
        withFileTypes: true,
      });
      for (const templateFilePath of templateFilePaths) {
        if (!templateFilePath.isFile()) continue;
        const filename = join(
          localPath,
          relative(templateDir, templateFilePath.fullpath()),
        );
        await mkdir(dirname(filename), { recursive: true });
        await copyFile(templateFilePath.fullpath(), filename);
      }
      // git commit
      await execAsync("git add .", { cwd: localPath });
      await execAsync("git commit -m 'init template'", { cwd: localPath });
    }

    // setup remote repository
    await execAsync("git init --bare", { cwd: remotePath });
    await execAsync(`git remote add origin ${remotePath}`, {
      cwd: localPath,
    });
    await execAsync("git push -u --tags origin HEAD", {
      cwd: localPath,
    });

    return {
      /**
       * @deprecated use `local.path` instead
       */
      path: localPath,
      local: { path: localPath },
      remote: { path: remotePath },
    };
  };

  return { setupDirectory };
};
