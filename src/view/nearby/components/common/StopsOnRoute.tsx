import {
  Badge,
  Accordion,
  ListGroup,
  ListItem
} from "@wintermuted/ui-theme/react";
import { map } from "lodash";
import React, { useEffect, useState } from "react";
import FontAwesome from "react-fontawesome";
import { RouteDirectionStop } from "../../../../api/trimet/interfaces/routes";
import { StopData, TrimetRoute } from "../../../../api/trimet/interfaces/types";
import { getNearbyStops } from "../../../../api/trimet/stops";

interface StopsOnRouteParams {
  remainingStopsOnRoute: RouteDirectionStop[];
}

interface StopOnRouteParams {
  routeDirectionStop: RouteDirectionStop;
}

function RouteAtStop({ stopData }: { stopData: StopData }) {
  const routes: TrimetRoute[] = stopData.location[0].route;

  return (
    <div className="route-at-stop">
      <FontAwesome name="bus" />
      {map(routes, (route: TrimetRoute) => {
        return (
          <Badge key={route.route} tone="neutral">
            {route.route}
          </Badge>
        );
      })}
    </div>
  );
}

function StopOnRoute({ routeDirectionStop }: StopOnRouteParams) {
  const [stopData, setStopData] = useState<StopData>(null);

  useEffect(() => {
    async function fetchData() {
      if (routeDirectionStop) {
        const location = {
          coords: {
            latitude: routeDirectionStop.lat,
            longitude: routeDirectionStop.lng
          }
        };

        const nearbyStopData = await getNearbyStops(location, 10);
        setStopData(nearbyStopData);
      }
    }

    fetchData();
  }, [routeDirectionStop]);

  return (
    <ListItem key={routeDirectionStop.locid}>
      <span>{routeDirectionStop.desc}</span>
      <small style={{ color: "var(--wm-color-text-muted)" }}>
        {" "}
        ({routeDirectionStop.locid})
      </small>
      {stopData && <RouteAtStop stopData={stopData} />}
    </ListItem>
  );
}

export function StopsOnRoute({ remainingStopsOnRoute }: StopsOnRouteParams) {
  return (
    <Accordion
      open
      className="transit-stop-panel"
      title={<><FontAwesome name="map-marker" aria-hidden="true" /> Stops</>}
    >
      <ListGroup>
        {map(
          remainingStopsOnRoute,
          (routeDirectionStop: RouteDirectionStop) => {
            return <StopOnRoute key={routeDirectionStop.locid} routeDirectionStop={routeDirectionStop} />;
          }
        )}
      </ListGroup>
    </Accordion>
  );
}
