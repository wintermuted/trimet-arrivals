# Development

[Documentation](README.md) / [Project home](../README.md)

This guide covers Overworld's shared development tooling and its current
Go By Transit tenant. Run workspace commands from the repository root.
Root watch/build targets, Vite entry/assets, and Pages workflows currently
serve Go By Transit only; they are not a multi-tenant launcher or deployment system.
See [architecture](architecture.md#repository-and-application-tenants) before
adding another application tenant.

Go By Transit uses TypeScript and React. Vite 8 serves local development and
builds the production site with the compatible `@vitejs/plugin-react` 6 plugin.
Use Sass `@use` rather than deprecated `@import` rules. Refresh stale browser
compatibility data with `npx update-browserslist-db@latest` and commit the lockfile.

## Setup and local development

Use the Node.js version in [`.nvmrc`](../.nvmrc) (26.13.1) and npm.
The deployment workflows read the same pinned version from `.nvmrc`.
Volta users automatically select the matching version pinned in `package.json`
instead of their global Node default. Keep both pins in sync. Node version
managers are installed separately, not through the deprecated npm `nvm` package.
Use npm for workspace dependencies and commit changes to `package-lock.json`.
All package manifests and the lockfile use normal npm dependencies. If your
registry cannot serve the locked Wintermuted UI packages and GitHub Release
dependencies are approved for your environment, bootstrap npm's cache first:

```powershell
npm run install:tarballs
npm ci
```

The opt-in bootstrap requires GitHub release-download access and verifies the
tarballs against the unchanged lockfile. It needs no installed dependencies and
does not switch registries or create an alternate lockfile. Regular npm users
can skip it. See [design-system package distribution](design-system.md#layout-and-theme-tokens)
for the approved-source requirements and upgrade procedure.
Repository agent guidance lives in `.github/copilot-instructions.md`; the
`npm-mirror-install` skill covers diagnosis, approval boundaries, cache reuse,
and verification. Both deployment workflows run the bootstrap's focused tests
without activating alternate-source downloads.

```powershell
npm ci
npx nx run-many -t watch
```

Open the local URL printed by Vite. The repository's runtime floor in
[`package.json`](../package.json) is Node.js 26, but use the pinned version for
consistent development. Nx wraps the existing npm scripts.

The Commitlint parser pins `argue-cli` to `3.2.0` because the npm mirror used
by the VS Code setup task does not serve `3.2.1`.

## Focused UI tests and CI

The product component catalog is a separate npm/Nx workspace. Start it with:

```powershell
npm run storybook
```

Open `http://localhost:6006`. The separate Storybook workflow runs
`npm run typecheck:storybook` and `npm run build:storybook` and retains its static
output as an artifact; local build/type validation stays in CI. See the
[catalog contributor guide](../packages/presentation/storybook/README.md)
for story conventions, provider setup, sample data, and interaction examples.

Run the React component and DOM integration suite for navigation, bookmarks,
dialogs, and theme preferences:

```powershell
npx nx run-many -t test:ui
```

GitHub Pages production and preview workflows run the app component and unit
tests, place-data tests, shared-package tests, and TypeScript checks before the
Vite build. To run the app test targets used by both workflows:

```powershell
npx nx run-many -t test:ui,test:unit --outputStyle=stream
```

Vitest 5 runs TypeScript and React tests through the app's Vite configuration,
with JSDOM for DOM tests and Node for the core TriMet client tests. Keep Vitest
and `@vitest/coverage-v8` on matching versions. `npm test` runs once; use
`npx vitest` for interactive watch mode.
Import `vi` and mock types from `vitest`; suite, assertion, and lifecycle globals
are enabled in `vitest.config.mts`. Mock factories return an export object,
including `default` for default exports, and use asynchronous `vi.importActual`
for partial mocks. Constructor mocks must use constructable functions, not
arrows. Modern fake timers use `vi.useFakeTimers()`.
Nx caches the place-data tests locally. UI tests still
run every time, and builds are uncached because each Pages deployment needs its
own `PUBLIC_URL` baked into the `build` output. The original `npm run test:ui`,
`npm run test:places-data`, and `npm run build` commands remain available.
Build/type validation stays in CI.

When removing dead code, trace application entry points, registered routes,
workspace package exports, test/setup files, and script/configuration consumers.
An unreferenced application wrapper can be retired without removing its shared
package's public export. Preserve routed legacy screens, dynamically loaded
assets, import-time side effects, and uncertain or test-only candidates until
their retirement is explicitly established.

Oxlint checks all workspace TypeScript and TSX files using native rules in
`.oxlintrc.json`, migrated from the previous ESLint TypeScript/React configuration.
Oxfmt handles formatting. Existing `any` types, TypeScript
suppression comments, unused declarations, and the automatic JSX runtime remain
supported. Vitest globals are enabled only in test files;
React props use TypeScript rather than runtime PropTypes.

Bookmark consumers use `useBookmarks` and `useBookmarkCommands` beneath the
app-owned `BookmarksProvider`, not Redux selectors or actions. Wrap isolated
bookmark, navigation, homepage, and connected-planner tests in the provider and
seed the existing `@overworld/bookmarks` storage keys before rendering. Keep
shared storage APIs React-free. The focused provider tests exercise persistence,
independent load failures, write failures, partial group cleanup, shortcuts, and
cross-consumer/remount behavior. Wrap legacy saved-stop cards and navigation
refresh status in `ArrivalsProvider`; they no longer need Redux or dispatch
arrival actions. Its focused tests cover per-stop request deduplication,
out-of-order results, stale-response guards, explicit empty/error/retry states,
30-second polling and countdown reset, and unsubscribe/StrictMode cleanup.
Requests still use the configured shared client and a 45-minute horizon.
Legacy arrival tables render from the parent response without a Redux provider
or cached route metadata. Their focused link tests cover route filtering and
response updates as well as existing route/stop/direction navigation.
The Redux store, provider, reducers, middleware, and dependencies have been
removed. Line-list dictionary helpers live alongside the line views.
Line-detail tests need router and bookmark context when applicable, but no
Redux provider.

The native-only configuration enables 78 rules, including
`react/require-render-return` from Oxlint's nursery rules. It intentionally drops
interface naming conventions and `react/no-deprecated`, which have no equivalent
in this non-type-aware configuration. No JavaScript plugin bridge or additional
type-aware backend is enabled.

Use `npm run lint` (or the Nx `lint` target) for checks and `npm run lint:fix`
for fixes. Both Pages workflows run lint before tests. Agent-run local
lint/typecheck/build validation remains CI-owned.

### File length

Workspace TypeScript and TSX files must stay at or below **500 total lines**.
Oxlint's `max-lines` rule counts comments and blank lines and is enforced by
the existing CI lint target and staged-file hook.

All workspace source and test files meet this limit; there are no per-file
exceptions. Do not raise the limit or add broad exceptions.
Split code by responsibility into focused components, hooks, helpers, or test
suites rather than compressing formatting or removing useful comments.
The rule covers application and library source and tests under `packages/`;
JavaScript maintenance scripts, generated assets, and documentation remain
outside the current workspace lint scope.

Nearby map ownership stays in `NearbyViewComponent`, with routed views in
`NearbyOutletViews`, place discovery state in `useNearbyPlacesDiscovery`, and
place sidebar/layers in `NearbyPlacesDiscovery`. Route grouping/sorting lives
in `nearbyRouteArrivals`, separate from `SimpleRouteGroups` rendering.
Trip planning separates request/selection state (`useTripPlannerState`),
endpoint fields, the search form, and itinerary/journey results.
Related tests are grouped by scenario, with test-only fixtures under
`src/test` rather than production modules. Mock-heavy `.fixture.tsx` helpers
share the production TypeScript configuration's existing test exclusions;
Vitest still loads and exercises them through their importing test suites.

Husky 9 installs hooks through `npm install`/`npm ci` via the `prepare` script.
The pre-commit hook runs Oxfmt checks followed by Oxlint on staged TypeScript/TSX
contents in a temporary snapshot, without changing the index or working files.
Partially staged files retain their unstaged edits. Formatting or lint failures
block the commit; fix the files and stage the intended changes before retrying.
The commit-msg hook validates the message with Commitlint. lint-staged is no
longer used. Run `npm run test:hooks` for the isolated hook-runner tests, which
use stub format/lint tools rather than invoking local lint.

Use `npm run format` to check app TypeScript/TSX formatting and
`npm run format:fix` to write fixes. `.oxfmtrc.json` keeps the previous 80-column
print width rather than Oxfmt's 100-column default. Existing source files were
not reformatted during migration.

Type checking uses TypeScript 7 with bundler
module resolution, an ES2020 language target, and explicit Node/React ambient
types. The `typecheck` npm/Nx target invokes `tsc --noEmit`. Vite controls
production JavaScript output. Oxlint does not require the old compiler API, so
TypeScript 5 and the `typescript-native` alias are no longer needed. Vitest uses
an ESM configuration and does not need Babel presets or ts-node.
Commitlint 21 uses Jiti for TypeScript configuration and no longer depends on
`cosmiconfig-typescript-loader`; this repository keeps its JavaScript config.

The app uses React 19 and `createRoot`. Write component tests with React Testing
Library: query accessible roles and labels, exercise interactions with
`@testing-library/user-event`, and assert visible behavior with
`@testing-library/jest-dom`. Do not inspect component instances, internal state,
or child component names. `fireEvent` is available for focused DOM events in
existing integration tests; React's removed `Simulate` APIs are not used.
jest-dom 7 requires Node 22 or newer and Testing Library DOM 10, both covered by
the repository's Node 26 target and React Testing Library dependencies. Node
ambient types likewise track Node 26.

All app `*.test.tsx` files run in the `ui` Vitest project, including the migrated
Enzyme coverage, so the deployment workflows run them. Non-React app tests run
in the `unit` project through `npm run test:unit`; both app projects run in CI.
Shared package tests keep their existing projects.
The routing package also runs its React hook tests in JSDOM. TriMet's optional
React hooks run in a separate `trimet-client-react-package` JSDOM project, leaving
the main client tests in Node; both run through its `test:package` target.
The maps package tests injected theme lifecycle and current-location layers.
Enzyme, its adapter and matchers, and the unused React test renderer have been
removed. Old files containing only commented-out assertions or empty test bodies
were retired rather than retained as passing coverage.

## Coverage reports and badge

Both deployment workflows run all Vitest projects once with V8 coverage, instead of
running separate app and shared-package test commands. Place-data tests and the
coverage-report script tests still run separately through Nx. Typecheck and
build steps remain unchanged.

```powershell
npm run test:coverage -- --maxWorkers=1
npm run coverage:report
```

Reports in ignored `coverage/` include HTML (`index.html`), LCOV, JSON summary,
Cobertura XML, and a generated line-coverage percentage badge (`badge.svg`).
CI retains the report as the `coverage-report` artifact, including when Vitest
fails, and appends all four coverage metrics to the job summary after successful
tests. Coverage measures the app and workspace packages, not place-data scripts.
V8 instrumentation differs from Jest's previous instrumentation, so percentages
can change even when the tests and source coverage scope stay the same.

Production publishes the report at
[coverage/](https://wintermuted.github.io/overworld/coverage/) alongside the
app; the README badge links there. The badge represents the latest successful
production deployment, not an individual PR. PR previews publish their own
report under `pr-<number>/coverage/` without overwriting production coverage.
The production badge becomes available after the first deployment with this
configuration. Validation-only manual runs retain artifacts but do not publish.

GitHub's [official coverage setup guide](https://docs.github.com/en/code-security/how-tos/maintain-quality-code/set-up-code-coverage)
requires Code Quality, which GitHub's API reports is unavailable for this
repository. Coverage is therefore captured with official
`actions/upload-artifact`, not `actions/upload-code-coverage`; there are no
native Code Quality PR comparisons or third-party coverage uploads.
The Cobertura report is ready for the official uploader if Code Quality becomes
available later.

To test a production build without publishing, run **Deploy to GitHub Pages**
manually from your branch with **Publish to the live site** unchecked. It runs
the production build and checks its asset paths and Pages files without changing
the live site. Pushes to `main` or `master` still publish automatically.

## Route geometry export

Route geometry is generated from `scripts/tm_routes.json` using `npm run trimet`
and served from `public/data/trimet/geoJSON`. The exporter groups every feature
for a route/direction, joins touching segments, and retains disconnected parts as
MultiLineStrings rather than overwriting earlier segments or inventing connections.
The map loader also accepts the existing line-based GeometryCollection assets.

## GitHub Copilot app

Review and accept `.github/github-app.yml` in the app to enable the repository
scripts. Node.js 26.13.1 (see `.nvmrc`) and npm must be available on your PATH.

- **Setup** runs `npm ci` automatically when a new session is created. Wait for
  setup to finish before starting the dev server; it can also be rerun manually.
- **Run** starts the Vite dev server with `npm run watch`. The app detects its
  local URL and opens it in the integrated browser.
- **Run with Nx** starts the same server through Nx. Both run options use the
  repository root; the app source lives in `packages/applications/go-by-transit/src`.

Merge the configuration into the default branch to make it available to new
sessions created from that branch.

## Workspace commands

See [architecture](architecture.md#workspace-packages) for the package index
and each workspace's responsibilities.

npm discovers workspace manifests with `packages/*/*`; Nx uses those same
manifests and the app's `project.json` at its nested root. Workspace projects use
`@overworld/*` names, with `@overworld/go-by-transit` for the app and `overworld`
for root tooling. They retain their targets and carry `domain:<folder>` and `type:application`
or `type:library` tags for graph filtering. These tags describe organization;
they do not impose new dependency restrictions. New libraries belong under a
domain folder within `packages`, and new apps under `packages/applications`.

Each leaf package declares its own direct runtime dependencies and the types
and test helpers it uses. React, Mapbox, and `@wintermuted/ui-react` remain peer contracts
where shared libraries require a host-provided instance; hook libraries also
declare React as a development dependency for their own tests. The app supplies
the concrete runtime versions and declares the shared workspaces it consumes.
Select consumers also require `react-select`, an optional `ui-react` peer that
must be declared explicitly rather than relying on an existing installation.
The repository root owns only shared build, test, lint, and release tooling as
development dependencies. npm may hoist installations, but hoisting is not a
substitute for declaring a dependency in its consuming workspace.

Wintermuted 1.0 separates CSS (`@wintermuted/ui-theme`) from React controls,
select integration, and theme runtime helpers (`@wintermuted/ui-react`).
The app declares both packages; the shared presentation library peers on
`ui-react`. Keep CSS imports on `ui-theme` and keep `initTheme` before rendering.
Vite/Vitest need no package aliases or ESM transform allowlists for this split.
See [design-system package versions](design-system.md#layout-and-theme-tokens)
for public-registry resolution and lockfile conventions.

```powershell
npx nx run-many -t test:package
npx nx run '@overworld/bookmarks:test:package'
npx nx run '@overworld/journeys:test:package'
npx nx run '@overworld/ui:test:package'
npx nx run '@overworld/routing:test:package'
npx nx run '@overworld/trimet-client:test:package'
npx nx show projects --affected --base=origin/master --head=HEAD
```

Changing a shared package affects that package, the app, and the root project
that runs the app's tasks, not the other shared packages. Both Pages workflows
still run the full deployment checks.

## Place-data tests

The existing ingestion tests do not query external services:

```powershell
npx nx run-many -t test:places-data
```

See [place-data maintenance](place-data.md) before running refresh commands,
which fetch upstream sources and replace checked-in snapshots.

## Updating README screenshots

Keep the README images in `docs/images/`:

- `places-desktop.png`: Nearby Places at 1440 x 960, using the **Park day**
  discovery preset with a successfully rendered Portland map and loaded results.
- `trip-planner-mobile.png`: the standalone planner at 390 x 844, showing
  successfully loaded itinerary options for public stop endpoints. The current
  capture uses `/planner?from=8333&to=10579` (Library/SW 9th Ave MAX Station to
  Portland International Airport).

Capture the current app, not an illustration or a modified UI. Use an isolated
browser profile with no saved places, bookmarks, recent trips, or personal
location. If geolocation is needed, use an explicitly configured public Portland
location rather than the device's actual location. Do not mask service errors
or use fabricated results. Wait for maps and data to finish loading.

Keep map/data attribution visible. Size images for readable text without
unnecessarily large files, inspect both captures, and update the README's alt
text and captions when changing what they show.

See [design-system conventions](design-system.md) for shared UI and theming.
