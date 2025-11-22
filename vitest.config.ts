import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "action-release-changeset",
      "renovate-changeset",
      "update-action-readme",
    ],
  },
});
