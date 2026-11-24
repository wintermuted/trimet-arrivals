---
name: npm-mirror-install
description: Diagnose npm installation failures involving package mirrors and use the approved, integrity-verified Wintermuted UI tarball cache bootstrap while preserving normal npm dependencies.
---

# npm installs and package mirrors

Use this skill for `npm ci` failures involving a package mirror, the locked
`@wintermuted/ui-theme` or `@wintermuted/ui-react` packages, or requests to use
`npm run install:tarballs`. Work from the Overworld repository root.

## Diagnose before changing anything

1. Inspect the error, `node --version`, `npm --version`, `.nvmrc`, the Volta pin,
   and `npm config get registry`. Do not print full npm configuration, auth tokens,
   or credentials. Select the pinned runtime if engine warnings show another
   Node version. Do not change the user's global runtime default.
2. Keep regular users on `npm ci` with the normal manifests and lockfile.
   A 404 does not establish quarantine, an unpublished release, or a particular
   mirror-refresh delay. TLS errors are not authentication failures or evidence
   that a version is missing.
3. For Microsoft's Package Feed Proxy, consult current organizational guidance
   using WorkIQ when available. The documented seven-day hold is a security
   quarantine, not a guaranteed propagation SLA; do not treat earlier findings
   as proof of a package's current status. The default proxy's browse feed can
   show upstream versions and quarantine timestamps. Escalate through the
   documented support route when necessary.
4. Do not switch registries, directly address proxy replicas, disable TLS
   verification, or use alternate downloads to bypass organizational controls.
   Confirm that GitHub Release tarballs are approved for this environment before
   using them. Approval for one environment is not permission for other users,
   hosts, or CI.

## Approved alternate-source workflow

The repository ships a dependency-free Node bootstrap. No package installation,
local build, sibling repository, or GitHub login is required for its public assets:

```powershell
npm run install:tarballs
npm ci
```

- Both commands must use the same npm cache and run from the repository root.
  Respect the user's configured cache; do not clear or relocate it silently.
- `scripts/bootstrap-ui.mjs` reads the exact UI versions and SHA-512 hashes from
  the root lockfile. It downloads each version's separate installable tarball
  from `wintermuted/wintermuted-ui` GitHub Releases, verifies the bytes, and runs
  `npm cache add` with package scripts disabled.
- The command cleans its temporary downloads and exits unsuccessfully on
  download, integrity, or cache failures. A partial failure may leave the first
  verified package cached; rerunning is safe. Do not claim installation succeeded
  until the subsequent `npm ci` succeeds.
- It does not change manifests, lockfiles, registry/TLS settings, or install-script
  approvals. Other dependencies still require the configured registry.
- Cache clearing, a different cache, or a UI version upgrade requires bootstrapping
  again. Missing release assets need producer-side publication, not silent
  selection of an older version or a locally modified package.
- Preserve `@overworld/ui`'s semver peer contract and verify `npm ls
  @wintermuted/ui-react @wintermuted/ui-theme` shows shared installations.
- npm install-script approval warnings are separate. Explain them; do not approve
  scripts without an explicit decision.

## Package upgrades and validation

Keep the app's normal npm version pins and root lockfile synchronized. Before
enabling bootstrap for a new version, verify the producer has attached reviewed
`npm pack` outputs to the matching package releases. Compare the assets to the
locked SHA-512 integrity; matching names and versions alone are insufficient.
Never replace an existing release asset with different bytes. GitHub source
archives are not substitutes for compiled npm packages.

Run `npm run test:bootstrap-ui` for the focused integrity and release-selection
tests. For changes to the bootstrap itself, also verify bootstrap followed by
`npm ci` using a fresh, explicitly scoped test cache; clean only that test cache
afterward. Leave normal CI installation on `npm ci`, without implicit alternate
downloads. Local lint, typecheck, and builds remain CI-owned.

Read `docs/design-system.md#layout-and-theme-tokens` for producer/consumer
boundaries and `docs/development.md` for setup. Do not mutate another repository
or upload release assets without a task that authorizes that work.
