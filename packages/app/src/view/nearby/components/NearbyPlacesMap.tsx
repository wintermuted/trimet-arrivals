import React from "react";
import { PlacesMap, type PlacesMapProps } from "@trimet-arrivals/maps/places";
import { createPlaceIconImage } from "../util/mapbox/placeIcons";

export { placeFeatures } from "@trimet-arrivals/maps/places";

export default function NearbyPlacesMap(props: Omit<PlacesMapProps, "createIconImage">) {
  return <PlacesMap {...props} createIconImage={createPlaceIconImage} />;
}
