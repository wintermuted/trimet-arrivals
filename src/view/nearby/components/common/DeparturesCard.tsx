import {
  Card,
  CardHeader,
  ListGroup,
  ListItem
} from "@wintermuted/ui-theme/react";
import { map } from "lodash";
import moment from "moment";
import React from "react";
import FontAwesome from "react-fontawesome";
import { Arrival } from "../../../../api/trimet/interfaces/arrivals";
import { getTimeUntilArrival } from "../../util/timeUtils";

interface DeparturesCardParams {
  filteredArrivals: Arrival[];
}

export function DeparturesCard({ filteredArrivals }: DeparturesCardParams) {
  return (
    <Card>
      <CardHeader>Departures</CardHeader>
      <ListGroup>
        {map(filteredArrivals, (arrival: any, index: number) => {
          const estimatedArrivalTime = arrival.estimated;
          const scheduledArrivalTime = arrival.scheduled;
          const timeUntilArrival = getTimeUntilArrival(
            estimatedArrivalTime,
            scheduledArrivalTime
          );

          const variant = index === 0 ? "primary" : "light";
          const estimatedTime = moment(estimatedArrivalTime).format("h:mm a");
          const scheduledTime = moment(scheduledArrivalTime).format("h:mm a");
          const arrivalTime = estimatedArrivalTime
            ? estimatedTime
            : scheduledTime;

          return (
            <ListItem
              key={index}
              as="li"
              style={{
                background:
                  variant === "primary"
                    ? "var(--wm-color-accent-soft)"
                    : undefined,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start"
              }}
            >
              <span>
                {index === 0 && <FontAwesome name="caret-right" />}
                {timeUntilArrival}
              </span>
              <small>{arrivalTime}</small>
            </ListItem>
          );
        })}
      </ListGroup>
    </Card>
  );
}
