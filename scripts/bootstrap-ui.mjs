import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export function releasePackages(lock) {
  return ["ui-theme", "ui-react"].map(name => {
    const entry = lock.packages[`node_modules/@wintermuted/${name}`];
    if (!entry || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(entry.version)) {
      throw new Error(`Missing or invalid locked version for ${name}`);
    }
    if (!/^sha512-[A-Za-z0-9+/]{86}==$/.test(entry.integrity ?? "")) {
      throw new Error(`Missing SHA-512 lockfile integrity for ${name}`);
    }
    const filename = `wintermuted-${name}-${entry.version}.tgz`;
    return {
      name,
      filename,
      integrity: entry.integrity,
      url: `https://github.com/wintermuted/wintermuted-ui/releases/download/${encodeURIComponent(`${name}@${entry.version}`)}/${filename}`
    };
  });
}

export function verifyIntegrity(bytes, expected, name) {
  const actual = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  if (actual !== expected) {
    throw new Error(`Integrity mismatch for ${name}; refusing to cache package`);
  }
}

async function main() {
  if (!process.env.npm_execpath) {
    throw new Error("Run this script with npm run install:tarballs");
  }
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  const packages = releasePackages(lock);
  const directory = await mkdtemp(join(tmpdir(), "overworld-ui-"));
  try {
    for (const pkg of packages) {
      console.log(`Downloading ${pkg.filename}`);
      const response = await fetch(pkg.url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) {
        throw new Error(`Download failed for ${pkg.name}: HTTP ${response.status}`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      verifyIntegrity(bytes, pkg.integrity, pkg.name);
      const file = join(directory, pkg.filename);
      await writeFile(file, bytes);
      const result = spawnSync(process.execPath, [
        process.env.npm_execpath, "cache", "add", file, "--ignore-scripts"
      ], { stdio: "inherit" });
      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(`npm cache add failed for ${pkg.name} (${result.status ?? result.signal})`);
      }
      console.log(`Cached verified ${pkg.filename}`);
    }
    console.log("UI packages cached. Run npm ci using the same npm cache.");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
