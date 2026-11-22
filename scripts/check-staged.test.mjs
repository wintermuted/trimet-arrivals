import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-staged.mjs", import.meta.url));

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "staged-hook-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  git("init", "--quiet");
  for (const config of [".oxfmtrc.json", ".oxlintrc.json"]) {
    writeFileSync(path.join(root, config), "{}");
  }
  writeFileSync(path.join(root, ".gitignore"), "node_modules/\n");
  const log = path.join(root, "checks.jsonl");
  for (const tool of ["oxfmt", "oxlint"]) {
    const directory = path.join(root, "node_modules", tool);
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, "package.json"), JSON.stringify({
      bin: { [tool]: "cli.cjs" }
    }));
    writeFileSync(path.join(directory, "cli.cjs"), `
      const fs = require("node:fs");
      const args = process.argv.slice(2);
      const files = args.slice(args.indexOf("--") + 1);
      fs.appendFileSync(process.env.HOOK_LOG, JSON.stringify({
        tool: ${JSON.stringify(tool)}, args, cwd: process.cwd(),
        files: files.map(file => [file, fs.readFileSync(file, "utf8")])
      }) + "\\n");
      process.exit(process.env.HOOK_FAIL === ${JSON.stringify(tool)} ? 1 : 0);
    `);
  }
  const check = (failure = "") => spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, HOOK_LOG: log, HOOK_FAIL: failure }
  });
  const checks = () => readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
  return { root, git, log, check, checks };
}

test("checks index contents, handles spaced filenames, and preserves partial staging", t => {
  const { root, git, check, checks } = fixture(t);
  const file = "packages/example/staged file.tsx";
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, "export const staged = true;\n");
  git("add", "--", file);
  writeFileSync(target, "export const unstaged = true;\n");
  const index = git("show", `:${file}`);
  const result = check();
  assert.equal(result.status, 0, result.stderr);
  const records = checks();
  assert.deepEqual(records.map(record => record.tool), ["oxfmt", "oxlint"]);
  assert.ok(records[0].args.includes("--check"));
  for (const record of records) {
    assert.deepEqual(record.files, [[file, index]]);
    assert.equal(existsSync(record.cwd), false, "temporary snapshot was not removed");
  }
  assert.equal(git("show", `:${file}`), index);
  assert.equal(readFileSync(target, "utf8"), "export const unstaged = true;\n");
});

test("blocks formatter or linter failures without modifying files and cleans snapshots", t => {
  const { root, git, check, checks, log } = fixture(t);
  const file = "staged.ts";
  writeFileSync(path.join(root, file), "export const staged = true;\n");
  git("add", "--", file);
  const index = git("show", `:${file}`);
  for (const failure of ["oxfmt", "oxlint"]) {
    if (existsSync(log)) rmSync(log);
    const result = check(failure);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Staged-file checks failed/);
    const records = checks();
    assert.equal(records.at(-1).tool, failure);
    assert.equal(existsSync(records[0].cwd), false);
    assert.equal(git("show", `:${file}`), index);
    assert.equal(readFileSync(path.join(root, file), "utf8"), index);
  }
});

test("skips non-TypeScript commits without running either tool", t => {
  const { root, git, log, check } = fixture(t);
  writeFileSync(path.join(root, "README.md"), "Documentation\n");
  git("add", "README.md");
  const result = check();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(log), false);
});
