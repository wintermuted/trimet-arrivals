# Development

[Documentation](README.md) / [Project home](../README.md)

The app uses TypeScript, React, and Redux. Vite serves local development and
builds the production site.

## Setup and local development

Use the Node.js version in [`.nvmrc`](../.nvmrc) (26.13.1) and npm.
The deployment workflows read the same pinned version from `.nvmrc`.

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

Merge the configuration into the default branch to make it available to new
sessions created from that branch.

## Workspace packages

The root Vite app consumes two private npm workspaces: `@trimet-arrivals/places`
in `packages/places` owns Places data, discovery, and saved places;
`@trimet-arrivals/ui` in `packages/ui` owns reusable React components, starting
with time display. Import the package's public entry points rather than its
source files. Packages do not import root app code.

```powershell
npx nx run-many -t test:package
npx nx run '@trimet-arrivals/ui:test:package'
npx nx show projects --affected --base=origin/master --head=HEAD
```

Changing a package affects that package and the app, not its sibling. Both
Pages workflows still run the full deployment checks.

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
