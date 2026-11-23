import { LOAD_ARRIVALS_DATA_REQUEST } from "../constants";

export type LoadArrivalData = (locationId: number) => void;

export const loadArrivalDataRequest = (locationId: number) => ({
  payload: { locationId },
  type: LOAD_ARRIVALS_DATA_REQUEST
});
