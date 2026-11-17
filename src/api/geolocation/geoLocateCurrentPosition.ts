import { Location } from "../trimet/interfaces/types";

export default function geoLocateCurrentPosition(): Promise<Location> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Geolocation is unavailable."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition((location: Location) => {
      resolve(location);
    }, reject, { timeout: 15000 });
  });
}
