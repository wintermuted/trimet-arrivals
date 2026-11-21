# @trimet-arrivals/routing

Mapbox walking estimates, route geometry, and vehicle interpolation.
Walking requests are cached; transit segment selection and vehicle interpolation
do not depend on Mapbox. The app supplies the token and owns React hooks,
animation scheduling, cameras, and map layers.

From the repository root: `npx nx run @trimet-arrivals/routing:test:package`.
