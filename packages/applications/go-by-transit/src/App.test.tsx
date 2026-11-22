import { vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import React from "react";
import App from "./App";

vi.mock("./store/store", async () => {
  const { createStore } = await vi.importActual<typeof import("redux")>("redux");
  const { default: reducers } = await vi.importActual<typeof import("./store/reducers")>("./store/reducers");
  return { default: () => createStore(reducers) };
});
vi.mock("./view/nearby/util/mapbox/initializeMap", () => ({
  initializeMap: vi.fn(() => { throw new Error("No WebGL in JSDOM"); })
}));
vi.mock("./api/trimet/stopCatalog", async () => ({
  ...(await vi.importActual<typeof import("./api/trimet/stopCatalog")>("./api/trimet/stopCatalog")),
  getStopCatalog: () => Promise.resolve({ stops: [] })
}));
vi.mock("./api/trimet/alerts", () => ({
  getSystemAlerts: () => Promise.resolve({ alert: [], queryTime: "" })
}));

it("renders the app navigation with its providers and routes", async () => {
  await act(async () => { render(<App />); });
  expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
});
