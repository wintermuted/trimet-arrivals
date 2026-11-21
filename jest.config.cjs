const appSource = "<rootDir>/packages/app/src";

const common = {
  testEnvironment: "jsdom",
  resetMocks: true,
  transform: {
    "^.+\\.[cm]?[jt]sx?$": ["babel-jest", {
      presets: [
        ["@babel/preset-env", { targets: { node: "current" } }],
        ["@babel/preset-react", { runtime: "automatic" }],
        "@babel/preset-typescript"
      ]
    }]
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@wintermuted/ui-theme/)"
  ],
  moduleNameMapper: {
    "^@trimet-arrivals/bookmarks$": "<rootDir>/packages/bookmarks/src/index.ts",
    "^@trimet-arrivals/journeys$": "<rootDir>/packages/journeys/src/index.ts",
    "^@trimet-arrivals/places/catalog$": "<rootDir>/packages/places/src/places.ts",
    "^@trimet-arrivals/places/(contextOverlays|discovery|lineOverlays|neighborhoods|savedPlaces)$": "<rootDir>/packages/places/src/$1.ts",
    "^@trimet-arrivals/ui$": "<rootDir>/packages/ui/src/index.ts",
    "^@trimet-arrivals/routing$": "<rootDir>/packages/routing/src/index.ts",
    "^@trimet-arrivals/trimet-client$": "<rootDir>/packages/trimet-client/src/index.ts",
    "^@trimet-arrivals/trimet-client/fixtures$": "<rootDir>/packages/trimet-client/src/fixture/arrival.ts",
    "\\.(css|sass|scss)$": "identity-obj-proxy",
    "\\.(gif|jpe?g|png|svg|woff2?)$": `${appSource}/test/fileMock.cjs`,
    "^!mapbox-gl$": "mapbox-gl"
  }
};

module.exports = {
  collectCoverageFrom: [
    "packages/app/src/{api,component,store,view}/**/*.{ts,tsx}",
    "packages/{bookmarks,journeys,places,routing,trimet-client,ui}/src/**/*.{ts,tsx}",
    "packages/app/src/App.tsx"
  ],
  projects: [
    {
      ...common,
      displayName: "ui",
      roots: [appSource],
      testMatch: ["**/*.ui.test.tsx"],
      setupFilesAfterEnv: [`${appSource}/test/setupDOMTests.js`]
    },
    {
      ...common,
      displayName: "legacy",
      roots: [appSource],
      testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
      testPathIgnorePatterns: ["/node_modules/", "\\.ui\\.test\\.tsx$"],
      setupFilesAfterEnv: [`${appSource}/setupTests.js`]
    },
    {
      ...common,
      displayName: "bookmarks-package",
      roots: ["<rootDir>/packages/bookmarks/src"],
      testMatch: ["**/*.test.ts"]
    },
    {
      ...common,
      displayName: "journeys-package",
      roots: ["<rootDir>/packages/journeys/src"],
      testMatch: ["**/*.test.ts"]
    },
    {
      ...common,
      displayName: "routing-package",
      roots: ["<rootDir>/packages/routing/src"],
      testMatch: ["**/*.test.ts"]
    },
    {
      ...common,
      displayName: "trimet-client-package",
      testEnvironment: "node",
      roots: ["<rootDir>/packages/trimet-client/src"],
      testMatch: ["**/*.test.ts"]
    },
    ...["places", "ui"].map((name) => ({
      ...common,
      displayName: `${name}-package`,
      roots: [`<rootDir>/packages/${name}/src`],
      testMatch: ["**/*.test.[jt]s?(x)"],
      setupFilesAfterEnv: [`${appSource}/test/setupDOMTests.js`]
    }))
  ]
};
