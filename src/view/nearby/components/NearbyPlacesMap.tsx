import { Feature, FeatureCollection, Point } from "geojson";
import { GeoJSONSource, Map as MapboxMap, MapLayerMouseEvent, Popup } from "mapbox-gl";
import React, { useEffect, useRef } from "react";
import { CULTURE_PLACE_CATEGORIES, InterestPlace, PLACE_CATEGORIES, PLACE_INFO, PlaceCategory } from "../../../api/places/places";
import { createPlaceIconImage } from "../util/mapbox/placeIcons";

type PlaceProperties = { id: string; name: string };
const sourceId = (category: PlaceCategory) => `nearby-places-${category}`;
const layerIds = (category: PlaceCategory) => ["clusters", "counts", "points", "icons", "selection"].map(suffix => `${sourceId(category)}-${suffix}`);
export function placeFeatures(places: InterestPlace[], category: PlaceCategory): FeatureCollection<Point, PlaceProperties> {
  return {
    type: "FeatureCollection",
    features: places.filter(place => place.category === category).map(place => ({
      type: "Feature", geometry: { type: "Point", coordinates: place.coordinates },
      properties: { id: place.id, name: place.name }
    }))
  };
}

export default function NearbyPlacesMap({ map, places, selectedId, onSelect, onCoincident, onBounds, onError }: {
  map?: MapboxMap;
  places: InterestPlace[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onCoincident: (ids: string[]) => void;
  onBounds: (bounds: [number, number, number, number]) => void;
  onError: (error: boolean) => void;
}) {
  const latest = useRef({ places, selectedId, onSelect, onCoincident, onBounds, onError });
  latest.current = { places, selectedId, onSelect, onCoincident, onBounds, onError };
  const update = useRef<() => void>();
  useEffect(() => {
    if (!map) return;
    let active = true;
    const popup = new Popup({ closeButton: false, closeOnClick: false, focusAfterOpen: false, offset: 18,
      className: "transit-place-hover-popup" });
    let hoveredKey: string | undefined;
    function hidePreview() {
      hoveredKey = undefined;
      popup.remove();
      map.getCanvas().style.cursor = "";
    }
    function reportBounds() {
      const bounds = map.getBounds();
      if (bounds) latest.current.onBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
    }
    function refresh() {
      hidePreview();
      for (const category of PLACE_CATEGORIES) {
        const source = map.getSource(sourceId(category)) as GeoJSONSource | undefined;
        const data = placeFeatures(latest.current.places, category);
        source?.setData(data);
        // Hide empty categories even while Mapbox retains previously rendered tiles.
        for (const id of layerIds(category)) {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", data.features.length ? "visible" : "none");
        }
        const selection = layerIds(category)[4];
        if (map.getLayer(selection)) map.setFilter(selection, ["==", ["get", "id"], latest.current.selectedId || ""]);
      }
    }
    update.current = refresh;
    function install() {
      try {
        for (const category of PLACE_CATEGORIES) {
          const source = sourceId(category);
          const image = `${source}-icon`;
          const [clusters, counts, points, icons, selection] = layerIds(category);
          if (!map.hasImage(image)) map.addImage(image, createPlaceIconImage(category), { pixelRatio: 2 });
          if (map.getSource(source)) continue;
          const color = PLACE_INFO[category].color;
          map.addSource(source, {
            type: "geojson", data: placeFeatures(latest.current.places, category),
            cluster: true, clusterRadius: 45, clusterMaxZoom: 14,
            attribution: ["park", "community-garden", "public-restroom", "heritage-tree"].includes(category) ? "City of Portland, Bureau of Parks and Recreation" :
              ["farmers-market", "grocery-store", "reuse-repair", "csa-pickup"].includes(category) ? "City of Portland, Bureau of Planning and Sustainability" :
              category === "bicycle-parking" ? "City of Portland, Bureau of Transportation" :
              category === "food-cart-pod" || CULTURE_PLACE_CATEGORIES.includes(category) ? '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors (ODbL)</a>' :
                '<a href="https://rlisdiscovery.oregonmetro.gov/pages/open-database-license">Metro RLIS data (license)</a>'
          });
          map.addLayer({
            id: clusters, type: "circle", source, filter: ["has", "point_count"],
            paint: { "circle-color": color, "circle-radius": ["step", ["get", "point_count"], 23, 10, 27, 50, 32],
              "circle-stroke-width": 2, "circle-stroke-color": "#ffffff", "circle-emissive-strength": 1 }
          });
          map.addLayer({
            id: counts, type: "symbol", source, filter: ["has", "point_count"],
            layout: {
              "icon-image": image, "icon-size": 0.9, "icon-offset": [-12, 0], "icon-allow-overlap": true,
              "text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-anchor": "left",
              "text-offset": [0.35, 0], "text-allow-overlap": true, "icon-ignore-placement": true, "text-ignore-placement": true
            },
            paint: { "text-color": "#ffffff", "text-emissive-strength": 1 }
          });
          map.addLayer({
            id: points, type: "circle", source, filter: ["!", ["has", "point_count"]],
            paint: { "circle-color": color, "circle-radius": 13, "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2, "circle-emissive-strength": 1 }
          });
          map.addLayer({
            id: icons, type: "symbol", source, filter: ["!", ["has", "point_count"]],
            layout: { "icon-image": image, "icon-size": 1, "icon-allow-overlap": true, "icon-ignore-placement": true }
          });
          map.addLayer({
            id: selection, type: "circle", source, filter: ["==", ["get", "id"], latest.current.selectedId || ""],
            paint: { "circle-color": color, "circle-opacity": 0, "circle-radius": 18,
              "circle-stroke-color": color, "circle-stroke-width": 3, "circle-emissive-strength": 1 }
          });
        }
        latest.current.onError(false);
        refresh();
        reportBounds();
      } catch {
        latest.current.onError(true);
      }
    }
    async function click(event: MapLayerMouseEvent) {
      hidePreview();
      const layers = PLACE_CATEGORIES.flatMap(category => [layerIds(category)[0], layerIds(category)[2]])
        .filter(id => map.getLayer(id));
      const features = map.queryRenderedFeatures(event.point, { layers });
      if (!features.length) return;
      const feature = features[0];
      try {
        if (feature.properties?.cluster && feature.geometry.type === "Point") {
          const source = map.getSource(feature.source) as GeoJSONSource;
          const zoom = await new Promise<number>((resolve, reject) =>
            source.getClusterExpansionZoom(Number(feature.properties.cluster_id), (error, value) =>
              error ? reject(error) : resolve(value)));
          if (!active) return;
          if (zoom > map.getZoom() && map.getZoom() < map.getMaxZoom()) {
            map.easeTo({ center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]], zoom: Math.min(zoom, map.getMaxZoom()) });
          } else {
            const leaves = await new Promise<Feature[]>((resolve, reject) =>
              source.getClusterLeaves(Number(feature.properties.cluster_id), Number(feature.properties.point_count), 0,
                (error, value) => error ? reject(error) : resolve(value)));
            if (active) latest.current.onCoincident(leaves.map(leaf => String(leaf.properties.id)));
          }
          return;
        }
        const ids = [...new Set(features.filter(item => !item.properties?.cluster).map(item => String(item.properties.id)))];
        if (ids.length > 1) latest.current.onCoincident(ids);
        else latest.current.onSelect(ids[0]);
      } catch {
        if (active) latest.current.onError(true);
      }
    }
    function movePointer(event: MapLayerMouseEvent) {
      const layers = PLACE_CATEGORIES.flatMap(category => [layerIds(category)[0], layerIds(category)[2]]).filter(id => map.getLayer(id));
      const features = layers.length ? map.queryRenderedFeatures(event.point, { layers }) : [];
      const feature = features[0];
      if (!feature || feature.geometry.type !== "Point") {
        hidePreview();
        return;
      }
      map.getCanvas().style.cursor = "pointer";
      const key = `${feature.source}:${feature.properties.cluster_id ?? feature.properties.id}`;
      if (key === hoveredKey) return;
      const content = document.createElement("div");
      const title = document.createElement("strong");
      const description = document.createElement("p");
      if (feature.properties.cluster) {
        const category = PLACE_CATEGORIES.find(category => sourceId(category) === feature.source);
        if (!category) { hidePreview(); return; }
        title.textContent = `${feature.properties.point_count} ${PLACE_INFO[category].label.toLowerCase()}`;
        description.textContent = "Click to explore these places.";
      } else {
        const place = latest.current.places.find(place => place.id === feature.properties.id);
        if (!place) { hidePreview(); return; }
        title.textContent = place.name;
        description.textContent = PLACE_INFO[place.category].singular;
        if (place.address) description.append(document.createElement("br"), document.createTextNode(place.address));
        if (place.category === "farmers-market") description.append(document.createElement("br"),
          document.createTextNode("Schedules may be outdated; check before visiting."));
        if (place.category === "community-garden") description.append(document.createElement("br"),
          document.createTextNode("Plot access may require registration."));
        if (place.category === "public-restroom") description.append(document.createElement("br"),
          document.createTextNode("Availability is not live; closures or access restrictions may apply."));
        if (place.category === "heritage-tree") description.append(document.createElement("br"),
          document.createTextNode("May be on private land; view only from lawful public access."));
        if (place.category === "grocery-store") description.append(document.createElement("br"),
          document.createTextNode("Check the current location and opening hours."));
        if (place.category === "reuse-repair") description.append(document.createElement("br"),
          document.createTextNode("Confirm accepted items, appointments and access before visiting."));
        if (place.category === "csa-pickup") description.append(document.createElement("br"),
          document.createTextNode("Membership and arranged pickup may be required; not a public market."));
        if (place.category === "bicycle-parking") description.append(document.createElement("br"),
          document.createTextNode("Mapped rack, not live parking availability."));
        if (place.amenityType) description.append(document.createElement("br"),
          document.createTextNode(place.amenityStyle || place.amenityType));
        if (place.category === "drinking-fountain") description.append(document.createElement("br"),
          document.createTextNode("Water service and potability are not verified; some assets are dog bowls."));
        const hint = document.createElement("p");
        hint.textContent = "Click for details and trip planning.";
        content.append(hint);
      }
      content.prepend(title, description);
      const coordinates: [number, number] = [feature.geometry.coordinates[0], feature.geometry.coordinates[1]];
      while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
      popup.setLngLat(coordinates).setDOMContent(content).addTo(map);
      hoveredKey = key;
    }
    map.on("style.load", install);
    map.on("moveend", reportBounds);
    map.on("click", click);
    map.on("mousemove", movePointer);
    map.on("movestart", hidePreview);
    map.getCanvas().addEventListener("mouseleave", hidePreview);
    install();
    return () => {
      active = false;
      update.current = undefined;
      map.off("style.load", install);
      map.off("moveend", reportBounds);
      map.off("click", click);
      map.off("mousemove", movePointer);
      map.off("movestart", hidePreview);
      map.getCanvas().removeEventListener("mouseleave", hidePreview);
      hidePreview();
      for (const category of PLACE_CATEGORIES) {
        for (const id of layerIds(category).reverse()) if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(sourceId(category))) map.removeSource(sourceId(category));
        const image = `${sourceId(category)}-icon`;
        if (map.hasImage(image)) map.removeImage(image);
      }
    };
  }, [map]);
  useEffect(() => {
    try { update.current?.(); }
    catch { onError(true); }
  }, [places, selectedId]);
  return null;
}
