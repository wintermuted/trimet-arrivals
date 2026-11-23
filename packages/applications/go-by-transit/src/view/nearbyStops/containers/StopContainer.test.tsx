import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { createStore } from "redux";
import reducers from "../../../store/reducers";
import { BookmarksProvider } from "../../../state/bookmarks/BookmarksProvider";
import { loadArrivalDataRequest } from "../../../store/action/stopActions";
import StopContainer from "./StopContainer";

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
