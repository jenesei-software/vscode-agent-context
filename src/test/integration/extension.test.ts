import * as assert from "node:assert";
import * as vscode from "vscode";

const EXTENSION_ID = "jenesei-software.agent-context-manager";

suite("Agent Context Manager extension", () => {
  test("is present and activates", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `extension ${EXTENSION_ID} should be installed`);
    await extension.activate();
    assert.ok(extension.isActive, "extension should be active");
  });

  test("registers its commands", async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)?.activate();
    const commands = await vscode.commands.getCommands(true);
    for (const id of [
      "agentContext.refresh",
      "agentContext.showApplicability",
      "agentContext.openSettings",
    ]) {
      assert.ok(commands.includes(id), `${id} should be registered`);
    }
  });

  test("refresh resolves against an empty environment", async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)?.activate();
    await vscode.commands.executeCommand("agentContext.refresh");
  });
});
