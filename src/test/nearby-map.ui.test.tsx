import React, { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import NearbyMapV2 from "../view/nearby/components/NearbyMapV2";

it("resizes the map when its available panel changes and disconnects on unmount", () => {
  const originalResizeObserver = window.ResizeObserver;
  const observe = jest.fn();
  const disconnect = jest.fn();
  let notifyResize: () => void;
  window.ResizeObserver = jest.fn().mockImplementation(callback => {
    notifyResize = callback;
    return { observe, disconnect };
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const mapContainerRef = createRef<HTMLDivElement>();
  const resize = jest.fn();
  const initializeMap = jest.fn(() => {
    expect(mapContainerRef.current).not.toBeNull();
  });

  try {
    act(() =>
      root.render(
        <NearbyMapV2
          zoom={12}
          currentLocation={[0, 0]}
          mapRef={{ current: { resize } }}
          mapContainerRef={mapContainerRef}
          initializeMap={initializeMap}
        />
      )
    );
    expect(initializeMap).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(mapContainerRef.current);
    act(() => notifyResize());
    expect(resize).toHaveBeenCalledTimes(1);
    act(() => root.render(null));
    expect(disconnect).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    container.remove();
    window.ResizeObserver = originalResizeObserver;
  }
});
