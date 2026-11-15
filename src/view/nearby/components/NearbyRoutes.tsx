import {
  Card,
  CardHeader,
  ListGroup,
  ListItem
} from "@wintermuted/ui-theme/react";
import { Dictionary, map } from "lodash";
import React from "react";
import { TrimetRoute } from "../../../api/trimet/interfaces/types";
import RouteIndicator from "../../../component/route/RouteIndicator";
import NearbySubNav from "./common/NearbySubNav";
import "./NearbyRoutes.scss";
import { SearchRadiusSelection } from "./SearchRadiusSelection";

function getRouteDirections(route: TrimetRoute) {
  return (
    <ListItem key={`${route.route}-${route.dir[0].dir}`}>
      <RouteIndicator routeId={route.route} />
      {route.dir[0].desc}
    </ListItem>
  );
}

function getRoutes(routes: Dictionary<TrimetRoute[]>) {
  return map(routes, (route: TrimetRoute[], key) => {
    return (
      <>
        <Card key={key}>
          <CardHeader as="h5">{route[0].desc}</CardHeader>
          <ListGroup>{route.map(r => getRouteDirections(r))}</ListGroup>
        </Card>
        <br />
      </>
    );
  });
}

export interface NearbyRoutesProps {
  nearbyRoutes: Dictionary<TrimetRoute[]>;
  radiusSize: number;
  handleRadiusSelectionChange: (e: any) => void;
  routeCount: number;
  stopCount: number;
}

export default function NearbyRoutes({
  nearbyRoutes,
  radiusSize,
  handleRadiusSelectionChange,
  routeCount,
  stopCount
}: NearbyRoutesProps) {
  return (
    <div id="nearby-view-routes" className="scrollarea">
      <SearchRadiusSelection
        radiusSize={radiusSize}
        handleRadiusSelectionChange={handleRadiusSelectionChange}
      />
      <br />
      <NearbySubNav routeCount={routeCount} stopCount={stopCount} />
      <br />
      {getRoutes(nearbyRoutes)}
    </div>
  );
}
