# Development

[Documentation](README.md) / [Project home](../README.md)

The app uses TypeScript, React, and Redux. Vite serves local development and
builds the production site.

## Setup and local development

Use the Node.js version in [`.nvmrc`](../.nvmrc) (26.13.1) and npm.
The deployment workflows read the same pinned version from `.nvmrc`.
Use npm for workspace dependencies and commit changes to `package-lock.json`.

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

Jest runs the React tests
independently of Vite. Nx caches the place-data tests locally. UI tests still
run every time, and builds are uncached because each Pages deployment needs its
own `PUBLIC_URL` baked into the `build` output. The original `npm run test:ui`,
`npm run test:places-data`, and `npm run build` commands remain available.
Build/type validation stays in CI.

The app uses React 19 and `createRoot`. Write component tests with React Testing
Library: query accessible roles and labels, exercise interactions with
`@testing-library/user-event`, and assert visible behavior with
`@testing-library/jest-dom`. Do not inspect component instances, internal state,
or child component names. `fireEvent` is available for focused DOM events in
existing integration tests; React's removed `Simulate` APIs are not used.

All app `*.test.tsx` files run in the `ui` Jest project, including the migrated
Enzyme coverage, so the deployment workflows run them. Non-React app tests run
in the `unit` project through `npm run test:unit`; both app projects run in CI.
Shared package tests keep their existing projects.
Enzyme, its adapter and matchers, and the unused React test renderer have been
removed. Old files containing only commented-out assertions or empty test bodies
were retired rather than retained as passing coverage.

## Coverage reports and badge

Both deployment workflows run all Jest projects once with coverage, instead of
running separate app and shared-package test commands. Place-data tests and the
coverage-report script tests still run separately through Nx. Typecheck and
build steps remain unchanged.

```powershell
npm run test:coverage -- --runInBand
npm run coverage:report
```

Reports in ignored `coverage/` include HTML (`index.html`), LCOV, JSON summary,
Cobertura XML, and a generated line-coverage percentage badge (`badge.svg`).
CI retains the report as the `coverage-report` artifact, including when Jest
fails, and appends all four coverage metrics to the job summary after successful
tests. Coverage measures the app and workspace packages, not place-data scripts.

Production publishes the report at
[coverage/](https://wintermuted.github.io/trimet-arrivals/coverage/) alongside the
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
  repository root; the app source lives in `packages/app/src`.

Merge the configuration into the default branch to make it available to new
sessions created from that branch.

## Workspace commands

See [architecture](architecture.md#workspace-packages) for the package index
and each workspace's responsibilities.

```powershell
npx nx run-many -t test:package
npx nx run '@trimet-arrivals/bookmarks:test:package'
npx nx run '@trimet-arrivals/journeys:test:package'
npx nx run '@trimet-arrivals/ui:test:package'
npx nx run '@trimet-arrivals/routing:test:package'
npx nx run '@trimet-arrivals/trimet-client:test:package'
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
