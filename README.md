# Overworld

Overworld is a monorepo for application tenants and reusable libraries.
**Go By Transit** is its first tenant, not the identity of the repository.
Future apps can live alongside it and consume the shared packages.

Here, a tenant is an independently scoped application workspace. The term does
not imply runtime account tenancy, shared authentication, or a tenant-routing
service.

[![Production CI/deploy](https://github.com/wintermuted/overworld/actions/workflows/deploy-pages.yml/badge.svg?branch=master)](https://github.com/wintermuted/overworld/actions/workflows/deploy-pages.yml) [![PR preview CI](https://github.com/wintermuted/overworld/actions/workflows/deploy-pr-preview.yml/badge.svg?event=pull_request)](https://github.com/wintermuted/overworld/actions/workflows/deploy-pr-preview.yml)
[![Line coverage](https://wintermuted.github.io/overworld/coverage/badge.svg)](https://wintermuted.github.io/overworld/coverage/)

## Application tenants

| Tenant | Workspace | Focus |
| --- | --- | --- |
| [Go By Transit](packages/applications/go-by-transit/README.md) | `@overworld/go-by-transit` | Portland transit arrivals, trip planning, vehicles, and place discovery. |

Go By Transit is currently the only deployed tenant. The root Vite entry,
`public/` assets, and GitHub Pages workflows still serve it at
**[wintermuted.github.io/overworld](https://wintermuted.github.io/overworld/)**.
The repository rename does not introduce separate deployment paths for future apps.

## Reusable libraries

Libraries use the `@overworld/*` namespace and are grouped by capability:

| Location | Packages |
| --- | --- |
| `packages/api` | `trimet-client`, `geolocation`, `places` |
| `packages/util` | `bookmarks`, `journeys`, `routing` |
| `packages/geography` | `maps` |
| `packages/presentation` | `ui` |

Tenants import public library entry points and own their screens, navigation,
state orchestration, and service configuration. Libraries must not import tenant
code. Reusable does not mean domain-free: transit-specific packages retain
their transit APIs. Packages remain private npm workspaces, not published libraries.

See [architecture](docs/architecture.md) for package APIs, dependency boundaries,
and adding tenants.

## Run locally

From the repository root, use Node.js **26.13.1** (see [`.nvmrc`](.nvmrc)) and npm:

```powershell
npm ci
npx nx run-many -t watch
```

These commands currently start Go By Transit. Open the local URL printed by Vite.
`npm run watch` also works.
See [development](docs/development.md) for CI, test commands, geometry exports,
and GitHub Copilot app setup.

## Documentation

- [Documentation index](docs/README.md): workspace guidance and tenant-specific guides.
- [Go By Transit](packages/applications/go-by-transit/README.md): features, screenshots,
  data limitations, and user guides.
- [Development](docs/development.md): shared tooling and current tenant deployment.
- [Report a bug](https://github.com/wintermuted/overworld/issues/new?template=bug_report.md):
  identify the affected tenant or library.

## License and security

Workspace code is MIT-licensed. Place datasets retain their own attribution and
license terms in the [data notice](public/data/places/NOTICE.txt) and
[maintenance guide](docs/place-data.md#snapshot-locations-attribution-and-licenses).
For vulnerability reporting, see the [security policy](SECURITY.md).
