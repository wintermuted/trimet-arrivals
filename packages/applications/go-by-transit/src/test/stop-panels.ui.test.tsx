import { vi } from "vitest";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DeparturesCard } from "../view/nearby/components/common/DeparturesCard";
import { StopsOnRoute } from "../view/nearby/components/common/StopsOnRoute";
import { getNearbyStops } from "../api/trimet/stops";
import { arrival1 } from "../api/trimet/fixture/arrival";
import { Arrival } from "../api/trimet/interfaces/arrivals";
import { ArrivalList } from "../view/nearby/components/NearbyStopArrivals";

vi.mock("../api/trimet/stops");

it("shows borderless stop departures in the route disclosure style and preserves links and collapsed state", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const earlier = { ...arrival1, id: "earlier", route: 54, locid: 123, dir: 0, shortSign: "Early", scheduled: 1000 };
  const later = { ...arrival1, id: "later", route: 56, locid: 123, dir: 1, shortSign: "Late", scheduled: 2000 };
  const render = (arrivals: Arrival[]) => act(async () => root.render(
    <MemoryRouter initialEntries={["/nearby/stops/123"]}>
      <Routes>
        <Route path="/nearby/stops/:id" element={
          <ArrivalList data={{ arrival: arrivals, detour: [], location: [], queryTime: "" }} />
        } />
      </Routes>
    </MemoryRouter>
  ));
  try {
    await render([later, earlier]);
    const panel = container.querySelector("details");
    const summary = panel.querySelector("summary");
    expect(panel.open).toBe(true);
    expect(panel.classList.contains("transit-simple-route-direction")).toBe(true);
    expect(panel.closest(".wm-card")).toBeNull();
    expect(summary.textContent).toContain("Departures");
    expect(summary.querySelector('.fa-caret-right[aria-hidden="true"]')).not.toBeNull();
    expect(panel.querySelector(".transit-stop-departures-list")).not.toBeNull();
    expect(panel.querySelector(".wm-list-item")).toBeNull();
    const links = Array.from(panel.querySelectorAll("li a"));
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining("Early"), expect.stringContaining("Late")
    ]);
    expect(links[0].getAttribute("href")).toBe("/nearby/simple-routes/54?stop=123&direction=0");
    act(() => summary.click());
    expect(panel.open).toBe(false);
    await render([earlier]);
    expect(panel.open).toBe(false);
    act(() => summary.click());
    expect(panel.open).toBe(true);
    expect(panel.querySelectorAll("li")).toHaveLength(1);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

it("filters stop departures by the selected routes and shows an empty state", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const first = { ...arrival1, id: "first", route: 54, shortSign: "First 54", scheduled: 1000 };
  const second = { ...arrival1, id: "second", route: 54, shortSign: "Second 54", scheduled: 3000 };
  const other = { ...arrival1, id: "other", route: 8, shortSign: "Route 8", scheduled: 2000 };
  const render = (arrivals: Arrival[], selectedRoutes: number[] = []) => act(async () => root.render(
    <MemoryRouter initialEntries={["/nearby/stops/123"]}>
      <Routes>
        <Route path="/nearby/stops/:id" element={
          <ArrivalList data={{ arrival: arrivals, detour: [], location: [], queryTime: "" }} selectedRoutes={selectedRoutes} />
        } />
      </Routes>
    </MemoryRouter>
  ));
  const departureText = () => Array.from(container.querySelectorAll("li a")).map(link => link.textContent);
  try {
    await render([second, other, first]);
    expect(departureText()).toEqual([
      expect.stringContaining("First 54"), expect.stringContaining("Route 8"), expect.stringContaining("Second 54")
    ]);
    await render([second, other, first], [54]);
    expect(departureText()).toEqual([expect.stringContaining("First 54"), expect.stringContaining("Second 54")]);
    await render([other], [54]);
    expect(container.querySelector('[role="status"]').textContent).toBe("No departures for the selected routes.");
    await render([other]);
    expect(departureText()).toEqual([expect.stringContaining("Route 8")]);
    await render([]);
    expect(container.querySelector('[role="status"]').textContent).toBe("No departures available.");
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

it("groups filtered departures by route without changing chronological order within each group", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const first = { ...arrival1, id: "first", route: 54, shortSign: "Early 54", scheduled: 1000 };
  const second = { ...arrival1, id: "second", route: 54, shortSign: "Late 54", scheduled: 3000 };
  const other = { ...arrival1, id: "other", route: 8, shortSign: "Route 8", scheduled: 2000 };
  const render = (selectedRoutes: number[] = []) => act(async () => root.render(
    <MemoryRouter initialEntries={["/nearby/stops/123"]}>
      <Routes>
        <Route path="/nearby/stops/:id" element={
          <ArrivalList data={{ arrival: [second, other, first], detour: [], location: [], queryTime: "" }}
            selectedRoutes={selectedRoutes} />
        } />
      </Routes>
    </MemoryRouter>
  ));
  try {
    await render();
    const panel = container.querySelector("details");
    const select = container.querySelector("select");
    expect(container.querySelector(`label[for="${select.id}"]`).textContent).toBe("Group by");
    expect(select.value).toBe("none");
    act(() => {
      select.value = "route";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(panel.open).toBe(true);
    const groups = () => Array.from(container.querySelectorAll(".transit-stop-departures-group"));
    expect(groups().map(group => group.querySelector("h4").textContent)).toEqual(["Route 8", "Route 54"]);
    expect(Array.from(groups()[1].querySelectorAll("li a")).map(link => link.textContent)).toEqual([
      expect.stringContaining("Early 54"), expect.stringContaining("Late 54")
    ]);
    await render([54]);
    expect(groups().map(group => group.querySelector("h4").textContent)).toEqual(["Route 54"]);
    act(() => panel.querySelector("summary").click());
    await render([8]);
    expect(panel.open).toBe(false);
    expect(select.value).toBe("route");
    act(() => panel.querySelector("summary").click());
    expect(groups().map(group => group.querySelector("h4").textContent)).toEqual(["Route 8"]);
    act(() => {
      select.value = "none";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(groups()).toHaveLength(0);
    expect(container.querySelectorAll(".transit-stop-departures-list li")).toHaveLength(1);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

function SelectableDepartures({ arrivals }: { arrivals: Arrival[] }) {
  const [id, setId] = useState<string>();
  const selected = arrivals.find(arrival => arrival.id === id) ?? arrivals[0];
  return <DeparturesCard filteredArrivals={arrivals} selectedArrival={selected} onSelect={arrival => setId(arrival.id)} />;
}

it("selects departures and retains selection by arrival ID across updates", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const later = { ...arrival1, id: "later", scheduled: arrival1.scheduled + 600000 };
  const render = (arrivals = [arrival1, later]) =>
    act(() => root.render(<SelectableDepartures arrivals={arrivals} />));
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

it("labels late, on-time, early, and scheduled-only departures without shifting the caret column", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const scheduled = 1800000000000;
  const arrivals = [
    { ...arrival1, id: "late", scheduled, estimated: scheduled + 120000 },
    { ...arrival1, id: "on-time", scheduled, estimated: scheduled },
    { ...arrival1, id: "early", scheduled, estimated: scheduled - 120000 },
    { ...arrival1, id: "scheduled", scheduled, estimated: null },
  ];
  try {
    act(() => root.render(<SelectableDepartures arrivals={arrivals} />));
    const buttons = Array.from(container.querySelectorAll(".transit-departure-option"));
    expect(buttons.map(button => button.querySelector(".wm-badge").textContent)).toEqual([
      expect.stringContaining("Late"),
      expect.stringContaining("On Time"),
      expect.stringContaining("Early"),
      expect.stringContaining("Scheduled")
    ]);
    expect(buttons.map(button => button.querySelector(".wm-badge").className)).toEqual([
      expect.stringContaining("wm-badge-danger"),
      expect.stringContaining("wm-badge-success"),
      expect.stringContaining("wm-badge-info"),
      expect.stringContaining("wm-badge-neutral")
    ]);
    expect(buttons.every(button => button.querySelector(".transit-departure-caret[aria-hidden='true']"))).toBe(true);
    expect(buttons[0].querySelector(".transit-departure-caret .fa-caret-right")).not.toBeNull();
    expect(buttons[1].querySelector(".transit-departure-caret .fa-caret-right")).toBeNull();
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
  vi.mocked(getNearbyStops).mockImplementation(() => new Promise(() => {}));
  function panels(remaining = stops) {
    return <>
      <SelectableDepartures arrivals={[arrival1]} />
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
