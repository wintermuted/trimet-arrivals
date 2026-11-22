import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = process.cwd();

function run(command, args, cwd, output = "pipe") {
  const result = spawnSync(command, args, {
    cwd,
    stdio: ["ignore", output, "inherit"],
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} failed (${result.signal ?? result.status})`);
  }
  return result.stdout;
}

function checkStagedFiles() {
  const files = run("git", [
    "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"
  ], root).toString("utf8").split("\0").filter(file => /\.tsx?$/i.test(file));
  if (files.length === 0) return;

  const snapshot = mkdtempSync(path.join(tmpdir(), "overworld-staged-"));
  try {
    for (const config of [".oxfmtrc.json", ".oxlintrc.json", ".gitignore"]) {
      copyFileSync(path.join(root, config), path.join(snapshot, config));
    }
    for (const file of files) {
      const target = path.join(snapshot, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, run("git", ["cat-file", "blob", `:${file}`], root));
    }
    for (const [tool, options] of [["oxfmt", ["--check"]], ["oxlint", []]]) {
      const directory = path.join(root, "node_modules", tool);
      const pkg = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
      const executable = path.join(directory, pkg.bin[tool]);
      // Keep command lines below Windows' argument-length limit.
      for (let offset = 0; offset < files.length; offset += 100) {
        run(process.execPath, [
          executable, ...options, "--", ...files.slice(offset, offset + 100)
        ], snapshot, "inherit");
      }
    }
  } finally {
    rmSync(snapshot, { recursive: true, force: true });
  }
}

try {
  checkStagedFiles();
} catch (error) {
  console.error("Staged-file checks failed:", error.message);
  process.exitCode = 1;
}
