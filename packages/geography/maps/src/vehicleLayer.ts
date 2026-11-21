import { faBus, faTrain } from "@fortawesome/free-solid-svg-icons";
import { easeOutCubic, vehiclePoint } from "@trimet-arrivals/routing";
import { FeatureCollection, Point } from "geojson";
import { CameraOptions, GeoJSONSource, Map as MapboxMap, MapboxEvent } from "mapbox-gl";
import type { VehiclePosition } from "@trimet-arrivals/trimet-client";
import type { createVehicleTooltips } from "./vehicleTooltip";

const SOURCE = "nearby-vehicles";
const LAYERS = ["nearby-vehicle-badges", "nearby-vehicle-heading", "nearby-vehicle-icons", "nearby-vehicle-labels"];
const IMAGES = ["nearby-vehicle-bus-light", "nearby-vehicle-rail-light", "nearby-vehicle-bus-dark", "nearby-vehicle-rail-dark", "nearby-vehicle-arrow"];
const DURATION_MS = 1000;

export type VehicleFollowView = "north-up" | "chase";

export type VehicleTooltipFactory = (
  map: MapboxMap,
  layer: string,
  find: (id: string) => { vehicle: VehiclePosition; point: [number, number] } | undefined,
  onFollow: (vehicle: VehiclePosition) => void
) => ReturnType<typeof createVehicleTooltips>;

export interface VehicleLayerOptions {
  routeDisplay: Readonly<Record<number, string>>;
  createTooltips: VehicleTooltipFactory;
}

interface MovingVehicle {
  vehicle: VehiclePosition;
  from: [number, number];
  to: [number, number];
  started: number;
}

function vehicleImage(kind: "bus" | "rail" | "arrow", dark = false) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Vehicle symbols could not be drawn.");
  context.fillStyle = dark ? "#000000" : "#ffffff";
  if (kind === "arrow") {
    context.strokeStyle = "#173a54";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(32, 0);
    context.lineTo(39, 12);
    context.lineTo(25, 12);
    context.closePath();
    context.fill();
    context.stroke();
  } else {
    const [width, height, , , paths] = (kind === "bus" ? faBus : faTrain).icon;
    const scale = 36 / Math.max(width, height);
    context.translate((64 - width * scale) / 2, (64 - height * scale) / 2);
    context.scale(scale, scale);
    for (const path of typeof paths === "string" ? [paths] : paths) context.fill(new Path2D(path));
  }
  return context.getImageData(0, 0, 64, 64);
}

function glyphTone(color: string) {
  const channels = [1, 3, 5].map(offset => {
    const channel = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 0.179 ? "dark" : "light";
}

export function createVehicleLayer(
  map: MapboxMap,
  onError: (failed: boolean) => void,
  onFollow: (vehicle: VehiclePosition) => void,
  { routeDisplay, createTooltips }: VehicleLayerOptions
) {
  let positions = new Map<string, MovingVehicle>();
  let frame: number | undefined;
  let lastFrame = 0;
  let removed = false;
  let disposed = false;
  let following: Pick<VehiclePosition, "id" | "tripId"> | undefined;
  let followView: VehicleFollowView = "north-up";
  let savedCamera: CameraOptions | undefined;
  let northUpZoom: number;
  let lastHeading: number | undefined;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function trackCamera() {
    if (!following || removed || disposed) return;
    try {
      const target = positions.get(following.id);
      if (!target || !following.tripId || target.vehicle.tripId !== following.tripId || document.hidden) {
        map.stop();
        return;
      }
      const bearing = map.getBearing();
      lastHeading = target.vehicle.bearing ?? lastHeading ?? bearing;
      // Take the short turn across north rather than spinning through 360 degrees.
      const turn = (lastHeading - bearing + 540) % 360 - 180;
      map.easeTo({
        center: target.to,
        bearing: followView === "chase" ? bearing + turn : 0,
        pitch: followView === "chase" ? 60 : 0,
        zoom: followView === "chase" ? 17 : northUpZoom,
        offset: [0, followView === "chase" ? map.getContainer().clientHeight * 0.18 : 0],
        duration: motion.matches ? 0 : DURATION_MS,
        easing: easeOutCubic,
      });
    } catch {
      onError(true);
    }
  }

  function restoreCamera() {
    if (!savedCamera) return;
    const camera = savedCamera;
    savedCamera = undefined;
    lastHeading = undefined;
    if (!removed) {
      try { map.stop(); map.jumpTo(camera); } catch { onError(true); }
    }
  }

  function resized() { trackCamera(); }

  function userZoomed(event: MapboxEvent) {
    if (following && followView === "north-up" && "originalEvent" in event && event.originalEvent) {
      northUpZoom = map.getZoom();
    }
  }

  function data(now: number): FeatureCollection<Point> {
    return {
      type: "FeatureCollection",
      features: Array.from(positions.values()).map(moving => {
        const color = moving.vehicle.color || "#1559d1";
        const tone = glyphTone(color);
        return {
        type: "Feature", id: moving.vehicle.id,
        geometry: { type: "Point", coordinates: vehiclePoint(moving, now, DURATION_MS) },
        properties: {
          mode: moving.vehicle.type,
          ...(moving.vehicle.bearing === undefined ? {} : { bearing: moving.vehicle.bearing }),
          route: moving.vehicle.routeNumber
            ? routeDisplay[moving.vehicle.routeNumber] || String(moving.vehicle.routeNumber) : "",
          color,
          glyph: `nearby-vehicle-${moving.vehicle.type}-${tone}`,
          foreground: tone === "dark" ? "#000000" : "#ffffff",
        },
      }; }),
    };
  }

  function draw(now: number) {
    const source = map.getSource(SOURCE) as GeoJSONSource | undefined;
    source?.setData(data(now));
    tooltip.refresh();
  }

  function stop() {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
  }

  function animate(now: number) {
    frame = undefined;
    if (disposed || removed || document.hidden) return;
    try {
      if (now - lastFrame >= 1000 / 30) {
        draw(now);
        lastFrame = now;
      }
      if (Array.from(positions.values()).some(position => now - position.started < DURATION_MS)) {
        frame = requestAnimationFrame(animate);
      } else draw(now);
    } catch {
      onError(true);
    }
  }

  function settle() {
    stop();
    positions.forEach(moving => { moving.from = moving.to; });
    if (!removed && !disposed) {
      try { draw(performance.now()); } catch { onError(true); }
      trackCamera();
    }
  }

  function visibilityChanged() {
    if (document.hidden) { tooltip.hide(); settle(); }
  }

  function install() {
    if (removed || disposed) return;
    try {
      for (const kind of ["bus", "rail"] as const) {
        for (const tone of ["light", "dark"] as const) {
          const id = `nearby-vehicle-${kind}-${tone}`;
          if (!map.hasImage(id)) map.addImage(id, vehicleImage(kind, tone === "dark"), { pixelRatio: 2 });
        }
      }
      if (!map.hasImage(IMAGES[4])) map.addImage(IMAGES[4], vehicleImage("arrow"), { pixelRatio: 2 });
      if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: "geojson", data: data(performance.now()) });
      if (!map.getLayer(LAYERS[0])) {
        map.addLayer({
          id: LAYERS[0], type: "circle", source: SOURCE, slot: "top",
          paint: {
            "circle-radius": 12, "circle-color": ["get", "color"],
            "circle-stroke-color": "#ffffff", "circle-stroke-width": 2, "circle-emissive-strength": 1,
          },
        });
        map.addLayer({
          id: LAYERS[1], type: "symbol", source: SOURCE, slot: "top",
          filter: ["has", "bearing"],
          layout: {
            "icon-image": IMAGES[4], "icon-rotate": ["get", "bearing"],
            "icon-rotation-alignment": "map", "icon-allow-overlap": true, "icon-ignore-placement": true,
          },
          paint: { "icon-emissive-strength": 1 },
        });
        map.addLayer({
          id: LAYERS[2], type: "symbol", source: SOURCE, slot: "top",
          layout: {
            "icon-image": ["get", "glyph"],
            "icon-allow-overlap": true, "icon-ignore-placement": true,
          },
          paint: { "icon-emissive-strength": 1 },
        });
        map.addLayer({
          id: LAYERS[3], type: "symbol", source: SOURCE, slot: "top", minzoom: 13,
          layout: {
            "text-field": ["get", "route"], "text-size": 12, "text-anchor": "top",
            "text-offset": [0, 1.4], "text-padding": 5,
          },
          paint: {
            "text-color": ["get", "color"], "text-halo-color": ["get", "foreground"],
            "text-halo-width": 2, "text-emissive-strength": 1,
          },
        });
      }
      draw(performance.now());
      onError(false);
    } catch {
      clearLayers();
      onError(true);
    }
  }

  function clearLayers() {
    for (const layer of [...LAYERS].reverse()) if (map.getLayer(layer)) map.removeLayer(layer);
    if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    for (const image of IMAGES) if (map.hasImage(image)) map.removeImage(image);
  }

  function mapRemoved() {
    tooltip.dispose();
    removed = true;
    stop();
  }

  function captureCamera() {
    if (savedCamera) return;
    const center = map.getCenter();
    savedCamera = {
      center: [center.lng, center.lat], bearing: map.getBearing(),
      pitch: map.getPitch(), zoom: map.getZoom(),
    };
    northUpZoom = map.getZoom();
  }

  const tooltip = createTooltips(map, LAYERS[0], id => {
    const moving = positions.get(id);
    return moving && { vehicle: moving.vehicle, point: vehiclePoint(moving, performance.now(), DURATION_MS) };
  }, vehicle => {
    captureCamera();
    onFollow(vehicle);
  });
  map.on("style.load", install);
  map.on("remove", mapRemoved);
  map.on("resize", resized);
  map.on("zoomend", userZoomed);
  document.addEventListener("visibilitychange", visibilityChanged);
  motion.addEventListener("change", settle);
  install();

  return {
    openDetails: tooltip.openDetails,
    follow(selection?: Pick<VehiclePosition, "id" | "tripId">, view: VehicleFollowView = "north-up") {
      if (removed || disposed) return;
      if (!selection) {
        following = undefined;
        restoreCamera();
        return;
      }
      if (!following) captureCamera();
      if (following?.id !== selection.id || following?.tripId !== selection.tripId) lastHeading = undefined;
      if (view === "chase" && followView !== "chase") northUpZoom = map.getZoom();
      following = selection;
      followView = view;
      trackCamera();
    },
    update(vehicles: VehiclePosition[]) {
      if (disposed || removed) return;
      const now = performance.now();
      positions = new Map<string, MovingVehicle>(vehicles.map(vehicle => {
        const previous = positions.get(vehicle.id);
        if (previous && previous.vehicle.time > vehicle.time) return [vehicle.id, previous];
        if (previous && previous.vehicle.time === vehicle.time) return [vehicle.id, { ...previous, vehicle }];
        const to: [number, number] = [vehicle.longitude, vehicle.latitude];
        const from = previous ? vehiclePoint(previous, now, DURATION_MS) : to;
        // Large jumps and resumed tabs must not suggest a route we have not observed.
        const snap = !previous || motion.matches || document.hidden ||
          Math.hypot((from[0] - to[0]) * Math.cos(to[1] * Math.PI / 180), from[1] - to[1]) > 0.01;
        return [vehicle.id, { vehicle, from: snap ? to : from, to, started: snap ? now - DURATION_MS : now }];
      }));
      stop();
      animate(now);
      trackCamera();
    },
    dispose() {
      disposed = true;
      tooltip.dispose();
      stop();
      restoreCamera();
      positions.clear();
      map.off("style.load", install);
      map.off("remove", mapRemoved);
      map.off("resize", resized);
      map.off("zoomend", userZoomed);
      document.removeEventListener("visibilitychange", visibilityChanged);
      motion.removeEventListener("change", settle);
      if (!removed) clearLayers();
    },
  };
}
