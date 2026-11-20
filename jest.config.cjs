const common = {
  testEnvironment: "jsdom",
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
    "\\.(css|sass|scss)$": "identity-obj-proxy",
    "\\.(gif|jpe?g|png|svg|woff2?)$": "<rootDir>/src/test/fileMock.cjs",
    "^!mapbox-gl$": "mapbox-gl"
  }
};

module.exports = {
  clearMocks: true,
  collectCoverageFrom: [
    "src/{api,component,store,view}/**/*.{ts,tsx}",
    "src/App.tsx"
  ],
  projects: [
    {
      ...common,
      displayName: "ui",
      testMatch: ["<rootDir>/src/**/*.ui.test.tsx"],
      setupFilesAfterEnv: ["<rootDir>/src/test/setupDOMTests.js"]
    },
    {
      ...common,
      displayName: "legacy",
      testMatch: ["<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)"],
      testPathIgnorePatterns: ["/node_modules/", "\\.ui\\.test\\.tsx$"],
      setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"]
    }
  ]
};
