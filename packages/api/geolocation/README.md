# @overworld/geolocation

Browser device location requests and shared React location subscription.
`geoLocateCurrentPosition()` returns the browser's `GeolocationPosition` and
rejects unavailable or failed requests. `useSharedDeviceLocation()` observes
the last successful longitude/latitude pair; permission denial clears it.

The package has no TriMet dependencies. The app owns fixture selection and
the optional default Portland location.

From the repository root: `npx nx run @overworld/geolocation:test:package`.
