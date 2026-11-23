import { mapKeys } from "lodash";
import { TrimetRoute } from "../../api/trimet/interfaces/routes";

export interface RouteDataDictionary {
  [id: number]: TrimetRoute;
}

export function createRoutesDictionary(
  routes: TrimetRoute[]
): RouteDataDictionary {
  return mapKeys(routes, (route: TrimetRoute) => route.id);
}
