const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.resolve(__dirname, "..");
const forbiddenLockfiles = ["package-lock.json", "yarn.lock"];

for (const filename of forbiddenLockfiles) {
  const filePath = path.join(workspaceRoot, filename);

  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead of npm or yarn in this workspace.");
  process.exit(1);
}
