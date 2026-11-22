const appSource = "<rootDir>/packages/applications/go-by-transit/src";

const common = {
  testEnvironment: "jsdom",
  resetMocks: true,
  transform: {
    "^.+\\.[cm]?[jt]sx?$": ["babel-jest", {
      targets: { node: "current" },
      presets: [
        "@babel/preset-env",
        ["@babel/preset-react", { runtime: "automatic" }],
        ["@babel/preset-typescript", { onlyRemoveTypeImports: false }]
      ]
    }]
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@wintermuted/ui-theme/)"
  ],
  moduleNameMapper: {
    "^@overworld/bookmarks$": "<rootDir>/packages/util/bookmarks/src/index.ts",
    "^@overworld/bookmarks/react$": "<rootDir>/packages/util/bookmarks/src/react.ts",
    "^@overworld/geolocation$": "<rootDir>/packages/api/geolocation/src/index.ts",
    "^@overworld/journeys$": "<rootDir>/packages/util/journeys/src/index.ts",
    "^@overworld/maps$": "<rootDir>/packages/geography/maps/src/index.ts",
    "^@overworld/maps/transit$": "<rootDir>/packages/geography/maps/src/transit.ts",
    "^@overworld/maps/places$": "<rootDir>/packages/geography/maps/src/places.ts",
    "^@overworld/maps/planner$": "<rootDir>/packages/geography/maps/src/planner.ts",
    "^@overworld/ui/journeys$": "<rootDir>/packages/presentation/ui/src/journeys.ts",
    "^@overworld/ui/alerts$": "<rootDir>/packages/presentation/ui/src/alerts.ts",
    "^@overworld/ui/vehicles$": "<rootDir>/packages/presentation/ui/src/vehicles.ts",
    "^@overworld/ui/search$": "<rootDir>/packages/presentation/ui/src/search.ts",
    "^@overworld/places/catalog$": "<rootDir>/packages/api/places/src/places.ts",
    "^@overworld/places/(contextOverlays|discovery|lineOverlays|neighborhoods|savedPlaces)$": "<rootDir>/packages/api/places/src/$1.ts",
    "^@overworld/ui$": "<rootDir>/packages/presentation/ui/src/index.ts",
    "^@overworld/ui/transit$": "<rootDir>/packages/presentation/ui/src/transit.ts",
    "^@overworld/routing$": "<rootDir>/packages/util/routing/src/index.ts",
    "^@overworld/routing/react$": "<rootDir>/packages/util/routing/src/react.ts",
    "^@overworld/trimet-client$": "<rootDir>/packages/api/trimet-client/src/index.ts",
    "^@overworld/trimet-client/react$": "<rootDir>/packages/api/trimet-client/src/react.ts",
    "^@overworld/trimet-client/fixtures$": "<rootDir>/packages/api/trimet-client/src/fixture/arrival.ts",
    "\\.(css|sass|scss)$": "identity-obj-proxy",
    "\\.(gif|jpe?g|png|svg|woff2?)$": `${appSource}/test/fileMock.cjs`,
    "^!mapbox-gl$": "mapbox-gl"
  }
};

module.exports = {
  coverageReporters: ["text-summary", "html", "lcov", "json-summary", "cobertura"],
  collectCoverageFrom: [
    "packages/applications/go-by-transit/src/{api,component,store,view}/**/*.{ts,tsx}",
    "packages/{api,util,geography,presentation}/*/src/**/*.{ts,tsx}",
    "packages/applications/go-by-transit/src/App.tsx"
  ],
  projects: [
    {
      ...common,
      displayName: "ui",
      roots: [appSource],
      testMatch: ["**/*.test.tsx"],
      setupFilesAfterEnv: [`${appSource}/test/setupDOMTests.js`]
    },
    {
      ...common,
      displayName: "unit",
      roots: [appSource],
      testMatch: ["**/?(*.)+(spec|test).[jt]s"],
      setupFilesAfterEnv: [`${appSource}/test/setupDOMTests.js`]
    },
    {
      ...common,
      displayName: "bookmarks-package",
      roots: ["<rootDir>/packages/util/bookmarks/src"],
      testMatch: ["**/*.test.ts", "**/*.test.tsx"],
      setupFilesAfterEnv: [`${appSource}/test/setupDOMTests.js`]
    },
    {
      ...common,
      displayName: "trimet-client-react-package",
      roots: ["<rootDir>/packages/api/trimet-client/src"],
      testMatch: ["**/*.test.tsx"],
      setupFilesAfterEnv: [`${appSource}/test/setupDOMTests.js`]
    },
    {
      ...common,
      displayName: "journeys-package",
      roots: ["<rootDir>/packages/util/journeys/src"],
      testMatch: ["**/*.test.ts"]
    },
    {
      ...common,
      displayName: "routing-package",
      roots: ["<rootDir>/packages/util/routing/src"],
      testMatch: ["**/*.test.ts", "**/*.test.tsx"],
      setupFilesAfterEnv: [`${appSource}/test/setupDOMTests.js`]
    },
    {
      ...common,
      displayName: "trimet-client-package",
      testEnvironment: "node",
      roots: ["<rootDir>/packages/api/trimet-client/src"],
      testMatch: ["**/*.test.ts"]
    },
    ...[
      ["geolocation", "api"],
      ["maps", "geography"],
      ["places", "api"],
      ["ui", "presentation"]
    ].map(([name, domain]) => ({
      ...common,
      displayName: `${name}-package`,
      roots: [`<rootDir>/packages/${domain}/${name}/src`],
      testMatch: ["**/*.test.[jt]s?(x)"],
      setupFilesAfterEnv: [`${appSource}/test/setupDOMTests.js`]
    }))
  ]
};
