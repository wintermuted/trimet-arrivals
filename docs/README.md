# Overworld documentation

[Overworld home](../README.md) | [Go By Transit tenant](../packages/applications/go-by-transit/README.md)

Overworld hosts application tenants and shared `@overworld/*` libraries.
Go By Transit is currently its only tenant. User guides, screenshots, transit
data maintenance, and app-shell conventions below describe Go By Transit,
not a repository-wide product or a runtime multi-tenant service.

## Workspace development

| Guide | What you will find |
| --- | --- |
| [Architecture](architecture.md) | Application tenants, reusable libraries, package responsibilities, and dependency boundaries. |
| [Development](development.md) | Shared npm/Nx tooling, CI, test commands, Copilot app setup, and the current Go By Transit deployment. |

## Using Go By Transit

[Open Go By Transit](https://wintermuted.github.io/overworld/).

| Guide | What you will find |
| --- | --- |
| [Nearby, stops, and arrivals](nearby.md) | Location and map searches, routes, stop details, departures, and same-route trip times. |
| [Trip planning and walking estimates](trip-planning.md) | Stops and addresses, saved and recent trips, itineraries, directions, and walking-routing consent. |
| [Vehicles and trip following](vehicles.md) | Reported bus/train positions, vehicle details, following a run, camera modes, and update limitations. |
| [Places and map layers](places.md) | Portland destinations, search, saves, shared views, trip corridors, reference layers, and access caveats. |

Location and trip data have different privacy and persistence rules. See the
[Nearby location guide](nearby.md#nearby-workspace-and-location),
[walking-estimates consent](trip-planning.md#enable-walking-estimates-and-understand-privacy),
and [shared-view privacy](places.md#share-a-view-and-understand-privacy) before
enabling routing or sharing links.

## Developing and maintaining Go By Transit

| Guide | What you will find |
| --- | --- |
| [Design system](design-system.md) | Shared UI components, theme preferences, responsive layout, navigation, and map styling. |
| [Place-data maintenance](place-data.md) | Full and targeted refreshes, source validation, spatial tiles, source dates, attribution, and licenses. |

See the [security policy](../SECURITY.md) for reporting vulnerabilities and the
[place-data notice](../public/data/places/NOTICE.txt) for dataset attribution.
Data licenses are separate from the app code's MIT license.

## Historical planning

The [Token search adaptation plan](token-search-adaptation-plan.md) records
earlier implementation work. Its milestone status and initial scope are
historical context, not the current feature reference; use the guides above
for current behavior.
