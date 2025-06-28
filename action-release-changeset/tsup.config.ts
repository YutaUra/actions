import { defineConfig } from "tsup";

export default defineConfig({
  format: "esm",
  target: "node20",
  noExternal: [/(.*)/],
});
