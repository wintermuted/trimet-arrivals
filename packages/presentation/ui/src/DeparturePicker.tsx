import { Accordion, ListGroup, ListItem } from "@wintermuted/ui-react";
import React from "react";
import FontAwesome from "react-fontawesome";
import { useTimeDisplay } from "./TimeDisplay";
import TimeDiffBadge from "./TimeDiffBadge";
import "./DeparturePicker.scss";

export interface DepartureOption {
  id: string;
  estimated: number;
  scheduled: number;
}

export interface DeparturePickerProps<
  T extends DepartureOption = DepartureOption,
> {
  departures: readonly T[];
  selectedId?: string;
  onSelect: (departure: T) => void;
  title?: React.ReactNode;
  emptyContent?: React.ReactNode;
  status?: React.ReactNode;
  disabled?: boolean;
}

export function DeparturePicker<T extends DepartureOption>({
  departures,
  selectedId,
  onSelect,
  title = (
    <>
      <FontAwesome name="clock-o" aria-hidden="true" /> Departures
    </>
  ),
  emptyContent = <p role="status">No departures available.</p>,
  status,
  disabled = false,
}: DeparturePickerProps<T>) {
  const { formatTime } = useTimeDisplay();
  return (
    <Accordion
      open
      className="transit-stop-panel ow-departure-picker"
      title={title}
    >
      {status}
      {!departures.length ? (
        emptyContent
      ) : (
        <ListGroup>
          {departures.map((departure) => {
            const selected = departure.id === selectedId;
            return (
              <ListItem key={departure.id} as="li" style={{ padding: 0 }}>
                <button
                  type="button"
                  className="transit-departure-option"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => onSelect(departure)}
                >
                  <span className="transit-departure-label">
                    <span
                      className="transit-departure-caret"
                      aria-hidden="true"
                    >
                      {selected && <FontAwesome name="caret-right" />}
                    </span>
                    <TimeDiffBadge
                      estimatedArrivalTime={departure.estimated}
                      scheduledArrivalTime={departure.scheduled}
                    />
                  </span>
                  <small>
                    {departure.estimated ? "Estimated" : "Scheduled"}:{" "}
                    {formatTime(departure.estimated || departure.scheduled)}
                  </small>
                </button>
              </ListItem>
            );
          })}
        </ListGroup>
      )}
    </Accordion>
  );
}
