import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { getWalkingRoute, WalkingRoute } from "../api/mapbox/walking";
import WalkingAccess from "../view/nearby/components/WalkingAccess";

jest.mock("../api/mapbox/walking");

const stop = { lat: 0.001, lng: 0.001, locid: 340 };
const walkingRoute: WalkingRoute = {
  feature: {
    geometry: {
      coordinates: [
        [0, 0],
        [0, 0.001],
        [0.001, 0.001],
      ],
      type: "LineString",
    },
    properties: {},
    type: "Feature",
  },
  meters: 250,
  seconds: 180,
  status: "ready",
};

describe("walking access to the selected boarding stop", () => {
  let container: HTMLDivElement;
  let root: Root;
  const close = jest.fn();
  const onRouteChanged = jest.fn(() => close);
  const props = {
    currentLocation: [0, 0],
    enabled: true,
    onRouteChanged,
    stop,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    onRouteChanged.mockReturnValue(close);
    jest.mocked(getWalkingRoute).mockReset().mockResolvedValue(walkingRoute);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("requires consent before routing and removes the walking overlay when disabled", async () => {
    await act(async () =>
      root.render(<WalkingAccess {...props} enabled={false} />)
    );
    expect(getWalkingRoute).not.toHaveBeenCalled();
    expect(container.textContent).toBe("");
    await act(async () => root.render(<WalkingAccess {...props} />));
    expect(onRouteChanged).toHaveBeenCalledWith(
      walkingRoute.status === "ready" ? walkingRoute.feature : undefined
    );
    expect(container.textContent).toContain("About 3 min");
    expect(container.textContent).toContain("dashed green line");
    await act(async () =>
      root.render(<WalkingAccess {...props} enabled={false} />)
    );
    expect(close).toHaveBeenCalledTimes(1);
    expect(jest.mocked(getWalkingRoute).mock.calls[0][2].aborted).toBe(true);
  });

  it("ignores a late response from a previous location", async () => {
    let resolveRoute: (route: WalkingRoute) => void;
    jest.mocked(getWalkingRoute).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRoute = resolve;
        })
    );
    await act(async () => root.render(<WalkingAccess {...props} />));
    const oldSignal = jest.mocked(getWalkingRoute).mock.calls[0][2];
    expect(container.textContent).toContain("Calculating walk...");
    await act(async () =>
      root.render(<WalkingAccess {...props} currentLocation={[0.001, 0]} />)
    );
    expect(oldSignal.aborted).toBe(true);
    expect(onRouteChanged).toHaveBeenCalledTimes(1);
    await act(async () => resolveRoute({ status: "unreachable" }));
    expect(container.textContent).toContain("About 3 min");
    expect(onRouteChanged).toHaveBeenCalledTimes(1);
  });

  it("offers explicit retry after a routing error and never draws an unreachable route", async () => {
    jest
      .mocked(getWalkingRoute)
      .mockRejectedValueOnce(new Error("Mapbox routing access is unavailable."))
      .mockResolvedValueOnce({ status: "unreachable" });
    await act(async () => root.render(<WalkingAccess {...props} />));
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "routing access"
    );
    expect(container.textContent).toContain("(straight-line)");
    const retry = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Retry walking directions"
    );
    await act(async () => retry.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("No walking route found");
    expect(onRouteChanged).not.toHaveBeenCalled();
  });

  it("explains an unreliable walking-path snap without claiming an accessible route", async () => {
    jest.mocked(getWalkingRoute).mockResolvedValue({ status: "uncertain" });
    await act(async () => root.render(<WalkingAccess {...props} />));
    expect(container.textContent).toContain(
      "could not match this location reliably"
    );
    expect(container.textContent).toContain("Walking distance unavailable");
    expect(onRouteChanged).not.toHaveBeenCalled();
  });
});
