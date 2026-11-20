# Development

[Documentation](README.md) / [Project home](../README.md)

The app uses TypeScript, React, and Redux. Local development uses Vite; production builds use Create React App.

## Setup and local development

Use the Node.js version in [`.nvmrc`](../.nvmrc) (26.13.1) and npm.
The deployment workflows read the same pinned version from `.nvmrc`.

```powershell
npm ci
npm run watch
```

Open the local URL printed by Vite. The repository's runtime floor in
[`package.json`](../package.json) is Node.js 26, but use the pinned version for
consistent development.

## Project origins

This project was bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app).

## Focused UI tests and CI

Run `npm run test:ui` for focused DOM integration tests covering navigation,
bookmarks, dialogs, and theme preferences. Preview and production deployment
workflows run these tests before the existing CRA production build. Local
development continues to use Vite; build/type validation stays in CI.

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

## Place-data tests

The existing ingestion tests do not query external services:

```powershell
npm run test:places-data
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
