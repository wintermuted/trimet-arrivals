import { Map as MapboxMap, Marker, Popup } from "mapbox-gl";
import { useEffect } from "react";
import { InterestPlace } from "../../../api/places/places";
import { createPlaceIconElement } from "../util/mapbox/placeIcons";

export default function NearbyPlaceDestination({ map, place }: { map?: MapboxMap; place?: InterestPlace }) {
  useEffect(() => {
    if (!map || !place) return;
    const element = document.createElement("div");
    element.className = "transit-place-destination-marker";
    element.appendChild(createPlaceIconElement(place.category));
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", `${place.name}: approximate arrival point`);
    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 18 })
      .setText(`${place.name} - approximate arrival point`);
    const marker = new Marker({ element }).setLngLat(place.coordinates).setPopup(popup).addTo(map);
    map.easeTo({ center: place.coordinates });
    marker.togglePopup();
    return () => { popup.remove(); marker.remove(); };
  }, [map, place]);
  return null;
}
