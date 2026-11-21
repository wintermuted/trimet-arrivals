import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { reportCoverage } from "./report-coverage.mjs";

const metric = (covered, total, pct) => ({ covered, total, pct });

test("creates a line coverage badge and appends every metric to the job summary", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "coverage-report-"));
  try {
    const total = {
      statements: metric(4, 5, 80),
      branches: metric(1, 2, 50),
      functions: metric(1, 4, 25),
      lines: metric(2, 3, 66.66)
    };
    await writeFile(path.join(directory, "coverage-summary.json"), JSON.stringify({ total }));
    const summaryFile = path.join(directory, "summary.md");
    await writeFile(summaryFile, "Existing summary\n");
    await reportCoverage(directory, summaryFile);
    const badge = await readFile(path.join(directory, "badge.svg"), "utf8");
    assert.match(badge, /aria-label="line coverage: 66\.66%"/);
    assert.match(badge, /<text x="126" y="14">66\.66%<\/text>/);
    const summary = await readFile(summaryFile, "utf8");
    assert.ok(summary.startsWith("Existing summary\n"));
    for (const name of Object.keys(total)) {
      assert.ok(summary.includes(`| ${name} | ${total[name].pct.toFixed(2)}% | ${total[name].covered}/${total[name].total} |`));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects missing, empty, or invalid coverage rather than publishing a misleading badge", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "coverage-report-"));
  try {
    const valid = metric(1, 2, 50);
    for (const invalid of [undefined, metric(0, 0, "Unknown"), metric(3, 2, 150), metric(-1, 2, 50)]) {
      await writeFile(path.join(directory, "coverage-summary.json"), JSON.stringify({
        total: { statements: valid, branches: valid, functions: valid, lines: invalid }
      }));
      await assert.rejects(reportCoverage(directory, ""), /Invalid or empty lines coverage/);
    }
    await assert.rejects(readFile(path.join(directory, "badge.svg")), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
