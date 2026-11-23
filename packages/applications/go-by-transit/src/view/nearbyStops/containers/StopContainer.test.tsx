import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { createStore } from "redux";
import { END } from "redux-saga";
import { getArrivals } from "../../../api/trimet/arrivals";
import reducers from "../../../store/reducers";
import { BookmarksProvider } from "../../../state/bookmarks/BookmarksProvider";
import { loadArrivalDataRequest } from "../../../store/action/stopActions";
import { arrivalsLoadingSelector } from "../../../store/selectors/arrivalSelectors";
import appStore from "../../../store/store";
import StopContainer from "./StopContainer";

vi.mock("../../../api/trimet/arrivals", () => ({
  getArrivals: vi.fn()
}));

it("renders stop data from Redux and requests its arrivals on mount", () => {
  const store = createStore(reducers);
  const state = store.getState();
  const stop = {
    locid: 123,
    desc: "Main Street",
    dir: "N",
    distance: 456,
    route: [],
  };
  const populatedStore = createStore(reducers, {
    ...state,
    stopsReducer: { ...state.stopsReducer, stopLocations: { 123: stop } },
  });

  const dispatch = vi.spyOn(populatedStore, "dispatch");
  render(
    <Provider store={populatedStore}>
      <BookmarksProvider>
        <MemoryRouter>
          <StopContainer locationId={123} showArrivals={false} />
        </MemoryRouter>
      </BookmarksProvider>
    </Provider>,
  );
  expect(screen.getByText(/Main Street/)).toBeInTheDocument();
  expect(dispatch).toHaveBeenCalledWith(loadArrivalDataRequest(123));
});

it("loads stop metadata through the registered arrival request watcher", async () => {
  vi.mocked(getArrivals).mockResolvedValue({
    arrival: [],
    detour: [],
    queryTime: "2026-11-23T12:00:00Z",
    location: [{
      id: 123,
      desc: "Loaded Main Street",
      dir: "N",
      lat: 45.5,
      lng: -122.6,
      passengerCode: "E"
    }]
  });
  const store = appStore();
  const { unmount } = render(
    <Provider store={store}>
      <BookmarksProvider>
        <MemoryRouter>
          <StopContainer locationId={123} showArrivals={false} />
        </MemoryRouter>
      </BookmarksProvider>
    </Provider>
  );

  try {
    expect(await screen.findByText(/Loaded Main Street/)).toBeInTheDocument();
    expect(getArrivals).toHaveBeenCalledWith("123", 45);
    expect(arrivalsLoadingSelector(store.getState(), 123)).toBe(false);
    expect(store.getState().stopsReducer.timeOfLastLoad).not.toBe("");
  } finally {
    unmount();
    store.dispatch(END);
  }
});
