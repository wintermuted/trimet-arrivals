# Design system

[Documentation](README.md) / [Project home](../README.md)

Contributor conventions for the Go By Transit tenant's theme, app shell, and maps.
Shared library APIs and theme primitives can be reused by other Overworld tenants;
Go By Transit's navigation, layouts, transit colors, and map UX are not requirements
for every application.

## Shared theme and components

The app uses `@wintermuted/ui-theme` for CSS and design tokens, and
`@wintermuted/ui-react` for React components and theme preferences.
`packages/applications/go-by-transit/src/index.tsx` imports `@wintermuted/ui-theme/index.css` and calls
`initTheme` from `@wintermuted/ui-react/theme` before rendering. The HTML
template runs the library's `getThemeScript()` bootstrap before styles to apply
the saved or system theme on first paint. `ThemeProvider`
wraps the app; the footer's sun/moon button switches between Light and Dark,
with the preference saved under `wintermuted:theme`. Without an explicit saved
choice, the app follows the system theme.

Import shared controls from `@wintermuted/ui-react`. The bookmark section
picker uses `MultiSelect` from `@wintermuted/ui-react/select`, with
`react-select` retained as its peer dependency. Keep router links as children of
shared navigation/list components rather than wrapping controls in link bridges.
Bootstrap styles, components, and router adapters are no longer used.

Reusable React presentation components live in the shared `@overworld/ui` library. Use its
public API for `TimeDisplayProvider`, `useTimeDisplay`, and `TimeDisplaySettings`.
Navigation wrappers stay in the app; `@wintermuted/ui-theme` remains the source
for shared design tokens and styles, while `@wintermuted/ui-react` supplies controls.

## Loading and action disclosure

Import `LoadStatus`, `RefreshAction`, and `ActionDisclosure`, and their public
interfaces, from `@wintermuted/ui-react`. Generic interactions and styles belong
to Wintermuted UI; no private component workspace is required.

`PlacesLoadStatus` retains its existing public API and extends the shared
`LoadIssue` type with the app's source label. Source/snapshot fetching policy,
transit copy, icons, retries, and map-positioned `PlacesHelp` remain app-owned.
Alert cards consume `RefreshAction` without changing their last-received data
policy. `PlannerDisclosure` adapts `ActionDisclosure` while retaining its public
journey API, heading IDs, icons, edit refs, collapse cleanup, and post-render focus.
Routing and time-display persistence remain outside the generic controls.

The app's existing full-theme import supplies `.wm-load-status*` and
`.wm-action-disclosure*` styles and the light/dark `--wm-color-warning-text` token.
React imports do not load CSS. Hosts using selective styles must explicitly load
`@wintermuted/ui-theme/styles/components/load-status.css` and
`@wintermuted/ui-theme/styles/components/action-disclosure.css`; the former also
imports spinner styles for screen-reader-only announcements.
Keep app-specific `transit-*` hooks on adapters rather than duplicating generic
styles or depending on private package internals.

## Product component catalog

[`@overworld/storybook`](../packages/presentation/storybook/README.md) catalogs
the shared product components using their public exports, with typed examples,
Light/Dark preview, editable controls, generated API docs, and accessibility
inspection. Run `npm run storybook` from the repository root and open
`http://localhost:6006`. Keep new reusable components in `@overworld/ui` and add
stories in `packages/presentation/storybook/stories`; do not fork shared
Wintermuted controls into the catalog. Examples use injected sample data rather
than live services. CI retains a static catalog artifact and publishes each
PR's catalog alongside its Pages test app at `pr-<number>/storybook/`, linked
from the preview comment. Both are removed when the PR closes. The live app's
Pages deployment stays unchanged.

## Layout and theme tokens

Responsive page layouts use app-owned `.transit-container`, `.transit-columns`,
and `.transit-grid` rules in `packages/applications/go-by-transit/src/App.css`. Use `--wm-*` variables for application
surfaces and status colors. Transit route colors remain in
`packages/applications/go-by-transit/src/styles/routes.scss`; map and transit data behavior remain separate from
presentation changes.

The app pins `@wintermuted/ui-react` to `1.2.0` and `@wintermuted/ui-theme`
to `1.0.3`. The shared `@overworld/ui` library declares
`@wintermuted/ui-react@^1.2.0` as a peer, the first release with these controls;
the app supplies the styles. The UI React package's `^1.0.3` theme dependency
shares that pin.
Keep every CSS import on `ui-theme`; its legacy React/theme/select exports
have been removed. React and `react-select` versions and component APIs stay unchanged.

Both packages are published to npm and distributed as installable GitHub Release
assets in `wintermuted/wintermuted-ui`. The single root `package-lock.json`
retains npm URLs and SHA-512 integrity hashes so regular users can run `npm ci`
without special setup. The React package's theme dependency shares the app's
locked theme installation.

The adopted [React release](https://github.com/wintermuted/wintermuted-ui/releases/tag/ui-react%401.2.0)
and [theme release](https://github.com/wintermuted/wintermuted-ui/releases/tag/ui-theme%401.0.3)
reference recovered producer commit `997722d86e3eadfaed00077484b3127dd1844840`.
Their tarballs were checked against authoritative registry SHA-512 metadata
before inspecting compiled exports, declarations, and CSS. Later producer
changes are not necessarily part of these artifacts.

Where GitHub Release dependencies are approved and the registry cannot serve
the locked UI packages, run `npm run install:tarballs` before `npm ci`. The bootstrap
needs only Node and npm, not installed dependencies. It downloads the separate
release assets matching the locked versions, verifies their exact SHA-512
integrity, and adds the bytes to npm's content cache without running package
scripts. A mismatch or download/cache failure stops with an explicit error.
Temporary downloads are removed. It does not edit manifests, lockfiles, registry
settings, or install-script approvals. Use the same npm cache for both commands;
rerun bootstrap after clearing that cache or upgrading the UI packages.

For future upgrades, attach the reviewed `npm pack` outputs to the matching
package releases and verify their integrity against the published packages.
Do not replace an existing asset with different bytes. Update the normal npm
version pins and root lockfile together, then verify bootstrap followed by a
clean `npm ci` and focused consumer tests. Release-asset uploads are a
producer-side step; Overworld does not build or publish UI packages.
This opt-in route does not waive organizational quarantine, scanning, or
provenance requirements. Other dependencies still use the configured registry.

## Navigation and page shell

Primary navigation pairs icons with labels and highlights the full active
section, including line detail pages. On narrow screens, the Menu button reveals
the routes. The theme toggle lives in an always-visible footer on every page.
Page content scrolls independently between the header and footer, keeping theme
controls accessible without covering the content.

## Nearby panels and loading

Nearby fills the space between the header and footer with independently scrolling results and a
contained map. On narrow screens the results and map share the available height
in stacked panels; map resizing follows panel size changes rather than a fixed
viewport-height offset.
Explore shows sidebar and map placeholders while waiting for device location.
The map placeholder clears when the map is ready; the sidebar placeholder stays
until nearby results are ready or the request reports an error.

## Nearby spacing

Nearby removes the main content's outer gutters so the map reaches the available
edges; the results sidebar retains 14px horizontal padding only, with no top/bottom
gutter. The sidebar detail header spans the full available sidebar width while its
contents align with the padded content below. Other pages keep the standard content spacing.

## Detail navigation

Detail headers use an accessible back-caret link before the title rather than an
outlined Back button.

## Map theming

Mapbox maps use the Standard basemap's day/night lighting preset to follow the
app's resolved Light/Dark theme, including saved and system preferences. Changing
themes updates the existing map configuration rather than replacing the style,
preserving route lines, stop markers, selected trips, and the camera position.
Map removal also disconnects its theme subscription.
Stop and current-location circles use full emissive strength so day/night
basemap lighting does not dim their colors, including the selected-stop highlight.
Map marker popups use the app's surface/text tokens for readable Light/Dark
content, matching pointer arrows, and visible close-button focus states.

## App shell and theme controls

The app shell follows the Wintermuted docs-topbar pattern used by Game of Life
and Inventory: compact branding, underline-active navigation, consistent page
gutters, and a quiet footer with source/releases links and theme controls.
The theme toggle matches Game of Life: its icon and label name the theme that
clicking will activate. Existing System preferences remain respected until the
user chooses Light or Dark. The footer remains always visible.

Restart a running Vite development server after upgrading either Wintermuted package to clear
cached package exports.

See [development](development.md) for setup and [Nearby](nearby.md) for user-facing map behavior.
