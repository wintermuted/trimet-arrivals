import type { PlaceCategory } from "@trimet-arrivals/places/catalog";
import {
  createPlaceIconImage as createImage,
  createPlaceIconElement as createElement,
  placeIconDefinition as definition,
} from "@trimet-arrivals/maps/places";

export function placeIconDefinition(category: PlaceCategory) {
  return definition(category);
}

export function createPlaceIconImage(category: PlaceCategory): ImageData {
  return createImage(category);
}

export function createPlaceIconElement(category: PlaceCategory): SVGSVGElement {
  return createElement(category);
}
