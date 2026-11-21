import { useSyncExternalStore } from "react";

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

export function geoLocateCurrentPosition(): Promise<GeolocationPosition> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Geolocation is unavailable."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(location => {
      updateSharedDeviceLocation([location.coords.longitude, location.coords.latitude]);
      resolve(location);
    }, error => {
      if (error.code === 1) updateSharedDeviceLocation();
      reject(error);
    }, { timeout: 15000 });
  });
}
