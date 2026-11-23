import { combineReducers } from "redux";
import routeDataReducer, {
  RouteDataReducerState,
} from "./data/routeDataReducer";

export interface RootState {
  routeDataReducer: RouteDataReducerState;
}

const app = combineReducers<RootState>({
  routeDataReducer,
} as any);

export default app;
