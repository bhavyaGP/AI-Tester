const { execSync } = require("child_process");

function getChangedFiles() {
  const changedFiles = execSync("git diff --name-only HEAD~1 HEAD")
    .toString()
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f.endsWith(".js") && f);

  return changedFiles;
}

module.exports = { getChangedFiles };
