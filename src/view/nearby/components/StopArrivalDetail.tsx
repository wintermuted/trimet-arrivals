import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardText,
  ListGroup,
  ListItem
} from "@wintermuted/ui-theme/react";
import { find, isEmpty } from "lodash";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import { Arrival, ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import {
  getFormattedTime,
  getNormalizedTimeDifference
} from "../util/timeUtils";
import { getNormalizedDistanceFromFeet } from "../util/turfUtils";
import { TopNavBar } from "./common/TopNavBar";

interface BooleanBadgeParams {
  status: boolean;
}

function BooleanBadge({ status }: BooleanBadgeParams) {
  if (status) {
    return <Badge tone="info">Yes</Badge>;
  } else {
    return <Badge tone="neutral">No</Badge>;
  }
}

export function StopArrivalDetail() {
  const { id } = useParams();
  const [data, setData] = useState<ArrivalData>(null);

  useEffect(() => {
    async function fetchData() {
      const arrivals = await getArrivals(id, 90);
      setData(arrivals);
    }

    fetchData();
  }, [id]);

  if (isEmpty(data)) {
    return null;
  }

  const foundArrival: Arrival = find<Arrival[]>(
    data.arrival,
    (arrival: Arrival) => arrival.id
  ) as Arrival;

  const estimatedTime = getFormattedTime(foundArrival.estimated);
  const scheduledTime = getFormattedTime(foundArrival.scheduled);
  const now = moment();
  const timeDiff = getNormalizedTimeDifference(foundArrival.estimated, now);

  return (
    <div>
      <TopNavBar id={foundArrival.shortSign} backTo={`/nearby/stops/${id}`} />
      <br />
      <Card>
        <CardHeader>Trip Info</CardHeader>
        <CardBody>
          <CardText>{foundArrival.status}</CardText>
          <CardText>
            <Badge tone="info">{timeDiff}</Badge>
            {estimatedTime} / {scheduledTime}
          </CardText>
        </CardBody>
      </Card>
      <br />
      <Card>
        <CardHeader>Vehicle Info</CardHeader>
        <ListGroup>
          <ListItem>
            <strong>Vehicle ID:</strong> {foundArrival.vehicleID}
          </ListItem>
          <ListItem>
            <strong>Distance From Stop:</strong>{" "}
            {getNormalizedDistanceFromFeet(foundArrival.feet)}
          </ListItem>
          <ListItem>
            <strong>Detoured:</strong>{" "}
            <BooleanBadge status={foundArrival.detoured} />
          </ListItem>
          <ListItem>
            <strong>Drop off only:</strong>
            <BooleanBadge status={foundArrival.dropOffOnly} />
          </ListItem>
          <ListItem>
            <strong>In Congestion:</strong>
            <BooleanBadge status={foundArrival.inCongestion} />
          </ListItem>
        </ListGroup>
      </Card>
    </div>
  );
}

export default StopArrivalDetail;
