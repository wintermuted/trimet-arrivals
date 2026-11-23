import { vi } from "vitest";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";
import { runInNewContext } from "vm";

const libraryBootstrap = execFileSync(process.execPath, [
  "--input-type=module",
  "-e",
  'import { getThemeScript } from "@wintermuted/ui-react/theme"; process.stdout.write(getThemeScript());',
], { encoding: "utf8" });

describe("Vite HTML theme bootstrap", () => {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const match = html.match(/<script data-theme-bootstrap>([\s\S]*?)<\/script>/);

  it("uses the library bootstrap before styles", () => {
    expect(match).not.toBeNull();
    expect(match![1]).toBe(libraryBootstrap);
    expect(html.indexOf(match![0])).toBeLessThan(html.search(/<link[^>]+rel=["']stylesheet["']/));
  });

  it.each([
    ["dark", false, "dark"],
    ["light", true, "light"],
    ["system", true, "dark"],
    [null, false, "light"],
    ["invalid", true, "dark"],
  ])("resolves preference %s with dark system %s", (preference, systemDark, expected) => {
    const root = { dataset: { theme: "" }, style: { colorScheme: "" } };
    const getItem = vi.fn(() => preference);
    runInNewContext(match![1], {
      document: { documentElement: root },
      localStorage: { getItem },
      window: { matchMedia: () => ({ matches: systemDark }) },
    });
    expect(getItem).toHaveBeenCalledWith("wintermuted:theme");
    expect(root.dataset.theme).toBe(expected);
    expect(root.style.colorScheme).toBe(expected);
  });

  it("falls back to the system preference when storage is unavailable", () => {
    const root = { dataset: { theme: "" }, style: { colorScheme: "" } };
    const warn = vi.fn();
    runInNewContext(match![1], {
      console: { warn },
      document: { documentElement: root },
      localStorage: { getItem: () => { throw new Error("storage unavailable"); } },
      window: { matchMedia: () => ({ matches: true }) },
    });
    expect(warn).toHaveBeenCalled();
    expect(root.dataset.theme).toBe("dark");
    expect(root.style.colorScheme).toBe("dark");
  });
});
