// @ts-ignore
import mapboxgl, { Map } from "!mapbox-gl";
import { createThemedMap } from "./themedMap";

export function initializeMap(
  lng: number,
  lat: number,
  mapContainer: React.RefObject<HTMLElement>,
  zoom: number,
  interactive = true
): Map {
  mapboxgl.accessToken =
    "pk.eyJ1IjoiamFtZXNvbm55ZWhvbHQiLCJhIjoiY2p3NWoyamV0MTk1dDQ0cGNmdGZkenViMiJ9.TqDD3r62vlPzVgPnYjocsg";

  return createThemedMap({
    center: [lng, lat],
    container: mapContainer.current,
    zoom,
    interactive
  });
}
