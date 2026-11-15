import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { DeparturesCard } from "../view/nearby/components/common/DeparturesCard";
import { StopsOnRoute } from "../view/nearby/components/common/StopsOnRoute";
import { getNearbyStops } from "../api/trimet/stops";
import { arrival1 } from "../api/trimet/fixture/arrival";

jest.mock("../api/trimet/stops");

it("selects departures and retains selection by arrival ID across updates", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const later = { ...arrival1, id: "later", scheduled: arrival1.scheduled + 600000 };
  const render = (arrivals = [arrival1, later]) =>
    act(() => root.render(<DeparturesCard filteredArrivals={arrivals} />));
  const buttons = () => Array.from(container.querySelectorAll("button"));
  try {
    render();
    expect(buttons().map(button => button.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
    act(() => buttons()[1].click());
    expect(buttons().map(button => button.getAttribute("aria-pressed"))).toEqual(["false", "true"]);
    expect(buttons()[1].querySelector(".fa-caret-right")).not.toBeNull();
    render([{ ...later }, { ...arrival1 }]);
    expect(buttons().map(button => button.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
    render([arrival1]);
    expect(buttons()[0].getAttribute("aria-pressed")).toBe("true");
    render([]);
    expect(buttons()).toHaveLength(0);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

it("keeps the icon-labeled panels independent and preserves contents and collapsed state on updates", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const stops = [
    { locid: 101, seq: 1, desc: "First stop", dir: "E", tp: true, lat: 0, lng: 0 },
    { locid: 102, seq: 2, desc: "Second stop", dir: "E", tp: true, lat: 1, lng: 1 }
  ];
  // Keep enrichment pending: the test exercises the disclosures, not nearby routes.
  jest.mocked(getNearbyStops).mockImplementation(() => new Promise(() => {}));
  function panels(remaining = stops) {
    return <>
      <DeparturesCard filteredArrivals={[arrival1]} />
      <StopsOnRoute remainingStopsOnRoute={remaining} />
    </>;
  }
  try {
    await act(async () => root.render(panels()));
    const [departures, stopPanel] = Array.from(container.querySelectorAll("details"));
    expect(departures.open).toBe(true);
    expect(stopPanel.open).toBe(true);
    expect(departures.querySelector("summary").textContent).toContain("Departures");
    expect(stopPanel.querySelector("summary").textContent).toContain("Stops");
    expect(departures.querySelector('summary .fa-clock-o[aria-hidden="true"]')).not.toBeNull();
    expect(stopPanel.querySelector('summary .fa-map-marker[aria-hidden="true"]')).not.toBeNull();
    act(() => departures.querySelector("summary").click());
    expect(departures.open).toBe(false);
    expect(stopPanel.open).toBe(true);
    act(() => stopPanel.querySelector("summary").click());
    expect(stopPanel.open).toBe(false);
    await act(async () => root.render(panels(stops.slice(1))));
    expect(departures.open).toBe(false);
    expect(stopPanel.open).toBe(false);
    expect(stopPanel.textContent).not.toContain("First stop");
    expect(stopPanel.textContent).toContain("Second stop");
    act(() => departures.querySelector("summary").click());
    expect(departures.open).toBe(true);
    expect(departures.querySelector("li")).not.toBeNull();
    expect(stopPanel.open).toBe(false);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
