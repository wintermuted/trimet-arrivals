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
    "^@trimet-arrivals/places/catalog$": "<rootDir>/packages/places/src/places.ts",
    "^@trimet-arrivals/places/(contextOverlays|discovery|lineOverlays|neighborhoods|savedPlaces)$": "<rootDir>/packages/places/src/$1.ts",
    "^@trimet-arrivals/ui$": "<rootDir>/packages/ui/src/index.ts",
    "\\.(css|sass|scss)$": "identity-obj-proxy",
    "\\.(gif|jpe?g|png|svg|woff2?)$": "<rootDir>/src/test/fileMock.cjs",
    "^!mapbox-gl$": "mapbox-gl"
  }
};

module.exports = {
  collectCoverageFrom: [
    "src/{api,component,store,view}/**/*.{ts,tsx}",
    "packages/*/src/**/*.{ts,tsx}",
    "src/App.tsx"
  ],
  projects: [
    {
      ...common,
      displayName: "ui",
      roots: ["<rootDir>/src"],
      testMatch: ["**/*.ui.test.tsx"],
      setupFilesAfterEnv: ["<rootDir>/src/test/setupDOMTests.js"]
    },
    {
      ...common,
      displayName: "legacy",
      roots: ["<rootDir>/src"],
      testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
      testPathIgnorePatterns: ["/node_modules/", "\\.ui\\.test\\.tsx$"],
      setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"]
    },
    ...["places", "ui"].map((name) => ({
      ...common,
      displayName: `${name}-package`,
      roots: [`<rootDir>/packages/${name}/src`],
      testMatch: ["**/*.test.[jt]s?(x)"],
      setupFilesAfterEnv: ["<rootDir>/src/test/setupDOMTests.js"]
    }))
  ]
};
