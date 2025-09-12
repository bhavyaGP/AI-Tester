import { execSync } from "child_process";

export function getChangedFiles() {
  const changedFiles = execSync("git diff --name-only HEAD~1 HEAD")
    .toString()
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f && f.endsWith(".js") && (/^server\/|\/server\//).test(f))

  return changedFiles;
}
