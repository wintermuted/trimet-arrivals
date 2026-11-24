import React from "react";
import { createPortal } from "react-dom";
import { JourneyDirections, ItineraryDetails, PlannerDisclosure, TripOptionSummary, transferCount } from "@overworld/ui/journeys";
import { endpointLabel } from "@overworld/journeys";
import { Button } from "@wintermuted/ui-react";
import type { TripPlannerProps } from "./TripPlannerModel";
import type { TripPlannerState } from "./useTripPlannerState";

type TripPlannerResultsProps = Pick<TripPlannerProps, "renderMapStatus"> & {
  state: TripPlannerState;
};

export default function TripPlannerResults({ state, renderMapStatus }: TripPlannerResultsProps) {
  const {
    itineraries, editingStops, plannedSearch, response, selectedItinerary,
    highlightedLeg, setMapLeg, catalog, previewTrip, clearTripPreview, activeItinerary,
    editingTrip, editTripButton, setEditingTrip, currentTripOption, setHoveredTrip,
    setFocusedTrip, setSelectedItinerary, transitColor, setHoveredLeg, setFocusedLeg,
  } = state;
  return (
    <>
      {itineraries.length > 0 && (
        <section
          className="transit-planner-results"
          aria-label="Trip options"
        >
          {editingStops && plannedSearch && (
            <p className="transit-planner-select-hint">
              Showing results for {endpointLabel(plannedSearch.from, response?.from)} to{" "}
              {endpointLabel(plannedSearch.to, response?.to)}.
            </p>
          )}
          {renderMapStatus?.(itineraries, selectedItinerary, highlightedLeg, setMapLeg, catalog?.plannerRouteColors, previewTrip)}
          <PlannerDisclosure title="Choose a trip" onCollapse={clearTripPreview} edit={activeItinerary && !editingTrip ? {
            label: "Edit trip",
            buttonRef: editTripButton,
            onClick: () => setEditingTrip(true),
          } : undefined}>
            {!activeItinerary || editingTrip ? (
              <>
                <ul className="transit-planner-options" aria-label="Available trips">
                  {itineraries.map((itinerary, index) => (
                    <li key={itinerary.id || index}>
                      <button
                        type="button"
                        className="transit-planner-option"
                        aria-current={selectedItinerary === index ? "true" : undefined}
                        ref={selectedItinerary === index ? currentTripOption : undefined}
                        onPointerEnter={event => {
                          if (event.pointerType !== "touch") setHoveredTrip(index);
                        }}
                        onPointerLeave={() => setHoveredTrip(undefined)}
                        onFocus={() => setFocusedTrip(index)}
                        onBlur={() => setFocusedTrip(undefined)}
                        onClick={() => {
                          clearTripPreview();
                          setSelectedItinerary(index);
                          setEditingTrip(false);
                        }}
                      >
                        <TripOptionSummary
                          itinerary={itinerary}
                          index={index}
                          current={selectedItinerary === index}
                          transitColor={transitColor}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
                {editingTrip && (
                  <Button type="button" variant="secondary" onClick={() => {
                    clearTripPreview();
                    setEditingTrip(false);
                  }}>
                    Cancel
                  </Button>
                )}
              </>
            ) : (
              <div className="transit-planner-summary">
                  <h4>
                    Option {selectedItinerary + 1}
                    {activeItinerary.startTime && activeItinerary.endTime &&
                      ` · ${activeItinerary.startTime}–${activeItinerary.endTime}`}
                  </h4>
                  <p>
                    {activeItinerary.duration !== undefined &&
                      `${activeItinerary.duration} min · `}
                    {transferCount(activeItinerary)}{" "}
                    {transferCount(activeItinerary) === 1 ? "transfer" : "transfers"}
                    {activeItinerary.distance !== undefined &&
                      ` · ${activeItinerary.distance.toFixed(2)} mi`}
                    {activeItinerary.fare !== undefined &&
                      ` · $${activeItinerary.fare.toFixed(2)} regular fare`}
                  </p>
              </div>
            )}
          </PlannerDisclosure>
          {activeItinerary && (
            <ItineraryDetails
              itinerary={activeItinerary}
              index={selectedItinerary}
              transitColor={transitColor}
              highlight={renderMapStatus ? { leg: highlightedLeg, onHover: setHoveredLeg, onFocus: setFocusedLeg } : undefined}
            />
          )}
        </section>
      )}
    </>
  );
}

type TripPlannerJourneyProps = Pick<TripPlannerProps, "directionsFooter"> & {
  state: TripPlannerState;
};

export function TripPlannerJourney({ state, directionsFooter }: TripPlannerJourneyProps) {
  const {
    inJourney, journeyItinerary, journeyHeading, transitColor, activeItinerary,
    setJourneyItinerary, openJourney,
  } = state;
  return (
    <>
    {inJourney && journeyItinerary && (
      <section className="transit-planner transit-planner--sidebar" aria-label="Journey directions">
        <JourneyDirections
          itinerary={journeyItinerary}
          headingRef={journeyHeading}
          transitColor={transitColor}
        />
      </section>
    )}
    {directionsFooter && activeItinerary && createPortal(
      <Button type="button" onClick={inJourney ? () => setJourneyItinerary(undefined) : openJourney}>
        {inJourney ? "Back to planning" : "Get directions"}
      </Button>,
      directionsFooter
    )}
    </>
  );
}
