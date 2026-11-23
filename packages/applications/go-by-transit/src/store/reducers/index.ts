import { combineReducers } from "redux";
import arrivalsReducer, { ArrivalsReducerState } from "./arrivalsReducer";
import routeDataReducer, {
  RouteDataReducerState,
} from "./data/routeDataReducer";
import stopsReducer, { StopsReducerState } from "./stopsReducer";

export interface RootState {
  stopsReducer: StopsReducerState;
  arrivalsReducer: ArrivalsReducerState;
  routeDataReducer: RouteDataReducerState;
}

const app = combineReducers<RootState>({
  arrivalsReducer,
  routeDataReducer,
  stopsReducer,
} as any);

export default app;
