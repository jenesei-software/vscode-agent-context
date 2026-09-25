import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out/test/integration/**/*.test.js",
  version: "stable",
  workspaceFolder: "src/test/fixtures/workspace",
  mocha: {
    ui: "tdd",
    timeout: 30000,
  },
});
