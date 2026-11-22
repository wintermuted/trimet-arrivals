import {
  geoLocateCurrentPosition,
  useSharedDeviceLocation as useDeviceLocation
} from "@overworld/geolocation";

export default geoLocateCurrentPosition;

export function useSharedDeviceLocation() {
  return useDeviceLocation();
}
