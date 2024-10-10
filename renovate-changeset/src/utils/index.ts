export const isPackageJson = (filename: string) => {
  return filename === "package.json";
};

export const isPackageLockFile = (filename: string) => {
  return (
    filename === "package-lock.json" ||
    filename === "yarn.lock" ||
    filename === "pnpm-lock.yaml" ||
    filename === "bun.lockb"
  );
};
