import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

function readVersion(): string {
  try {
    // Resolves from both src/lib and dist/lib.
    const pkg = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    );
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function readBranch(): string | null {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function prettyPath(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? "~" + path.slice(home.length) : path;
}

export const terminalContext = {
  version: readVersion(),
  branch: readBranch(),
  cwd: prettyPath(process.cwd()),
};
