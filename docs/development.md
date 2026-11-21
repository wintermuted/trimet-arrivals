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

Run the focused DOM integration suite for navigation, bookmarks, dialogs, and
theme preferences:

```powershell
npx nx run-many -t test:ui
```

GitHub Pages production and preview workflows run the UI and place-data tests
and TypeScript checks before the Vite build. Jest runs the React tests
independently of Vite. Nx caches the place-data tests locally. UI tests still
run every time, and builds are uncached because each Pages deployment needs its
own `PUBLIC_URL` baked into the `build` output. The original `npm run test:ui`,
`npm run test:places-data`, and `npm run build` commands remain available.
Build/type validation stays in CI.

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

## Workspace layout

The app source and integration tests live in `packages/app/src`, tracked by Nx
as `@trimet-arrivals/app`. Vite's entry HTML, `public/`, and the `build/` output
stay at the repository root, as do the npm and Nx commands used to run them.

The app consumes six private npm workspaces. `@trimet-arrivals/bookmarks`
owns bookmark sections, saved stops and routes, route groups, and shortcuts,
preserving their existing browser storage keys and formats. Redux and bookmark
screens stay in the app. `@trimet-arrivals/journeys` owns recent journey
history in browser storage; planner navigation and URL state stay in the app.
`@trimet-arrivals/places` owns
Places data, discovery, and saved places; `@trimet-arrivals/ui` owns reusable
React components; `@trimet-arrivals/trimet-client` owns requests and fixtures
for arrivals, nearby stops, and route configuration, plus service alert requests
and filtering, trip-planner requests and XML parsing, and vehicle positions and
trip lookups. Trip planning uses the browser's `DOMParser`; screens, URL state,
planner color choices, vehicle polling, and map rendering stay in the app.
The app supplies the TriMet URL, app ID, and
`REACT_APP_USE_FIXTURE` setting for requests with fixtures. For route
configuration, only the all-routes request uses fixtures. The client indexes
and searches the stop catalog; fetching, caching, planner colors, and Redux
stay in the app. `@trimet-arrivals/routing` owns Mapbox walking
estimates, route geometry requests, and their caches. The app supplies the
walking access token and owns the React hooks and map layers.
Import package entry points rather than source files; shared packages do not
import app code.

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
