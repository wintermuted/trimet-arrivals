import { isEmpty } from "lodash";
import React, { useEffect, useState } from "react";

import { RouteDataResultSet } from "../../../api/trimet/interfaces/routes";
import { getAllRoutes } from "../../../api/trimet/routeConfig";
import { createRoutesDictionary } from "../routeDictionary";
import CollapsiblePane from "../../lineDetail/component/CollapsiblePane";
import { getBusLines, getRoutes } from "./AllLines";

export function BusLines() {
  const [routes, setRoutes] = useState({});

  useEffect(() => {
    getAllRoutes().then((data: RouteDataResultSet) => {
      const routesDictionary = createRoutesDictionary(data.route);
      setRoutes(routesDictionary);
    });
  }, []);

  if (isEmpty(routes)) {
    return null;
  }

  const busLines = getBusLines(routes);

  return (
    <div className="transit-container">
      <CollapsiblePane
        title="Schedule"
        open={true}
        className="route-detail-information-pane"
      >
        <p>
          Some lines offer <strong>Frequent Service</strong>, others provide{" "}
          <strong>24-hour Service</strong> all days of the week.
        </p>
      </CollapsiblePane>
      <br />
      <div className="transit-grid transit-grid-4">{getRoutes(busLines)}</div>
    </div>
  );
}
