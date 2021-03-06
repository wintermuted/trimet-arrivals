import { createSelector } from "reselect";
import { StopLocation } from "../../api/trimet/types";
import { RootState } from "../reducers";

const allStopLocations = (state: RootState) => state.stopsReducer.stopLocations;

const stopLocationByLocationId = (state: RootState, locationId: number) =>
  state.stopsReducer.stopLocations[locationId];

const stopsLoading = (state: RootState) => state.stopsReducer.loading;

const stopTimeOfLastLoadReducer = (state: RootState) =>
  state.stopsReducer.timeOfLastLoad;

export const stopsLoadingSelector = createSelector(
  stopsLoading,
  (loading: boolean) => loading
);

export const allStopLocationsSelector = createSelector(
  allStopLocations,
  (stopLocations: StopLocation[]) => stopLocations
);

export const timeOfLastLoadSelector = createSelector(
  stopTimeOfLastLoadReducer,
  (timeOfLastLoad: string) => timeOfLastLoad
);

export const stopLocationSelector = createSelector(
  stopLocationByLocationId,
  (stopLocation: StopLocation) => stopLocation
);
