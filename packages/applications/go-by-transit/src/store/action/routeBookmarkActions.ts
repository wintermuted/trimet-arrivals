import { TrimetRoute } from "../../api/trimet/interfaces/routes";
import {
  REMOVE_ROUTE_BOOKMARK_REQUEST,
  STORE_ROUTE_BOOKMARK_REQUEST
} from "../constants/routeBookmarks";

export const storeRouteBookmarkRequest = (route: TrimetRoute) => ({
  payload: { route },
  type: STORE_ROUTE_BOOKMARK_REQUEST
});

export const removeRouteBookmarkRequest = (routeId: number) => ({
  payload: { routeId },
  type: REMOVE_ROUTE_BOOKMARK_REQUEST
});
