[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

This project was bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app).

# Usage

- npm ci
- npm run watch

## Design system

The app uses `@wintermuted/ui-theme` for its CSS, React components, and theme
preferences. `src/index.tsx` imports `@wintermuted/ui-theme/index.css` and calls
`initTheme` from `@wintermuted/ui-theme/theme` before rendering. `ThemeProvider`
wraps the app; the footer's sun/moon button switches between Light and Dark,
with the preference saved under `wintermuted:theme`. Without an explicit saved
choice, the app follows the system theme.

Import shared controls from `@wintermuted/ui-theme/react`. The bookmark section
picker uses `MultiSelect` from `@wintermuted/ui-theme/react/select`, with
`react-select` retained as its peer dependency. Keep router links as children of
shared navigation/list components rather than wrapping controls in link bridges.
Bootstrap styles, components, and router adapters are no longer used.

Responsive page layouts use app-owned `.transit-container`, `.transit-columns`,
and `.transit-grid` rules in `src/App.css`. Use `--wm-*` variables for application
surfaces and status colors. Transit route colors remain in
`src/styles/routes.scss`; map and transit data behavior remain separate from
presentation changes.

The app pins `@wintermuted/ui-theme@0.21.5`, the first published release with
these React/theme/select entries. Both lockfiles resolve this package to the
public npm registry; no local integration tarball is required.

Primary navigation pairs icons with labels and highlights the full active
section, including line detail pages. On narrow screens, the Menu button reveals
the routes. The theme toggle lives in an always-visible footer on every page.
Page content scrolls independently between the header and footer, keeping theme
controls accessible without covering the content.

Nearby fills that available space with independently scrolling results and a
contained map. On narrow screens the results and map share the available height
in stacked panels; map resizing follows panel size changes rather than a fixed
viewport-height offset.

Go on a route's stop detail opens a stop picker with the current route, direction,
and boarding stop. Destinations are limited to subsequent stops in route order;
changing the boarding stop clears the destination. The map shows the selected
route line and labeled boarding/destination markers. With both stops selected it
zooms to fit them, with padding that adapts to the map panel's size; with only a
boarding stop it focuses that stop. The destination summary links to its route-specific arrivals.
Selections are retained in the URL. This is a stop-selection flow, not a journey
planner: it does not estimate travel times or promise departure/arrival times.

The app shell follows the Wintermuted docs-topbar pattern used by Game of Life
and Inventory: compact branding, underline-active navigation, consistent page
gutters, and a quiet footer with source/releases links and theme controls.
The theme toggle matches Game of Life: its icon and label name the theme that
clicking will activate. Existing System preferences remain respected until the
user chooses Light or Dark. The footer remains always visible.

Restart a running Vite development server after upgrading this package to clear
cached package exports.

Run `npm run test:ui` for focused DOM integration tests covering navigation,
bookmarks, dialogs, and theme preferences. Preview and production deployment
workflows run these tests before the existing CRA production build. Local
development continues to use Vite; build/type validation stays in CI.

## GitHub Copilot app

Review and accept `.github/github-app.yml` in the app to enable the repository
scripts. Node.js 20.19.6 (see `.nvmrc`) and npm must be available on your PATH.

- **Setup** runs `npm ci` automatically when a new session is created. Wait for
  setup to finish before starting the dev server; it can also be rerun manually.
- **Run** starts the Vite dev server with `npm run watch`. The app detects its
  local URL and opens it in the integrated browser.

Merge the configuration into the default branch to make it available to new
sessions created from that branch.
