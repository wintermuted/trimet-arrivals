// tslint:disable-next-line:no-submodule-imports
import { ThemeProvider } from "@wintermuted/ui-theme/react";
import React, { act } from "react";
// tslint:disable-next-line:no-submodule-imports
import { createRoot, Root } from "react-dom/client";
import { fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  buildStopCatalog,
  getStopCatalog,
} from "../../api/trimet/stopCatalog";
import { TrimetRoute } from "../../api/trimet/interfaces/routes";
import StopCatalogView from "./StopCatalogView";

jest.mock("../../api/trimet/stopCatalog", () => {
  const actual = jest.requireActual("../../api/trimet/stopCatalog");
  return { ...actual, getStopCatalog: jest.fn() };
});

const loadCatalog = jest.mocked(getStopCatalog);

function testCatalog() {
  return buildStopCatalog({
    route: [
      {
        desc: "Route 1",
        dir: [
          {
            desc: "Outbound",
            dir: 0,
            stop: [
              {
                desc: "Central Transit Center",
                dir: "N",
                lat: 45,
                lng: -122,
                locid: 12345,
                seq: 1,
                tp: false,
              },
            ],
          },
          { desc: "Inbound", dir: 1 } as TrimetRoute["dir"][number],
        ],
        id: 1,
        route: 1,
        routeColor: "000000",
        routeSortOrder: 1,
        type: "B",
      },
    ],
  });
}

describe("StopCatalogView", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    loadCatalog.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render() {
    act(() =>
      root.render(
        <ThemeProvider>
          <MemoryRouter>
            <StopCatalogView />
          </MemoryRouter>
        </ThemeProvider>,
      ),
    );
  }

  it("loads the catalog, reports partial data, and searches by ID", async () => {
    let resolveCatalog: (value: ReturnType<typeof testCatalog>) => void;
    loadCatalog.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCatalog = resolve;
        }),
    );

    render();
    expect(container.querySelector('[role="status"]').textContent).toContain(
      "Loading",
    );

    await act(async () => {
      resolveCatalog(testCatalog());
    });

    expect(container.textContent).toContain("Partial catalog");
    expect(container.textContent).toContain("Route 1 (1)");

    const search = container.querySelector<HTMLInputElement>(
      "#stop-catalog-search",
    );
    act(() => {
      fireEvent.change(search, { target: { value: "12345" } });
    });
    expect(
      container.querySelector('a[href="/stop/12345"]'),
    ).not.toBeNull();

    act(() => {
      fireEvent.change(search, { target: { value: "no matching stop" } });
    });
    expect(container.textContent).toContain("No stops match");
  });

  it("exposes a failed load and retries on request", async () => {
    loadCatalog
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(testCatalog());
    render();
    await act(async () => Promise.resolve());
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "Could not load",
    );

    const refresh = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Refresh stops"),
    );
    await act(async () => {
      refresh.click();
      await Promise.resolve();
    });

    expect(loadCatalog).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("unique stops");
  });

  it("reports an empty route catalog", async () => {
    loadCatalog.mockResolvedValue(
      buildStopCatalog({
        route: [
          {
            desc: "Route 1",
            dir: [{ desc: "Outbound", dir: 0, stop: [] }],
            id: 1,
            route: 1,
            routeColor: "000000",
            routeSortOrder: 1,
            type: "B",
          },
        ],
      }),
    );

    render();
    await act(async () => Promise.resolve());

    expect(container.querySelector('[role="status"]').textContent).toContain(
      "No stops are available",
    );
  });
});
