import { useSyncExternalStore } from "react";
import { Location } from "../trimet/interfaces/types";

let sharedDeviceLocation: readonly [number, number] | undefined;
const locationListeners = new Set<() => void>();
const getSharedDeviceLocation = () => sharedDeviceLocation;
const subscribeToDeviceLocation = (listener: () => void) => {
  locationListeners.add(listener);
  return () => { locationListeners.delete(listener); };
};
function updateSharedDeviceLocation(coordinates?: readonly [number, number]) {
  sharedDeviceLocation = coordinates;
  locationListeners.forEach(listener => listener());
}

export function useSharedDeviceLocation() {
  return useSyncExternalStore(subscribeToDeviceLocation, getSharedDeviceLocation, () => undefined);
}

export default function geoLocateCurrentPosition(): Promise<Location> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Geolocation is unavailable."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition((location: Location) => {
      updateSharedDeviceLocation([location.coords.longitude, location.coords.latitude]);
      resolve(location);
    }, error => {
      if (error.code === 1) updateSharedDeviceLocation();
      reject(error);
    }, { timeout: 15000 });
  });
}
