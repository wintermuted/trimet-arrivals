import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve("packages", "components");
const sourceRoot = join(root, "src");
const files = readdirSync(sourceRoot).filter((name) =>
  /\.(?:tsx?|css)$/.test(name),
);
const permitted = new Set(["react", "@wintermuted/ui-react"]);

describe("context-free transfer boundary", () => {
  it.each(files)(
    "keeps %s independent of application and domain code",
    (name) => {
      const source = readFileSync(join(sourceRoot, name), "utf8");
      for (const [, specifier] of source.matchAll(
        /(?:from\s+|import\s*)["']([^"']+)["']/g,
      )) {
        if (specifier.startsWith("./")) {
          expect(specifier).toMatch(/^\.\/[^/]+\.(?:js|css)$/);
        } else {
          expect(permitted.has(specifier), `${name} imports ${specifier}`).toBe(
            true,
          );
        }
      }
      expect(source).not.toMatch(
        /@overworld|react-router|mapbox|localStorage|sessionStorage|fetch\s*\(|Date\.now|navigator\./,
      );
      expect(source).not.toMatch(
        /transit-|TriMet|Portland|planner-|places-|arrival/i,
      );
    },
  );

  it("uses a re-export-only public barrel and remains a private source workspace", () => {
    const source = readFileSync(join(sourceRoot, "index.ts"), "utf8");
    expect(
      source.replace(/export[\s\S]*?from\s+["'][^"']+["'];/g, "").trim(),
    ).toBe("");
    const manifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    );
    expect(manifest.private).toBe(true);
    expect(manifest.dependencies).toBeUndefined();
    expect(Object.keys(manifest.peerDependencies).sort()).toEqual([
      "@wintermuted/ui-react",
      "react",
    ]);
    expect(manifest.exports["."]).toBe("./src/index.ts");
    expect(manifest.sideEffects).toContain("**/*.css");
  });
});
