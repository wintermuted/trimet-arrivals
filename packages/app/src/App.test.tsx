import { act, render, screen } from "@testing-library/react";
import React from "react";
import App from "./App";

jest.mock("./store/store", () => ({
  __esModule: true,
  default: () => {
    const { createStore } = jest.requireActual("redux");
    return createStore(jest.requireActual("./store/reducers").default);
  }
}));
jest.mock("./view/nearby/util/mapbox/initializeMap", () => ({
  initializeMap: jest.fn(() => { throw new Error("No WebGL in JSDOM"); })
}));
jest.mock("./api/trimet/stopCatalog", () => ({
  ...jest.requireActual("./api/trimet/stopCatalog"),
  getStopCatalog: () => Promise.resolve({ stops: [] })
}));
jest.mock("./api/trimet/alerts", () => ({
  getSystemAlerts: () => Promise.resolve({ alert: [], queryTime: "" })
}));

it("renders the app navigation with its providers and routes", async () => {
  await act(async () => { render(<App />); });
  expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
});
