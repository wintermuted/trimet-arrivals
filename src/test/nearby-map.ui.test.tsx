import React, { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import NearbyMapV2 from "../view/nearby/components/NearbyMapV2";

it("resizes the map when its available panel changes and disposes it on unmount", () => {
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
  const remove = jest.fn();
  const initializeMap = jest.fn(() => {
    expect(mapContainerRef.current).not.toBeNull();
  });

  try {
    act(() =>
      root.render(
        <NearbyMapV2
          mapRef={{ current: { resize, remove } }}
          mapContainerRef={mapContainerRef}
          initializeMap={initializeMap}
          onSearchArea={jest.fn()}
          onDropPin={jest.fn()}
          onFindMe={jest.fn()}
          isLocating={false}
          searchMode="device"
        />
      )
    );
    expect(initializeMap).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(mapContainerRef.current);
    const metadata = container.querySelector(".sidebar");
    expect(mapContainerRef.current.nextElementSibling).toBe(metadata);
    expect(metadata.textContent).toContain("Searching near your location.");
    expect(metadata.textContent).not.toContain("Longitude");
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
