import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.mts";

const appSource = "packages/applications/go-by-transit/src";
const domSetup = `${appSource}/test/setupDOMTests.js`;

export default defineConfig(env => mergeConfig(viteConfig(env), {
  test: {
    globals: true,
    mockReset: true,
    environmentOptions: {
      jsdom: { url: "http://localhost/" }
    },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html", "lcov", "json-summary", "cobertura"],
      include: [
        `${appSource}/{api,component,store,view}/**/*.{ts,tsx}`,
        "packages/{api,util,geography,presentation}/*/src/**/*.{ts,tsx}",
        `${appSource}/App.tsx`
      ],
      exclude: ["**/*.{test,spec}.{ts,tsx}", "**/*.d.ts"],
      reportOnFailure: true
    },
    projects: [
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: [`${appSource}/**/*.test.tsx`],
          setupFiles: [domSetup]
        }
      },
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: [`${appSource}/**/*.{spec,test}.{js,ts}`],
          setupFiles: [domSetup]
        }
      },
      {
        extends: true,
        test: {
          name: "journeys-package",
          environment: "jsdom",
          include: ["packages/util/journeys/src/**/*.test.ts"]
        }
      },
      {
        extends: true,
        test: {
          name: "trimet-client-package",
          environment: "node",
          include: ["packages/api/trimet-client/src/**/*.test.ts"]
        }
      },
      {
        extends: true,
        test: {
          name: "trimet-client-react-package",
          environment: "jsdom",
          include: ["packages/api/trimet-client/src/**/*.test.tsx"],
          setupFiles: [domSetup]
        }
      },
      ...[
        ["bookmarks", "util"],
        ["routing", "util"],
        ["geolocation", "api"],
        ["maps", "geography"],
        ["places", "api"],
        ["ui", "presentation"]
      ].map(([name, domain]) => ({
        extends: true as const,
        test: {
          name: `${name}-package`,
          environment: "jsdom" as const,
          include: [`packages/${domain}/${name}/src/**/*.test.{js,ts,tsx}`],
          setupFiles: [domSetup]
        }
      }))
    ]
  }
}));
