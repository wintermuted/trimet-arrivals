import {
  Badge,
  Card,
  CardHeader,
  ListGroup,
  ListItem
} from "@wintermuted/ui-theme/react";
import React from "react";
import { ArrivalData } from "../../../api/trimet/interfaces/arrivals";

interface LocationInfoPaneProps {
  arrivalData: ArrivalData;
}

function LocationInfoPane({ arrivalData }: LocationInfoPaneProps) {
  const location = arrivalData.location[0];

  return (
    <Card>
      <CardHeader as="h5">Info</CardHeader>
      <ListGroup>
        <ListItem>
          <strong>ID:</strong>
          <Badge>{location.id}</Badge>
        </ListItem>
        <ListItem>
          <strong>Direction:</strong> {location.dir}
        </ListItem>
        <ListItem>
          <strong>Queried:</strong> {arrivalData.queryTime}
        </ListItem>
        <ListItem>
          <strong>Lat / Lng:</strong> {location.lat} / {location.lng}
        </ListItem>
        <ListItem>
          <strong>Passenger Code:</strong> {location.passengerCode}
        </ListItem>
      </ListGroup>
    </Card>
  );
}

export default LocationInfoPane;
