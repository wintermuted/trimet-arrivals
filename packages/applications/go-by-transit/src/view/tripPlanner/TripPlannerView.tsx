import React from "react";
import { Button } from "@wintermuted/ui-react";
import { categoryName, PLACE_CATEGORIES } from "@overworld/places/catalog";
import { SHORTCUTS } from "../../api/localstorage/bookmarkShortcuts";
import { useBookmarkShortcuts } from "@overworld/bookmarks/react";
import { useBookmarks } from "../../state/bookmarks/BookmarksProvider";
import type { TripPlannerProps } from "./TripPlannerModel";
import useTripPlannerState from "./useTripPlannerState";
import TripPlannerForm from "./TripPlannerForm";
import TripPlannerResults, { TripPlannerJourney } from "./TripPlannerResults";
import "./TripPlannerView.scss";

export function ConnectedTripPlannerView(props: TripPlannerProps) {
  const { stops: bookmarks } = useBookmarks();
  const { shortcuts, error } = useBookmarkShortcuts(bookmarks);
  const savedStops = SHORTCUTS.flatMap(({ key, kind, label }) => {
    const id = shortcuts[key];
    return kind === "stop" && id !== undefined && bookmarks[id] ? [{ id, label }] : [];
  });
  return <>{error && <p role="alert">{error}</p>}<TripPlannerView {...props} savedStops={savedStops} /></>;
}

export default function TripPlannerView({ inSidebar = false, directionsFooter, renderMapStatus, renderPlaceDestination, savedStops }: TripPlannerProps) {
  const state = useTripPlannerState({ inSidebar, directionsFooter });
  const {
    toInterestPlace, inJourney, planningContent, fromPlaceId, toPlaceId, placeCatalog,
    tripState, fromLinkedLocation, fromParam, toLinkedLocation, toParam, setTripRetry,
    response, historyUnavailable,
  } = state;

  return (
    <>
    {renderPlaceDestination?.(toInterestPlace)}
    <section
      className={`transit-planner${inSidebar ? " transit-planner--sidebar" : ""}`}
      aria-labelledby="transit-planner-title"
      hidden={inJourney}
      ref={planningContent}
    >
      <TripPlannerForm state={state} inSidebar={inSidebar} savedStops={savedStops} />
      {(fromPlaceId || toPlaceId) && PLACE_CATEGORIES.map(category => placeCatalog.sources[category].error && (
        <p role="alert" key={category}>
          Could not load {categoryName(category).toLowerCase()}.{" "}
          <Button size="sm" variant="secondary" onClick={() => placeCatalog.retry(category)}>Retry loading places</Button>
        </p>
      ))}

      {tripState.status === "loading" && (
        <p className="transit-planner-message" role="status">
          Finding trips…
        </p>
      )}
      {tripState.status === "error" && (
        <div className="transit-planner-message" role="alert">
          <p>{tripState.message}</p>
          {(fromLinkedLocation ?? fromParam) && (toLinkedLocation ?? toParam) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTripRetry((value) => value + 1)}
            >
              Retry trip search
            </Button>
          )}
        </div>
      )}
      {tripState.status === "idle" && !fromParam && !toParam && fromLinkedLocation === null && toLinkedLocation === null && (
        <p className="transit-planner-message" role="status">
          Choose an origin and a destination to see trip options.
        </p>
      )}
      {tripState.status === "idle" && Boolean(fromParam || toParam || fromLinkedLocation || toLinkedLocation) && (
        <p className="transit-planner-message" role="status">
          Complete both locations to plan this trip.
        </p>
      )}

      {response?.partial && !inSidebar && (
        <p className="transit-planner-partial" role="status">
          TriMet returned some incomplete itinerary details. Available trip
          information is shown.
        </p>
      )}
      {historyUnavailable && (
        <p role="status">This trip could not be saved to recent journeys on this device.</p>
      )}
      {tripState.status === "empty" && (
        <p className="transit-planner-message" role="status">
          No trips were found between these locations. Try another pair of locations.
        </p>
      )}
      <TripPlannerResults state={state} renderMapStatus={renderMapStatus} />
    </section>
    <TripPlannerJourney state={state} directionsFooter={directionsFooter} />
    </>
  );
}
