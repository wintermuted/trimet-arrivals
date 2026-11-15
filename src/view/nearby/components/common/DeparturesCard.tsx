import {
  Accordion,
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
  selectedArrival: Arrival;
  onSelect: (arrival: Arrival) => void;
}

export function DeparturesCard({ filteredArrivals, selectedArrival, onSelect }: DeparturesCardParams) {
  return (
    <Accordion
      open
      className="transit-stop-panel"
      title={<><FontAwesome name="clock-o" aria-hidden="true" /> Departures</>}
    >
      <ListGroup>
        {map(filteredArrivals, (arrival: Arrival) => {
          const estimatedArrivalTime = arrival.estimated;
          const scheduledArrivalTime = arrival.scheduled;
          const timeUntilArrival = getTimeUntilArrival(
            estimatedArrivalTime,
            scheduledArrivalTime
          );

          const selected = arrival === selectedArrival;
          const estimatedTime = moment(estimatedArrivalTime).format("h:mm a");
          const scheduledTime = moment(scheduledArrivalTime).format("h:mm a");
          const arrivalTime = estimatedArrivalTime
            ? estimatedTime
            : scheduledTime;

          return (
            <ListItem
              key={arrival.id}
              as="li"
              style={{ padding: 0 }}
            >
              <button
                type="button"
                className="transit-departure-option"
                aria-pressed={selected}
                aria-label={`Depart at ${arrivalTime}, ${timeUntilArrival}`}
                onClick={() => onSelect(arrival)}
              >
                <span>
                  {selected && <FontAwesome name="caret-right" aria-hidden="true" />}
                  {timeUntilArrival}
                </span>
                <small>{arrivalTime}</small>
              </button>
            </ListItem>
          );
        })}
      </ListGroup>
    </Accordion>
  );
}
