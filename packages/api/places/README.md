# @trimet-arrivals/places

Portland place discovery, saved places, and reference-layer snapshots and loading.
Use the package's subpath exports for the catalog, discovery, saved places,
neighborhoods, and overlays. See the [place-data guide](../../../docs/place-data.md)
for snapshot maintenance and attribution.

Mapbox rendering and marker icons live in `@trimet-arrivals/maps/places`.
This package owns catalog/category metadata and validated snapshots, not map
instances or screen navigation.

From the repository root: `npx nx run @trimet-arrivals/places:test:package`.
