import { isEmpty } from "lodash";
import React, { useEffect, useState } from "react";

import { RouteDataResultSet } from "../../../api/trimet/interfaces/routes";
import { getAllRoutes } from "../../../api/trimet/routeConfig";
import { createRoutesDictionary } from "../routeDictionary";
import Loading from "../../loading/Loading";
import { getMaxLines, getRoutes } from "./AllLines";

export function MaxLines() {
  const [routes, setRoutes] = useState({});

  useEffect(() => {
    getAllRoutes().then((data: RouteDataResultSet) => {
      const routesDictionary = createRoutesDictionary(data.route);
      setRoutes(routesDictionary);
    });
  }, []);

  if (isEmpty(routes)) {
    return <Loading />;
  }

  const lines = getMaxLines(routes);

  return (
    <div className="transit-container">
      <div className="transit-grid transit-grid-3">{getRoutes(lines)}</div>
    </div>
  );
}
