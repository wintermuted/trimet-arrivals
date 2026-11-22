import { vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { getWalkingEstimates } from "../api/mapbox/walking";
import { StopData } from "../api/trimet/interfaces/types";
import NearbyStops from "../view/nearby/components/NearbyStops";

vi.mock("../api/mapbox/walking");

const stops: StopData = {
  location: [101, 102].map(locid => ({
    desc: `Example stop ${locid}`,
    dir: "E",
    lat: 0,
    lng: 0.001,
    locid,
    route: [
      {
        desc: "Example route",
        dir: [{ desc: "To Example Destination", dir: 0 }],
        route: 56,
        type: "bus"
      }
    ]
  })),
  queryTime: ""
};

describe("Nearby Stops card headers and shared marker highlights", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onStopHighlightChanged = vi.fn();

  beforeEach(() => {
    onStopHighlightChanged.mockReset();
    vi.mocked(getWalkingEstimates).mockReset().mockResolvedValue(new Map());
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(data = stops, radius = 1000, walkingEnabled = false) {
    act(() =>
      root.render(
        <MemoryRouter>
          <NearbyStops
            nearbyStops={data}
            radiusSize={radius}
            handleRadiusSelectionChange={vi.fn()}
            routeCount={1}
            stopCount={data.location.length}
            currentLocation={[0, 0]}
            onStopHighlightChanged={onStopHighlightChanged}
            walkingEnabled={walkingEnabled}
          />
          <button>Outside the stop cards</button>
        </MemoryRouter>
      )
    );
  }

  function hover(card: Element) {
    act(() =>
      card.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
    );
  }

  it("places the name before the ID in a single stop-header link while retaining route links", () => {
    render();
    const header = container.querySelector(".transit-nearby-stop-heading");
    const link = header.querySelector("a");
    expect(link.getAttribute("href")).toBe("/nearby/stops/101");
    expect(link.firstElementChild.textContent).toBe("Example stop 101");
    expect(link.lastElementChild.textContent).toBe("101");
    expect(header.querySelectorAll("a")).toHaveLength(1);
    expect(
      container.querySelector('[data-stop-id="101"]').querySelectorAll("a")
        .length
    ).toBeGreaterThan(1);
  });

  it("opens destination selection for the exact route, direction and boarding stop", () => {
    const data = {
      ...stops,
      location: [
        {
          ...stops.location[0],
          route: [
            {
              ...stops.location[0].route[0],
              dir: [
                { desc: "To East", dir: 0 },
                { desc: "To West", dir: 1 }
              ]
            },
            {
              ...stops.location[0].route[0],
              route: 12,
              dir: [{ desc: "To Downtown", dir: 1 }]
            }
          ]
        },
        stops.location[1]
      ]
    };
    function Destination() {
      const location = useLocation();
      return (
        <p data-destination>
          {location.pathname}
          {location.search}
        </p>
      );
    }
    act(() =>
      root.render(
        <MemoryRouter initialEntries={["/nearby/stops"]}>
          <Routes>
            <Route
              path="/nearby/stops"
              element={
                <NearbyStops
                  nearbyStops={data}
                  radiusSize={1000}
                  handleRadiusSelectionChange={vi.fn()}
                  routeCount={2}
                  stopCount={2}
                  currentLocation={[0, 0]}
                  onStopHighlightChanged={onStopHighlightChanged}
                />
              }
            />
            <Route path="/nearby/directions" element={<Destination />} />
          </Routes>
        </MemoryRouter>
      )
    );
    const card = container.querySelector('[data-stop-id="101"]');
    const actions = card.querySelectorAll(".transit-nearby-stop-route-go");
    expect(Array.from(actions).map(link => link.getAttribute("href"))).toEqual([
      "/nearby/directions?route=56&direction=0&from=101",
      "/nearby/directions?route=56&direction=1&from=101",
      "/nearby/directions?route=12&direction=1&from=101"
    ]);
    expect(actions[1].getAttribute("aria-label")).toBe(
      "Go on route 56, To West, from Example stop 101 (101)"
    );
    expect(
      container
        .querySelector('[data-stop-id="102"] .transit-nearby-stop-route-go')
        .getAttribute("href")
    ).toBe("/nearby/directions?route=56&direction=0&from=102");
    onStopHighlightChanged.mockClear();
    act(() => (actions[1] as HTMLElement).focus());
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(101);
    act(() => (actions[1] as HTMLElement).click());
    expect(container.querySelector("[data-destination]").textContent).toBe(
      "/nearby/directions?route=56&direction=1&from=101"
    );
  });

  it("highlights whole cards, restores keyboard focus after hover and retains it between card links", () => {
    render();
    const first = container.querySelector('[data-stop-id="101"]');
    const second = container.querySelector('[data-stop-id="102"]');
    const links = first.querySelectorAll("a");
    act(() => links[0].focus());
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(101);
    hover(second);
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(102);
    act(() =>
      second.dispatchEvent(
        new MouseEvent("mouseout", {
          bubbles: true,
          relatedTarget: document.body
        })
      )
    );
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(101);
    onStopHighlightChanged.mockClear();
    act(() => links[1].focus());
    expect(onStopHighlightChanged.mock.calls).toEqual([[101]]);
    act(() => container.querySelector("button").focus());
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(undefined);
  });

  it("clears stale highlights on data and radius changes and unmount", () => {
    render();
    hover(container.querySelector('[data-stop-id="101"]'));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(101);
    const remaining = { ...stops, location: stops.location.slice(1) };
    render(remaining);
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith();
    hover(container.querySelector('[data-stop-id="102"]'));
    render(remaining, 500);
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith();
    hover(container.querySelector('[data-stop-id="102"]'));
    act(() => root.render(null));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith();
  });

  function cardIds() {
    return Array.from(container.querySelectorAll("[data-stop-id]")).map(card =>
      Number(card.getAttribute("data-stop-id"))
    );
  }

  it("ranks by walking rather than straight-line distance, with unknown estimates last, without mutating stop data", async () => {
    const data = {
      ...stops,
      location: [340, 367, 103, 104, 105].map((locid, index) => ({
        ...stops.location[0],
        locid,
        lng: (index + 1) / 1000
      }))
    };
    vi.mocked(getWalkingEstimates).mockResolvedValue(
      new Map([
        [340, { status: "ready", meters: 800, seconds: 600 }],
        [367, { status: "ready", meters: 200, seconds: 180 }],
        [103, { status: "unreachable" }],
        [104, { status: "uncertain" }]
      ])
    );
    render(data);
    expect(getWalkingEstimates).not.toHaveBeenCalled();
    render(data, 1000, true);
    expect(container.textContent).toContain("Calculating walking distances...");
    await act(async () => {});
    expect(cardIds()).toEqual([367, 340, 103, 104, 105]);
    expect(data.location.map(stop => stop.locid)).toEqual([
      340, 367, 103, 104, 105
    ]);
    expect(
      container.querySelector('[data-stop-id="367"]').textContent
    ).toContain("656 ft walk");
    expect(
      container.querySelector('[data-stop-id="367"]').textContent
    ).toContain("About 3 min");
    expect(
      container.querySelector('[data-stop-id="103"]').textContent
    ).toContain("No walking route found");
    expect(
      container.querySelector('[data-stop-id="104"]').textContent
    ).toContain("Walking distance unavailable");
    const signal = vi.mocked(getWalkingEstimates).mock.calls[0][2];
    render(data);
    expect(signal.aborted).toBe(true);
    expect(cardIds()).toEqual([340, 367, 103, 104, 105]);
    expect(getWalkingEstimates).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("(straight-line)");
    expect(container.textContent).not.toContain("656 ft walk");
  });

  it("reports routing failures and retries without silently substituting straight-line ranks", async () => {
    vi
      .mocked(getWalkingEstimates)
      .mockRejectedValueOnce(new Error("Mapbox routing access is unavailable."))
      .mockResolvedValueOnce(
        new Map([
          [101, { status: "ready", meters: 200, seconds: 180 }],
          [102, { status: "ready", meters: 0, seconds: 0 }]
        ])
      );
    render(stops, 1000, true);
    await act(async () => {});
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "routing access is unavailable"
    );
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "not ranked by walking distance"
    );
    const retry = Array.from(container.querySelectorAll("button")).find(
      button => button.textContent === "Retry walking estimates"
    );
    await act(async () => retry.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(cardIds()).toEqual([102, 101]);
    expect(getWalkingEstimates).toHaveBeenCalledTimes(2);
    expect(
      container.querySelector('[data-stop-id="102"]').textContent
    ).toContain("0 ft walk");
  });
});
