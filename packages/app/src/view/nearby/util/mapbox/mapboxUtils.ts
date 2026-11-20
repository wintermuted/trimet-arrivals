// @ts-ignore
// tslint:disable-next-line:no-implicit-dependencies
import mapboxgl from "!mapbox-gl";
import { LatLngCoords } from "../../components/NearbyMapV2";
import { createThemedMap } from "./themedMap";

export function mountMapCenteredOnLocation(
  mapContainer: HTMLDivElement,
  currentLocation: LatLngCoords
) {
  mapboxgl.accessToken =
    "pk.eyJ1IjoiamFtZXNvbm55ZWhvbHQiLCJhIjoiY2p3NWoyamV0MTk1dDQ0cGNmdGZkenViMiJ9.TqDD3r62vlPzVgPnYjocsg";

  return createThemedMap({
    center: [currentLocation[0], currentLocation[1]], // starting position [lng, lat]
    container: mapContainer, // container ID
    zoom: 16 // starting zoom
  });
}
