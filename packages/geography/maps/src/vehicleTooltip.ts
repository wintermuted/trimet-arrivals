import { Map as MapboxMap, MapLayerMouseEvent, MapMouseEvent, Popup } from "mapbox-gl";
import type { VehiclePosition } from "@trimet-arrivals/trimet-client";
import type { VehicleRouteDetails } from "./transitTypes";

interface RouteDetails {
  name: string;
  directions: Map<number, string>;
}

export function createVehicleTooltips(
  map: MapboxMap,
  layer: string,
  find: (id: string) => { vehicle: VehiclePosition; point: [number, number] } | undefined,
  onFollow: (vehicle: VehiclePosition) => void,
  { routeDisplay, getRouteById }: VehicleRouteDetails
) {
  // Mapbox releases the canvas before notifying remove listeners.
  const canvas = map.getCanvas();
  const popup = new Popup({
    className: "transit-vehicle-popup", closeButton: true, closeOnClick: false,
    focusAfterOpen: false, offset: 18, maxWidth: "280px",
  });
  const routes = new Map<number, RouteDetails>();
  let active: string | undefined;
  let pinned = false;
  let rendered: VehiclePosition | undefined;
  let controller: AbortController | undefined;
  let routeFailed = false;
  let routePending = false;
  let cursor: string | undefined;
  let popupElement: HTMLElement | undefined;
  let returnFocus: HTMLElement | undefined;
  const closeSelector = ".mapboxgl-popup-close-button";
  const followSelector = ".transit-vehicle-follow";

  function content(vehicle: VehiclePosition) {
    const root = document.createElement("div");
    root.setAttribute("role", pinned ? "group" : "tooltip");
    if (pinned) root.setAttribute("aria-label", "Vehicle details");
    const heading = document.createElement("strong");
    heading.textContent = `${vehicle.type === "bus" ? "Bus" : "Train"} ${vehicle.id}`;
    root.appendChild(heading);
    const details = vehicle.routeNumber && routes.get(vehicle.routeNumber);
    const rows = document.createElement("dl");
    const row = (label: string, value: string) => {
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      rows.append(term, description);
    };
    const knownName = vehicle.routeNumber && routeDisplay[vehicle.routeNumber];
    row("Route", details ? details.name : knownName ||
      (vehicle.routeNumber ? `Route ${vehicle.routeNumber}` : "Not reported"));
    const direction = details && details.directions.get(vehicle.direction);
    row("Direction", direction || (vehicle.direction === undefined ? "Not reported" :
      `${vehicle.direction}${routeFailed ? " (route details unavailable)" : routePending ? " (loading description...)" : " (description not reported)"}`));
    row("Trip", vehicle.tripId || "Not reported");
    if (vehicle.destination) row("Destination sign", vehicle.destination);
    row("Position reported", new Date(vehicle.time).toLocaleTimeString([], {
      hour: "numeric", minute: "2-digit", second: "2-digit",
    }));
    if (routeFailed) row("Route details", "Unavailable. Hover again to retry.");
    root.appendChild(rows);
    if (pinned) {
      const follow = document.createElement("button");
      follow.type = "button";
      follow.className = "wm-btn wm-btn-primary wm-btn-sm transit-vehicle-follow";
      follow.textContent = "Follow trip";
      follow.disabled = !vehicle.tripId || !vehicle.blockId;
      follow.addEventListener("click", () => { returnFocus = undefined; hide(); onFollow(vehicle); });
      root.appendChild(follow);
      if (follow.disabled) {
        const note = document.createElement("p");
        note.textContent = "Trip tracking is unavailable because its trip or block ID was not reported.";
        root.appendChild(note);
      }
    } else {
      const hint = document.createElement("small");
      hint.textContent = "Click the vehicle for trip actions.";
      root.appendChild(hint);
    }
    return root;
  }

  function refresh() {
    if (active === undefined) return;
    const target = find(active);
    if (!target) {
      hide();
      return;
    }
    popup.setLngLat(target.point);
    if (rendered !== target.vehicle) {
      const focused = document.activeElement;
      const focusedControl = popupElement?.contains(focused) &&
        (focused.matches(followSelector) ? followSelector : focused.matches(closeSelector) ? closeSelector : undefined);
      rendered = target.vehicle;
      const next = content(target.vehicle);
      popup.setDOMContent(next);
      if (focusedControl) {
        const replacement = focusedControl === followSelector && next.querySelector<HTMLButtonElement>(`${followSelector}:enabled`);
        (replacement || popupElement.querySelector<HTMLElement>(closeSelector))?.focus({ preventScroll: true });
      }
    }
  }

  function hide() {
    active = undefined;
    pinned = false;
    rendered = undefined;
    controller?.abort();
    controller = undefined;
    routePending = false;
    popup.remove();
    if (cursor !== undefined) {
      canvas.style.cursor = cursor;
      cursor = undefined;
    }
  }

  function show(id: string, pin = false, opener?: HTMLElement) {
    if (pinned && !pin) return;
    const target = find(id);
    if (!target) return;
    if (active === id) {
      pinned = pin;
      rendered = undefined;
      refresh();
      popup.getElement().classList.toggle("transit-vehicle-popup-sticky", pinned);
      if (opener) focusDetails(opener);
      return;
    }
    hide();
    active = id;
    pinned = pin;
    cursor = canvas.style.cursor;
    canvas.style.cursor = "pointer";
    routeFailed = false;
    const route = target.vehicle.routeNumber;
    routePending = Boolean(route && !routes.has(route));
    refresh();
    popup.addTo(map);
    popupElement = popup.getElement();
    popupElement.classList.toggle("transit-vehicle-popup-sticky", pinned);
    popupElement.addEventListener("keydown", escape);
    if (opener) focusDetails(opener);
    if (!routePending) return;
    controller = new AbortController();
    const signal = controller.signal;
    void getRouteById(route, signal).then(result => {
      if (signal.aborted) return;
      const matched = result?.route?.find(entry => entry.route === route);
      if (result?.errorMessage || !matched || typeof matched.desc !== "string" || !Array.isArray(matched.dir)) {
        throw new Error("Vehicle route details are unavailable.");
      }
      routes.set(route, {
        name: matched.desc,
        directions: new Map(matched.dir.filter(direction =>
          Number.isInteger(direction.dir) && typeof direction.desc === "string"
        ).map(direction => [direction.dir, direction.desc])),
      });
      routePending = false;
      rendered = undefined;
      refresh();
    }).catch(() => {
      if (signal.aborted) return;
      routeFailed = true;
      routePending = false;
      rendered = undefined;
      refresh();
    });
  }

  function focusDetails(opener: HTMLElement) {
    returnFocus = opener;
    (popupElement?.querySelector<HTMLElement>(`${followSelector}:enabled`) ||
      popupElement?.querySelector<HTMLElement>(closeSelector))?.focus({ preventScroll: true });
  }

  function escape(event: KeyboardEvent) {
    if (event.key === "Escape") hide();
  }

  function showFeature(event: MapLayerMouseEvent, pin: boolean) {
    const id = event.features?.[0]?.id;
    if (id !== undefined) show(String(id), pin);
  }
  function hover(event: MapLayerMouseEvent) { showFeature(event, false); }
  function pin(event: MapLayerMouseEvent) { showFeature(event, true); }
  function leave() { if (!pinned) hide(); }
  function backgroundClick(event: MapMouseEvent) {
    if (active !== undefined && (!map.getLayer(layer) ||
        !map.queryRenderedFeatures(event.point, { layers: [layer] }).length)) hide();
  }

  popup.on("close", () => {
    popupElement?.removeEventListener("keydown", escape);
    popupElement = undefined;
    const opener = returnFocus;
    returnFocus = undefined;
    if (opener?.isConnected && document.activeElement === document.body) opener.focus({ preventScroll: true });
    active = undefined;
    pinned = false;
    rendered = undefined;
    controller?.abort();
    if (cursor !== undefined) canvas.style.cursor = cursor;
    cursor = undefined;
  });
  map.on("mouseenter", layer, hover);
  map.on("mousemove", layer, hover);
  map.on("mouseleave", layer, leave);
  map.on("click", layer, pin);
  map.on("click", backgroundClick);
  canvas.addEventListener("keydown", escape);

  return {
    openDetails: (id: string, opener: HTMLElement) => show(id, true, opener),
    refresh,
    hide,
    dispose() {
      hide();
      routes.clear();
      map.off("mouseenter", layer, hover);
      map.off("mousemove", layer, hover);
      map.off("mouseleave", layer, leave);
      map.off("click", layer, pin);
      map.off("click", backgroundClick);
      canvas.removeEventListener("keydown", escape);
    },
  };
}
