import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const metrics = ["statements", "branches", "functions", "lines"];

export async function reportCoverage(directory = "coverage", summaryFile = process.env.GITHUB_STEP_SUMMARY) {
  const { total } = JSON.parse(await readFile(path.join(directory, "coverage-summary.json"), "utf8"));
  for (const metric of metrics) {
    const result = total?.[metric];
    if (!Number.isInteger(result?.total) || result.total <= 0 ||
        !Number.isInteger(result.covered) || result.covered < 0 || result.covered > result.total ||
        !Number.isFinite(result.pct) || result.pct < 0 || result.pct > 100) {
      throw new Error(`Invalid or empty ${metric} coverage`);
    }
  }

  const percentage = total.lines.pct.toFixed(2);
  const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="157" height="20" role="img" aria-label="line coverage: ${percentage}%">
  <title>line coverage: ${percentage}%</title>
  <rect width="95" height="20" fill="#555"/>
  <rect x="95" width="62" height="20" fill="#007ec6"/>
  <g fill="#fff" text-anchor="middle" font-family="Verdana, sans-serif" font-size="11">
    <text x="47.5" y="14">line coverage</text>
    <text x="126" y="14">${percentage}%</text>
  </g>
</svg>
`;
  await writeFile(path.join(directory, "badge.svg"), badge);

  if (summaryFile) {
    const rows = metrics.map(metric =>
      `| ${metric} | ${total[metric].pct.toFixed(2)}% | ${total[metric].covered}/${total[metric].total} |`
    );
    await appendFile(summaryFile, `## Jest coverage\n\nApp and workspace packages; place-data scripts are tested separately.\n\n| Metric | Coverage | Covered/total |\n| --- | ---: | ---: |\n${rows.join("\n")}\n\nDownload the coverage-report artifact for the browsable HTML report.\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await reportCoverage();
}
