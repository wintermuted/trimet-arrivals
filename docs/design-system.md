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

## Layout and theme tokens

Responsive page layouts use app-owned `.transit-container`, `.transit-columns`,
and `.transit-grid` rules in `packages/applications/go-by-transit/src/App.css`. Use `--wm-*` variables for application
surfaces and status colors. Transit route colors remain in
`packages/applications/go-by-transit/src/styles/routes.scss`; map and transit data behavior remain separate from
presentation changes.

The 1.0 migration pins both `@wintermuted/ui-theme` and `@wintermuted/ui-react`
to `1.0.0` in the app. The shared `@overworld/ui` library declares
`@wintermuted/ui-react@^1.0.0` as a peer; the app supplies the styles.
Keep every CSS import on `ui-theme`; its legacy React/theme/select exports
have been removed. React and `react-select` versions and component APIs stay unchanged.

Both packages are published: upstream [registry verification](https://github.com/wintermuted/wintermuted-ui/actions/runs/45098351672)
confirmed `ui-react@1.0.0` matches its reviewed tarball integrity and
`ui-theme@1.0.0` is unchanged. Local dependency resolution remains blocked:
public npm requests fail TLS negotiation, and the machine's Microsoft npm
mirror does not yet serve either 1.0.0 package.
The source and manifest migration is prepared, but the single root
`package-lock.json` still resolves theme `0.21.5`.
Do not merge or deploy this preparation until published dependencies can be
installed, the lockfile is regenerated, and migrated tests pass.
Do not substitute local tarballs or links for published dependencies.

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
