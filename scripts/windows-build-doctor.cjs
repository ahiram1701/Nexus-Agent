const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

if (process.platform !== "win32") {
  process.exit(0);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-agent-symlink-"));
const targetFile = path.join(tempDir, "target.txt");
const linkFile = path.join(tempDir, "target-link.txt");

try {
  fs.writeFileSync(targetFile, "nexus-agent");
  fs.symlinkSync(targetFile, linkFile);
  fs.rmSync(linkFile, { force: true });
  fs.rmSync(targetFile, { force: true });
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log("Windows build preflight passed: symlink creation is available.");
} catch (error) {
  fs.rmSync(tempDir, { recursive: true, force: true });

  const details = error instanceof Error ? error.message : String(error);

  console.error("");
  console.error("Windows build preflight failed.");
  console.error("electron-builder will fail while extracting winCodeSign because this shell cannot create symlinks.");
  console.error("");
  console.error("Fix one of these before running the desktop package build again:");
  console.error("  1. Enable Developer Mode in Windows Settings > System > For developers.");
  console.error("  2. Run the build from an elevated PowerShell session.");
  console.error("  3. Use `pnpm --filter @workspace/agent-dashboard run build` if you only need the web bundle.");
  console.error("");
  console.error(`Original error: ${details}`);
  process.exit(1);
}
