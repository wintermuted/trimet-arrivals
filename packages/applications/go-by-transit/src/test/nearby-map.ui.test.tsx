import { vi } from "vitest";
import React, { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import NearbyMapV2 from "../view/nearby/components/NearbyMapV2";

it("resizes the map when its available panel changes and disposes it on unmount", () => {
  const originalResizeObserver = window.ResizeObserver;
  const observe = vi.fn();
  const disconnect = vi.fn();
  let notifyResize: () => void;
  window.ResizeObserver = vi.fn().mockImplementation(function (callback) {
    notifyResize = callback;
    return { observe, disconnect };
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const mapContainerRef = createRef<HTMLDivElement>();
  const resize = vi.fn();
  const remove = vi.fn();
  const onRadiusChange = vi.fn();
  const onVehiclesToggle = vi.fn();
  const initializeMap = vi.fn(() => {
    expect(mapContainerRef.current).not.toBeNull();
  });

  try {
    act(() =>
      root.render(
        <NearbyMapV2
          mapRef={{ current: { resize, remove } }}
          mapContainerRef={mapContainerRef}
          initializeMap={initializeMap}
          onSearchArea={vi.fn()}
          onDropPin={vi.fn()}
          onFindMe={vi.fn()}
          radiusSize={1000}
          onRadiusChange={onRadiusChange}
          isLocating={false}
          isMapLoading={false}
          searchMode="device"
          vehiclesEnabled={true}
          onVehiclesToggle={onVehiclesToggle}
          vehicleFeed={{ vehicles: [], rejected: 0, status: "empty" }}
          vehicleMapError={false}
          onVehiclesRetry={vi.fn()}
        />
      )
    );
    expect(initializeMap).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(mapContainerRef.current);
    const toolbar = container.querySelector(".transit-nearby-map-controls");
    expect(mapContainerRef.current.parentElement.nextElementSibling).toBe(toolbar);
    expect(toolbar.textContent).toContain("Near me");
    const radius = container.querySelector<HTMLSelectElement>('[aria-label="Search radius"]');
    expect(radius.value).toBe("1000");
    act(() => {
      radius.value = "500";
      radius.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onRadiusChange).toHaveBeenCalledTimes(1);
    expect(toolbar.querySelectorAll(".transit-map-control-button")).toHaveLength(3);
    const vehicles = container.querySelector<HTMLButtonElement>(".transit-map-vehicles-toggle");
    expect(vehicles.getAttribute("aria-pressed")).toBe("true");
    act(() => vehicles.click());
    expect(onVehiclesToggle).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("No vehicles in this view.");
    act(() => notifyResize());
    expect(resize).toHaveBeenCalledTimes(1);
    act(() => root.render(null));
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    container.remove();
    window.ResizeObserver = originalResizeObserver;
  }
});
