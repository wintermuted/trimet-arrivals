import {
  Accordion,
  ListGroup,
  ListItem
} from "@wintermuted/ui-react";
import { map } from "lodash";
import React from "react";
import FontAwesome from "react-fontawesome";
import { Arrival } from "../../../../api/trimet/interfaces/arrivals";
import { useTimeDisplay } from "@overworld/ui";
import TimeDiffBadge from "./TimeDiffBadge";

interface DeparturesCardParams {
  filteredArrivals: Arrival[];
  selectedArrival: Arrival;
  onSelect: (arrival: Arrival) => void;
}

export function DeparturesCard({ filteredArrivals, selectedArrival, onSelect }: DeparturesCardParams) {
  const { formatTime } = useTimeDisplay();
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
          const selected = arrival === selectedArrival;
          const estimatedTime = formatTime(estimatedArrivalTime);
          const scheduledTime = formatTime(scheduledArrivalTime);
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
                onClick={() => onSelect(arrival)}
              >
                <span className="transit-departure-label">
                  <span className="transit-departure-caret" aria-hidden="true">
                    {selected && <FontAwesome name="caret-right" />}
                  </span>
                  <TimeDiffBadge
                    estimatedArrivalTime={estimatedArrivalTime}
                    scheduledArrivalTime={scheduledArrivalTime}
                  />
                </span>
                <small>
                  {estimatedArrivalTime ? "Estimated" : "Scheduled"}: {arrivalTime}
                </small>
              </button>
            </ListItem>
          );
        })}
      </ListGroup>
    </Accordion>
  );
}
