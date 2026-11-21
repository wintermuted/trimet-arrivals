import {
  geoLocateCurrentPosition,
  useSharedDeviceLocation as useDeviceLocation
} from "@trimet-arrivals/geolocation";

export default geoLocateCurrentPosition;

export function useSharedDeviceLocation() {
  return useDeviceLocation();
}
