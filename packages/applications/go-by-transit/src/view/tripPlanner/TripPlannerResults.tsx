import React from "react";
import { createPortal } from "react-dom";
import {
  JourneyDirections,
  ItineraryDetails,
  TripOptionPicker,
} from "@overworld/ui/journeys";
import { endpointLabel } from "@overworld/journeys";
import { Button } from "@wintermuted/ui-react";
import type { TripPlannerProps } from "./TripPlannerModel";
import type { TripPlannerState } from "./useTripPlannerState";

type TripPlannerResultsProps = Pick<TripPlannerProps, "renderMapStatus"> & {
  state: TripPlannerState;
};

export default function TripPlannerResults({
  state,
  renderMapStatus,
}: TripPlannerResultsProps) {
  const {
    itineraries,
    editingStops,
    plannedSearch,
    response,
    selectedItinerary,
    highlightedLeg,
    setMapLeg,
    catalog,
    previewTrip,
    clearTripPreview,
    activeItinerary,
    editingTrip,
    editTripButton,
    setEditingTrip,
    currentTripOption,
    setHoveredTrip,
    setFocusedTrip,
    setSelectedItinerary,
    transitColor,
    setHoveredLeg,
    setFocusedLeg,
  } = state;
  return (
    <>
      {itineraries.length > 0 && (
        <section className="transit-planner-results" aria-label="Trip options">
          {editingStops && plannedSearch && (
            <p className="transit-planner-select-hint">
              Showing results for{" "}
              {endpointLabel(plannedSearch.from, response?.from)} to{" "}
              {endpointLabel(plannedSearch.to, response?.to)}.
            </p>
          )}
          {renderMapStatus?.(
            itineraries,
            selectedItinerary,
            highlightedLeg,
            setMapLeg,
            catalog?.plannerRouteColors,
            previewTrip,
          )}
          <TripOptionPicker
            itineraries={itineraries}
            selectedIndex={selectedItinerary}
            editing={editingTrip}
            onEdit={() => setEditingTrip(true)}
            editButtonRef={editTripButton}
            currentOptionRef={currentTripOption}
            onCollapse={clearTripPreview}
            onHover={setHoveredTrip}
            onFocus={setFocusedTrip}
            transitColor={transitColor}
            onSelect={(index) => {
              clearTripPreview();
              setSelectedItinerary(index);
              setEditingTrip(false);
            }}
            onCancel={() => {
              clearTripPreview();
              setEditingTrip(false);
            }}
          />
          {activeItinerary && (
            <ItineraryDetails
              itinerary={activeItinerary}
              index={selectedItinerary}
              transitColor={transitColor}
              highlight={
                renderMapStatus
                  ? {
                      leg: highlightedLeg,
                      onHover: setHoveredLeg,
                      onFocus: setFocusedLeg,
                    }
                  : undefined
              }
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

export function TripPlannerJourney({
  state,
  directionsFooter,
}: TripPlannerJourneyProps) {
  const {
    inJourney,
    journeyItinerary,
    journeyHeading,
    transitColor,
    activeItinerary,
    setJourneyItinerary,
    openJourney,
  } = state;
  return (
    <>
      {inJourney && journeyItinerary && (
        <section
          className="transit-planner transit-planner--sidebar"
          aria-label="Journey directions"
        >
          <JourneyDirections
            itinerary={journeyItinerary}
            headingRef={journeyHeading}
            transitColor={transitColor}
          />
        </section>
      )}
      {directionsFooter &&
        activeItinerary &&
        createPortal(
          <Button
            type="button"
            onClick={
              inJourney ? () => setJourneyItinerary(undefined) : openJourney
            }
          >
            {inJourney ? "Back to planning" : "Get directions"}
          </Button>,
          directionsFooter,
        )}
    </>
  );
}
