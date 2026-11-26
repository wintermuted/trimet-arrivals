import { Accordion, Button, ListGroup, ListItem } from "@wintermuted/ui-react";
import React from "react";
import FontAwesome from "react-fontawesome";
import { useTimeDisplay } from "./TimeDisplay";
import "./StopPredictionList.scss";

export interface StopPredictionItem {
  id: string;
  name: string;
  stopId: string | number;
  prediction?: { at: number; kind: "Estimated" | "Scheduled" };
  predictionLabel: string;
  stale?: boolean;
  routes?: React.ReactNode;
}

export interface StopPredictionListProps {
  stops: readonly StopPredictionItem[];
  updateNote?: React.ReactNode;
  onRefresh?: () => void;
  refreshLabel?: string;
  loading?: boolean;
  error?: React.ReactNode;
  notices?: readonly React.ReactNode[];
  title?: React.ReactNode;
  emptyContent?: React.ReactNode;
  defaultTimezone?: string;
  now?: number;
}

export function StopPredictionList({
  stops,
  updateNote,
  onRefresh,
  refreshLabel = "Refresh",
  loading = false,
  error,
  notices = [],
  title = (
    <>
      <FontAwesome name="map-marker" aria-hidden="true" /> Stops
    </>
  ),
  emptyContent,
  defaultTimezone = "America/Los_Angeles",
  now = Date.now(),
}: StopPredictionListProps) {
  const { formatTime, formatDay } = useTimeDisplay();
  const today = formatDay(now, defaultTimezone);
  return (
    <Accordion
      open
      className="transit-stop-panel ow-stop-prediction-list"
      title={title}
    >
      {(updateNote || onRefresh) && (
        <div className="transit-stop-prediction-status">
          <span className="transit-trip-note">{updateNote}</span>
          {onRefresh && (
            <Button variant="secondary" onClick={onRefresh}>
              {refreshLabel}
            </Button>
          )}
        </div>
      )}
      {loading && (
        <p role="status" className="transit-stop-prediction-message">
          Loading stop predictions...
        </p>
      )}
      {error && (
        <p role="alert" className="transit-stop-prediction-message">
          {error}
        </p>
      )}
      {notices.map((notice, index) => (
        <p key={index} className="transit-stop-prediction-message">
          {notice}
        </p>
      ))}
      {!stops.length ? (
        emptyContent
      ) : (
        <ListGroup>
          {stops.map((stop) => {
            const day =
              stop.prediction && formatDay(stop.prediction.at, defaultTimezone);
            return (
              <ListItem key={stop.id}>
                <span>{stop.name}</span>
                <small className="ow-stop-prediction-id">
                  {" "}
                  ({stop.stopId})
                </small>
                <div className="transit-stop-prediction">
                  {stop.prediction ? (
                    <>
                      <time
                        dateTime={new Date(stop.prediction.at).toISOString()}
                      >
                        {formatTime(stop.prediction.at, defaultTimezone)}
                      </time>
                      {day !== today && ` ${day}`} {stop.prediction.kind}
                      {stop.stale && " · Last received"}
                    </>
                  ) : (
                    stop.predictionLabel
                  )}
                </div>
                {stop.routes}
              </ListItem>
            );
          })}
        </ListGroup>
      )}
    </Accordion>
  );
}
