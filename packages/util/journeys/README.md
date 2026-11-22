# @overworld/journeys

Recent journey storage and trip planner endpoint rules.
It keeps the five latest distinct, directional endpoint pairs under the existing
storage key. It also compares endpoints and resolves stop IDs, names, and aliases.
The package exports the stop/place/coordinate `PlannerEndpoint` model,
`locationEndpoint`, display labels, same-endpoint messages, and directional
query serialization. Coordinate validation reuses the TriMet client's parser;
verified place metadata is a type-only dependency on `places`.
The app owns planner navigation, URL state, bookmark integration, and place
verification against loaded snapshots.

From the repository root: `npx nx run @overworld/journeys:test:package`.
