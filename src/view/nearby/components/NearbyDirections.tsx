import {
  Card,
  CardBody,
  CardHeader,
  CardText,
  CardTitle,
  ListGroup,
  ListItem,
  ProgressBar
} from "@wintermuted/ui-theme/react";
import React from "react";
import { useSearchParams } from "react-router-dom";
import { TopNavBar } from "./common/TopNavBar";
import "./NearbyRoutes.scss";

export default function NearbyDirections() {
  const [searchParams] = useSearchParams();
  const stop = searchParams.get("stop");
  const direction = searchParams.get("direction");

  return (
    <div className="scrollarea">
      <TopNavBar id="Directions" />
      <Card>
        <CardBody>
          <CardTitle>Go in 5 minutes</CardTitle>
          <ProgressBar value={60} />
          <CardText>Arrive at 22:39</CardText>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>54</CardHeader>
        <ListGroup>
          <ListItem>To Portland</ListItem>
          <ListItem>13 more items</ListItem>
          <ListItem>SW 6th & Washington</ListItem>
        </ListGroup>
      </Card>
    </div>
  );
}
