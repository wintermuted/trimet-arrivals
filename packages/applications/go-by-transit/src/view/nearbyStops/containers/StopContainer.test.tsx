import { vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import { arrival1 } from "../../../api/trimet/fixture/arrival";
import { BookmarksProvider } from "../../../state/bookmarks/BookmarksProvider";
import { ArrivalsProvider } from "../../../state/arrivals/ArrivalsProvider";
import StopContainer from "./StopContainer";

vi.mock("../../../api/trimet/arrivals", () => ({ getArrivals: vi.fn() }));

const response = {
  arrival: [],
  detour: [],
  queryTime: "",
  location: [
    {
      id: 123,
      desc: "Loaded Main Street",
      dir: "N",
      lat: 45.5,
      lng: -122.6,
      passengerCode: "E",
    },
  ],
};

function setup(showArrivals = false) {
  return render(
    <ArrivalsProvider>
      <BookmarksProvider>
        <MemoryRouter>
          <StopContainer locationId={123} showArrivals={showArrivals} />
        </MemoryRouter>
      </BookmarksProvider>
    </ArrivalsProvider>,
  );
}

it("loads stop metadata without Redux and bookmarks its response location", async () => {
  localStorage.clear();
  vi.mocked(getArrivals).mockResolvedValue(response);
  setup();
  expect(await screen.findByText(/Loaded Main Street/)).toBeInTheDocument();
  expect(getArrivals).toHaveBeenCalledWith("123", 45);
  fireEvent.click(screen.getByRole("button", { name: "Bookmark this stop" }));
  expect(
    screen.getByRole("button", { name: "Remove stop bookmark" }),
  ).toBeInTheDocument();
  localStorage.clear();
});

it("shows empty arrivals, resets the shared countdown on refresh, and releases timers", async () => {
  vi.useFakeTimers();
  vi.mocked(getArrivals).mockResolvedValue(response);
  const view = setup(true);
  try {
    await act(async () => {});
    expect(screen.getByText("No arrivals available.")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(10000));
    expect(screen.getByText("20")).toBeInTheDocument();
    await act(async () =>
      fireEvent.click(screen.getByTitle("Reload arrivals for stop")),
    );
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(getArrivals).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(30000));
    expect(getArrivals).toHaveBeenCalledTimes(3);
    view.unmount();
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(getArrivals).toHaveBeenCalledTimes(3);
  } finally {
    vi.useRealTimers();
  }
});

it("surfaces load failures and retries rather than leaving a blank saved-stop card", async () => {
  vi.mocked(getArrivals)
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValue(response);
  setup();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to load arrivals for stop 123",
  );
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText(/Loaded Main Street/)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("renders arrival rows without optional route metadata and keeps load-more controls", async () => {
  vi.mocked(getArrivals).mockResolvedValue({
    ...response,
    arrival: Array.from({ length: 7 }, (_, index) => ({
      ...arrival1,
      locid: 123,
      id: String(index),
    })),
  });
  setup(true);
  const more = await screen.findByRole("button", {
    name: "Show 2 more arrivals",
  });
  expect(screen.getAllByRole("row")).toHaveLength(6);
  fireEvent.click(more);
  expect(screen.getAllByRole("row")).toHaveLength(8);
  fireEvent.click(screen.getByRole("button", { name: "Only show 5 arrivals" }));
  expect(screen.getAllByRole("row")).toHaveLength(6);
});
