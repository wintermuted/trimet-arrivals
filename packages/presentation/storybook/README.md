# @overworld/storybook

Product component catalog for Overworld, using the public `@overworld/ui`
entry points rather than copies of application components. Wintermuted remains
the source of design tokens and base controls.

From the repository root, after `npm ci`:

```powershell
npm run storybook
```

Open `http://localhost:6006`. Use the theme toolbar to review Light and Dark,
Controls to edit props, Docs for component APIs, and Accessibility for findings.
Stories cover transit badges, time indicators/preferences, system alerts, and
stop search, plus detail headers, walking distances, and bookmark toggles.
Place examples cover shared nearby/search/saved rows, grouped category filters,
reference-layer controls, source attribution, global search popovers, saved-place
lists, and destination details. Transit examples also include departure picking.
Stop prediction examples include missing, repeated, scheduled, next-day, loading,
and last-received times. Trip picker examples cover comparison, confirmation,
editing/cancel, incomplete details, and long route names.
Examples include loading, empty, partial, failed, stale-data, truncated, and
disabled states. Play functions exercise search, retry, time preferences,
back actions, controlled bookmarking, mixed category selection, layer toggles,
independent help/retry actions, attribution disclosures, search keyboard/focus
behavior, saved-place removal, and stable departure selection.

```powershell
npm run build:storybook
```

Static output goes to `packages/presentation/storybook/storybook-static`.
The Storybook CI workflow checks types, builds the catalog, and retains this
directory as an artifact. The PR preview workflow also checks and builds the
catalog, then publishes it alongside the test app at
`https://wintermuted.github.io/overworld/pr-<number>/storybook/`.
The deployment comment links to it. Closing the PR removes the entire preview,
including Storybook. Production Pages deployments also check and build the
catalog and publish it permanently alongside the app at
[overworld/storybook/](https://wintermuted.github.io/overworld/storybook/).
Manual production validation builds include the catalog without publishing
unless the existing live-site publication option is enabled on main or master.
Local build/type validation remains CI-owned.

## Maintaining the library

- Keep reusable components in `@overworld/ui`; add typed CSF stories in
  `stories/<Component>.stories.tsx` using its public package exports.
- Use `Meta` with `satisfies` and `StoryObj` for prop-safe examples.
- Describe host-owned callbacks/policies in the component's Docs description.
  Use `fn()` from `storybook/test` for action callbacks, and `play` for important
  interactions. Do not connect stories to live feeds, device location, or maps.
- Supply fixed epoch-millisecond times and explicitly labeled sample data.
  Include failure, loading, empty, and boundary states as applicable.
- The preview supplies `TimeDisplayProvider`, Wintermuted CSS, and Font Awesome.
  Theme selection sets `data-theme` directly; the app's saved/system theme
  initializer is intentionally not used, so it cannot override the toolbar.
  Time preferences persist in the Storybook origin's local storage.
- Storybook uses its own Vite configuration, not the app's environment files,
  deployment base path, assets, or entry point. Add decorators only for the
  context a component actually requires; do not mount the whole application.
  Its own `vite-env.d.ts` supplies Vite's CSS/Sass module declarations to the
  catalog typecheck without importing the application's ambient types.
- Accessibility findings are visible but not a CI certification. The static
  build/type checks do not execute play functions in a browser; review them in
  Storybook. Existing Vitest component suites remain the behavioral CI gate.

Keep all Storybook packages on the same stable version. Dependencies use normal
npm specs and the single root lockfile. The catalog is an npm/Nx workspace;
its distinct `build:storybook` target stays outside the app's `build` target.
Storybook requires its own `jest-dom` 6.x installation alongside the app's 7.x
version. Preserve both lockfile entries rather than overriding either version.
CI checks the installed assertion dependency tree with
`npm ls @testing-library/jest-dom --all`, since an invalid merged lockfile can
survive `npm ci` with some npm versions.
