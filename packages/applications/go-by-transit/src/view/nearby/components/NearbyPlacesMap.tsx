import React from "react";
import { PlacesMap, type PlacesMapProps } from "@overworld/maps/places";
import { createPlaceIconImage } from "../util/mapbox/placeIcons";

export { placeFeatures } from "@overworld/maps/places";

export default function NearbyPlacesMap(props: Omit<PlacesMapProps, "createIconImage">) {
  return <PlacesMap {...props} createIconImage={createPlaceIconImage} />;
}
