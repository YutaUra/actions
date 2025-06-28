import { defineConfig } from "tsup";

export default defineConfig({
  format: "cjs",
  target: "node20",
  noExternal: [/(.*)/],
});
