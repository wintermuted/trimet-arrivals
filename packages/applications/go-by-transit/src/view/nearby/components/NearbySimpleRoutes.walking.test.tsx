import { vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import { getRouteById } from "../../../api/trimet/routeConfig";
import { StopData, TrimetRoute } from "../../../api/trimet/interfaces/types";
import { getWalkingEstimates, WalkingEstimate } from "../../../api/mapbox/walking";
import NearbySimpleRoutes from "./NearbySimpleRoutes";
import {
  now, minute, route, stop, nearbyStops, arrival, response, CurrentLocation, BrowserHistory
} from "../../../test/fixtures/nearbySimpleRoutes";

vi.mock("../../../api/trimet/arrivals");
vi.mock("../../../api/trimet/routeConfig");
vi.mock("../../../api/mapbox/walking");

describe("NearbySimpleRoutes walking distances", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.mocked(getArrivals).mockReset();
    vi.mocked(getRouteById).mockReset();
    vi.mocked(getWalkingEstimates).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("only requests walking distances after consent and ranks by walking connections, not radial proximity", async () => {
    vi.mocked(getArrivals).mockResolvedValue(response([]));
    const walking = new Map<number, WalkingEstimate>([
      [101, { meters: 900, seconds: 600, status: "ready" }],
      [102, { meters: 100, seconds: 60, status: "ready" }],
      [103, { meters: 50, seconds: 40, status: "ready" }]
    ]);
    vi.mocked(getWalkingEstimates).mockResolvedValue(walking);
    const candidates = {
      ...nearbyStops,
      location: [...nearbyStops.location, { ...stop(103, 0.03), route: [{ ...route, route: 12 }] }]
    };
    function WalkingRoutes({ enabled }: { enabled: boolean }) {
      return (
        <NearbySimpleRoutes
          nearbyStops={candidates} currentLocation={[0, 0]} radiusSize={1000}
          handleSimpleRoutesOpened={vi.fn()} handleRadiusSelectionChange={vi.fn()}
          routeCount={2} stopCount={3} walkingEnabled={enabled}
        />
      );
    }
    await act(async () => root.render(<MemoryRouter><WalkingRoutes enabled={false} /></MemoryRouter>));
    expect(getWalkingEstimates).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Enable walking estimates");
    expect(container.textContent).toContain("(straight-line)");
    expect(container.querySelector(".transit-simple-route-heading strong").textContent).toBe("54");
    await act(async () => root.render(<MemoryRouter><WalkingRoutes enabled /></MemoryRouter>));
    expect(getWalkingEstimates).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".transit-simple-route-heading strong").textContent).toBe("12");
    const north = container.querySelector('[aria-labelledby="nearby-direction-54-0"]');
    expect(Array.from(north.querySelectorAll("[data-stop-id]")).map(link => link.getAttribute("data-stop-id"))).toEqual(["102", "101"]);
    expect(north.textContent).toContain("328 ft walk");
    await act(async () => root.render(<MemoryRouter><WalkingRoutes enabled={false} /></MemoryRouter>));
    expect(vi.mocked(getWalkingEstimates).mock.calls[0][2].aborted).toBe(true);
    expect(north.textContent).not.toContain("ft walk");
    expect(container.querySelector(".transit-simple-route-heading strong").textContent).toBe("54");
  });

  it("labels walking failures and retries without silently treating straight-line distances as walking", async () => {
    vi.mocked(getArrivals).mockResolvedValue(response([]));
    vi.mocked(getWalkingEstimates)
      .mockRejectedValueOnce(new Error("Mapbox walking request limit reached."))
      .mockResolvedValueOnce(new Map<number, WalkingEstimate>([
        [101, { status: "unreachable" }],
        [102, { meters: 100, seconds: 60, status: "ready" }]
      ]));
    await act(async () => root.render(
      <MemoryRouter>
        <NearbySimpleRoutes
          nearbyStops={nearbyStops} currentLocation={[0, 0]} radiusSize={1000}
          handleSimpleRoutesOpened={vi.fn()} handleRadiusSelectionChange={vi.fn()}
          routeCount={1} stopCount={2} walkingEnabled
        />
      </MemoryRouter>
    ));
    expect(container.querySelector('[role="alert"]').textContent).toContain("limit reached");
    expect(container.textContent).toContain("Walking distance unavailable");
    expect(container.textContent).toContain("(straight-line)");
    const retry = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Retry walking estimates");
    await act(async () => retry.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("No walking route found");
    expect(container.textContent).toContain("328 ft walk");
  });


});
