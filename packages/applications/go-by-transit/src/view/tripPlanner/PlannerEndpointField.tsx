import React from "react";
import { Button, FieldGroup, Input } from "@wintermuted/ui-react";
import FontAwesome from "react-fontawesome";
import { resolveStopReference, type EndpointField } from "@overworld/journeys";
import PlannerStopSelect, { type SavedPlannerStop } from "./PlannerStopSelect";
import { EMPTY_STOPS } from "./TripPlannerModel";
import type { TripPlannerState } from "./useTripPlannerState";

interface PlannerEndpointFieldProps {
  field: EndpointField;
  state: TripPlannerState;
  savedStops?: SavedPlannerStop[];
}

export default function PlannerEndpointField({ field, state, savedStops }: PlannerEndpointFieldProps) {
  const {
    fromStop, toStop, fromLocation, toLocation, setFromLocation, setToLocation,
    fromInterestPlace, toInterestPlace, setFromInterestPlace, setToInterestPlace,
    fromParam, toParam, catalog, catalogState, locating, cancelLocationLookup,
    setValidationError, chooseStop, useNearestStop, pendingEndpointFocus,
  } = state;
  const isFrom = field === "from";
  const selected = isFrom ? fromStop : toStop;
  const label = isFrom ? "Boarding stop" : "Destination stop";
  const id = isFrom ? "planner-from" : "planner-to";
  const location = isFrom ? fromLocation : toLocation;
  const setLocation = isFrom ? setFromLocation : setToLocation;
  const interestPlace = isFrom ? fromInterestPlace : toInterestPlace;
  const setInterestPlace = isFrom ? setFromInterestPlace : setToInterestPlace;
  const reference = isFrom ? fromParam : toParam;
  const referenceResolution =
    catalog && reference
      ? resolveStopReference(catalog.stops, reference)
      : undefined;
  const nearestStopLabel = `Use nearest stop to me for ${isFrom ? "boarding" : "destination"}`;

  return (
    <div className="transit-planner-stop-field">
      <div className="transit-planner-endpoint-row">
        {location !== undefined ? (
          <FieldGroup label={isFrom ? "Origin address, place, or coordinates" : "Destination address, place, or coordinates"} htmlFor={id}>
            <Input id={id} value={location} maxLength={240} autoComplete="off" aria-describedby={`${id}-hint`}
              onChange={event => {
                cancelLocationLookup();
                setLocation(event.target.value);
                setInterestPlace(undefined);
                setValidationError("");
              }} />
          </FieldGroup>
        ) : (
          <FieldGroup label={label} htmlFor={id}>
            <PlannerStopSelect
              id={id}
              stops={catalog?.stops ?? EMPTY_STOPS}
              savedStops={savedStops}
              selected={selected}
              loading={catalogState.loading}
              onChange={stop => {
                cancelLocationLookup();
                chooseStop(stop, field);
              }}
            />
          </FieldGroup>
        )}
        <Button type="button" size="sm" variant="secondary" className="transit-planner-nearest-stop"
          disabled={!catalog || Boolean(locating)}
          aria-label={nearestStopLabel}
          title={nearestStopLabel}
          aria-describedby="planner-location-privacy"
          onClick={() => void useNearestStop(field)}>
          <FontAwesome name={locating === field ? "spinner" : "location-arrow"} spin={locating === field} aria-hidden="true" />
        </Button>
      </div>
      {location !== undefined ? (
        <div className="transit-planner-location-field">
          {interestPlace && <p><strong>{interestPlace.name}</strong><br />Approximate map point; entrance not verified. Confirm or edit these coordinates before finding trips.</p>}
          <p className="transit-planner-select-hint" id={`${id}-hint`}>
            Try a street address without city or state, a place name, or longitude, latitude.
          </p>
          <Button type="button" size="sm" variant="secondary" className="transit-planner-mode-button" onClick={() => {
            cancelLocationLookup();
            pendingEndpointFocus.current = field;
            setLocation(undefined);
            setInterestPlace(undefined);
            setValidationError("");
          }}>Use a {isFrom ? "boarding" : "destination"} stop</Button>
        </div>
      ) : <>
      <Button type="button" size="sm" variant="secondary" className="transit-planner-mode-button transit-planner-location-toggle"
        onClick={() => {
          cancelLocationLookup();
          pendingEndpointFocus.current = field;
          setLocation("");
          setValidationError("");
        }}>
        {isFrom ? "Other origin options" : "Other destination options"}
      </Button>
      {!selected &&
        referenceResolution &&
        referenceResolution.matches.length > 1 && (
        <p className="transit-planner-field-message" role="alert">
          This stop name matches multiple platforms. Choose the correct stop
          from the results.
        </p>
      )}
      {!selected &&
        referenceResolution &&
        referenceResolution.matches.length === 0 && (
          <p className="transit-planner-field-message" role="alert">
            The linked stop “{reference}” was not found. Search by stop name
            or ID and choose a result.
          </p>
        )}
      </>}
    </div>
  );
}

