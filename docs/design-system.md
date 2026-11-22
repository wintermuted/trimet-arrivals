# Design system

[Documentation](README.md) / [Project home](../README.md)

Contributor conventions for the shared theme, app shell, and maps.

## Shared theme and components

The app uses `@wintermuted/ui-theme` for its CSS, React components, and theme
preferences. `packages/applications/go-by-transit/src/index.tsx` imports `@wintermuted/ui-theme/index.css` and calls
`initTheme` from `@wintermuted/ui-theme/theme` before rendering. Both HTML
templates run the library's `getThemeScript()` bootstrap before styles to apply
the saved or system theme on first paint. `ThemeProvider`
wraps the app; the footer's sun/moon button switches between Light and Dark,
with the preference saved under `wintermuted:theme`. Without an explicit saved
choice, the app follows the system theme.

Import shared controls from `@wintermuted/ui-theme/react`. The bookmark section
picker uses `MultiSelect` from `@wintermuted/ui-theme/react/select`, with
`react-select` retained as its peer dependency. Keep router links as children of
shared navigation/list components rather than wrapping controls in link bridges.
Bootstrap styles, components, and router adapters are no longer used.

App-owned reusable React components live in `@overworld/ui`. Use its
public API for `TimeDisplayProvider`, `useTimeDisplay`, and `TimeDisplaySettings`.
Navigation wrappers stay in the app; `@wintermuted/ui-theme` remains the source
for shared design tokens and primitives.

## Layout and theme tokens

Responsive page layouts use app-owned `.transit-container`, `.transit-columns`,
and `.transit-grid` rules in `packages/applications/go-by-transit/src/App.css`. Use `--wm-*` variables for application
surfaces and status colors. Transit route colors remain in
`packages/applications/go-by-transit/src/styles/routes.scss`; map and transit data behavior remain separate from
presentation changes.

The app pins `@wintermuted/ui-theme@0.21.5`, the first published release with
these React/theme/select entries. Both lockfiles resolve this package to the
public npm registry; no local integration tarball is required.

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

Restart a running Vite development server after upgrading `@wintermuted/ui-theme` to clear
cached package exports.

See [development](development.md) for setup and [Nearby](nearby.md) for user-facing map behavior.
