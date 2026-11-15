import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Arrival } from "../api/trimet/interfaces/arrivals";
import { StopLocation, TrimetRoute } from "../api/trimet/interfaces/types";
import RouteListItem from "../component/route/RouteListItem";
import ArrivalListItem from "../view/nearby/components/common/ArrivalListItem";
import SimpleArrivalListItem from "../view/nearby/components/common/SimpleArrivalListItem";
import RouteStopInfo from "../view/nearby/components/common/RouteStopInfo";

const route: TrimetRoute = {
  route: 54,
  desc: "Beaverton-Hillsdale Highway",
  type: "B",
  dir: [{ dir: 1, desc: "To Beaverton" }]
};
const stop: StopLocation = {
  locid: 368,
  desc: "SW Broadway & Main",
  dir: "Eastbound",
  lat: 45.52,
  lng: -122.68
};
const arrival: Arrival = {
  id: "arrival-54",
  locid: stop.locid,
  dir: 1,
  route: route.route,
  scheduled: 1800000000000,
  estimated: 1800000060000,
  shortSign: "54 Beaverton",
  feet: 500,
  status: "estimated",
  tripID: "trip-54",
  vehicleID: "vehicle-54",
  blockID: 54,
  departed: false,
  detoured: false,
  fullSign: "54 To Beaverton",
  newTrip: false,
  piece: "",
  dropOffOnly: false,
  blockPosition: null,
  inCongestion: false
};

describe("accessible transit detail links", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(children: React.ReactNode) {
    act(() => root.render(<MemoryRouter>{children}</MemoryRouter>));
  }

  it("preserves route, stop, and direction in both arrival views", () => {
    render(
      <ul>
        <ArrivalListItem id={368} arrival={arrival} />
        <SimpleArrivalListItem
          id={368}
          arrival={arrival}
          route={route}
          stop={stop}
        />
      </ul>
    );
    const links = Array.from(container.querySelectorAll("li > a"));
    expect(links).toHaveLength(2);
    expect(links.map(link => link.getAttribute("href"))).toEqual([
      "/nearby/simple-routes/54?stop=368&direction=1",
      "/nearby/simple-routes/54?stop=368&direction=1"
    ]);
    expect(links[0].textContent).toContain("54 Beaverton");
    expect(links[1].textContent).toContain(stop.desc);
  });

  it("keeps full simple-route descriptions available when visually truncated", () => {
    const direction = "To Example Destination With A Very Long Route Direction";
    const stopName = "Example Stop With A Very Long Descriptive Name";
    render(
      <SimpleArrivalListItem
        id={stop.locid}
        arrival={arrival}
        route={{ ...route, dir: [{ dir: 1, desc: direction }] }}
        stop={{ ...stop, desc: stopName }}
      />
    );
    const link = container.querySelector("a");
    const description = link.querySelector(".transit-arrival-heading span");
    const stopDescription = link.querySelector("small");
    expect(description.textContent).toBe(direction);
    expect(description.getAttribute("title")).toBe(direction);
    expect(stopDescription.textContent).toBe(`at ${stopName} (${stop.locid})`);
    expect(stopDescription.getAttribute("title")).toBe(
      `at ${stopName} (${stop.locid})`
    );
    expect(link.getAttribute("href")).toBe(
      "/nearby/simple-routes/54?stop=368&direction=1"
    );
  });

  it("groups stop actions while preserving the stop link and Go navigation", () => {
    render(
      <>
        <RouteStopInfo
          shortSign="To Beaverton"
          stopLocation={{ ...stop, id: 368 }}
        />
        <Routes>
          <Route path="/nearby/directions" element={<p>Directions opened</p>} />
          <Route path="*" element={null} />
        </Routes>
      </>
    );
    expect(container.querySelector("a").getAttribute("href")).toBe(
      "/nearby/stops/368"
    );
    const actions = container.querySelector(
      '[role="group"][aria-label="Stop actions"]'
    );
    const buttons = actions.querySelectorAll("button");
    expect(
      Array.from(buttons).map(button => button.getAttribute("aria-label"))
    ).toEqual(["Go from this stop", "Bookmark this route"]);
    buttons.forEach(button => {
      expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
    });
    act(() => buttons[0].click());
    expect(container.textContent).toContain("Directions opened");
  });

  it("renders one valid route link rather than nested links in route cards", () => {
    render(<RouteListItem route={route} />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/lines/54");
    expect(container.querySelector("a a")).toBeNull();
  });
});
