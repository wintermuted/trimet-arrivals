# Dependency installation

- Use npm and the single root `package-lock.json`. Keep dependency manifests and
  lockfile entries on normal npm version specs and registry URLs; do not introduce
  machine-specific URLs, alternate lockfiles, or sibling-checkout dependencies.
- Use the Node version in `.nvmrc` and the matching `package.json` Volta pin.
  Resolve an engine mismatch by selecting that runtime, not weakening engines.
- Start with `npm ci`. Distinguish registry HTTP errors, TLS/network failures,
  runtime warnings, and npm install-script approval warnings.
- For locked Wintermuted UI packages unavailable through a package mirror, follow
  `.github/skills/npm-mirror-install/SKILL.md`. Where the alternate source is
  explicitly approved, run `npm run install:tarballs` and then `npm ci` with the
  same npm cache. This opt-in command seeds the cache; it does not install the
  dependency tree or change registry settings.
- Do not infer security approval from a 404, registry lag, or the presence of
  release assets. Do not bypass quarantine or disable TLS checks. Do not
  automatically approve dependency install scripts.
- Keep normal CI on `npm ci`; test bootstrap logic with
  `npm run test:bootstrap-ui`. A release asset must match the locked SHA-512 bytes,
  not merely its package name/version. Report missing assets and integrity
  mismatches rather than substituting another release.

See `docs/development.md` and `docs/design-system.md` for installation and
producer-side release packaging details.
