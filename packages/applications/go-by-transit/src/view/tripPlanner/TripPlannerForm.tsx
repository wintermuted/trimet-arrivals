import React from "react";
import { PlannerDisclosure } from "@overworld/ui/journeys";
import { endpointLabel } from "@overworld/journeys";
import { Button, FieldGroup } from "@wintermuted/ui-react";
import { MultiSelect } from "@wintermuted/ui-react/select";
import FontAwesome from "react-fontawesome";
import type { RecentJourney } from "../../api/localstorage/recentJourneys";
import { EndpointMarker } from "./DirectionsStopPair";
import PlannerEndpointField from "./PlannerEndpointField";
import type { TripPlannerProps } from "./TripPlannerModel";
import type { TripPlannerState } from "./useTripPlannerState";

type TripPlannerFormProps = Pick<TripPlannerProps, "inSidebar" | "savedStops"> & {
  state: TripPlannerState;
};

export default function TripPlannerForm({ state, inSidebar, savedStops }: TripPlannerFormProps) {
  const {
    stopSummary, editStopsButton, focusBoardingStop, setEditingStops, searchFields,
    tripState, confirmPlace, fromNamedPlace, toNamedPlace, searchParams, recentTrips,
    chooseRecentTrip, catalogState, catalog, submit, fromLocation, toLocation,
    fromStop, toStop, swapEndpoints, locating, validationError,
  } = state;
  return (
      <PlannerDisclosure title="Plan a trip" headingId="transit-planner-title" edit={stopSummary ? {
        label: stopSummary.from.kind === "stop" && stopSummary.to.kind === "stop" ? "Edit stops" : "Edit locations",
        buttonRef: editStopsButton,
        onClick: () => {
          focusBoardingStop.current = true;
          setEditingStops(true);
        },
      } : undefined}>
        {stopSummary ? (
            <dl className={`transit-planner-stop-summary transit-planner-endpoint-pair${inSidebar ? " transit-planner-endpoint-pair--rail" : ""}`}>
              <div className="transit-planner-endpoint">
                <dt>{inSidebar && <EndpointMarker field="from" />}{stopSummary.from.kind === "stop" ? "Boarding stop" : "Origin"}</dt>
                <dd>{endpointLabel(stopSummary.from, stopSummary.response.from)}</dd>
              </div>
              <div className="transit-planner-endpoint">
                <dt>{inSidebar && <EndpointMarker field="to" />}{stopSummary.to.kind === "stop" ? "Destination stop" : "Destination"}</dt>
                <dd>{endpointLabel(stopSummary.to, stopSummary.response.to)}</dd>
              </div>
            </dl>
        ) : (
          <fieldset ref={searchFields} className="transit-planner-search-fields" disabled={tripState.status === "loading"}
            aria-label="Trip search">
        {!inSidebar && (
          <p className="transit-planner-intro">
            Plan between TriMet stops, street addresses, places, or coordinates.
          </p>
        )}
        {confirmPlace && (fromNamedPlace || toNamedPlace) && <p role="status" className="transit-planner-message">
          Confirm the approximate arrival point below, or enter a public entrance address. Finding trips does not verify public access.
          {searchParams.get("fromOrigin") === "device" ? " Origin uses your previously selected device location, not live tracking." :
            searchParams.get("fromOrigin") === "area" ? " Origin uses your previously selected map search center." :
              searchParams.get("fromOrigin") === "pin" ? " Origin uses your previously dropped pin." : ""}
        </p>}

        {recentTrips?.unavailable ? (
          <p className="transit-planner-message" role="status">Recent trips are unavailable on this device.</p>
        ) : recentTrips?.journeys.length > 0 && (
          <div className="transit-planner-recent">
            <FieldGroup label="Recent trips" htmlFor="planner-recent">
              <MultiSelect<RecentJourney, false>
                inputId="planner-recent"
                isMulti={false}
                options={recentTrips.journeys}
                value={null}
                onChange={chooseRecentTrip}
                getOptionLabel={({ from, to }) => `${from.desc} (${from.locid}) to ${to.desc} (${to.locid})`}
                getOptionValue={({ from, to }) => `${from.locid}-${to.locid}`}
                placeholder="Choose a recent trip"
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                maxMenuHeight={240}
                styles={{
                  control: base => ({ ...base, minHeight: "var(--wm-control-height)" }),
                  menu: base => ({ ...base, fontSize: "0.875rem" }),
                  menuPortal: base => ({ ...base, zIndex: 5 })
                }}
              />
            </FieldGroup>
          </div>
        )}

        {catalogState.loading && (
          <p role="status">
            {catalog ? "Refreshing stops…" : "Loading TriMet stops…"}
          </p>
        )}
        {catalogState.error && (
          <div role="alert" className="transit-planner-message">
            <p>
              The TriMet stop catalog could not be loaded.
              {catalog
                ? " The previously loaded stops are still available."
                : " Check your connection and try again."}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={catalogState.refresh}
            >
              Retry loading stops
            </Button>
          </div>
        )}

        <form className="transit-planner-form" onSubmit={submit}>
          <div className={`transit-planner-endpoint-pair transit-planner-endpoint-pair--editing${inSidebar ? " transit-planner-endpoint-pair--rail" : ""}`}>
            <div className="transit-planner-endpoint">
              {inSidebar && <EndpointMarker field="from" />}
              <PlannerEndpointField field="from" state={state} savedStops={savedStops} />
            </div>
            <Button type="button" size="sm" variant="secondary" className="transit-planner-swap"
              aria-label="Swap origin and destination"
              title="Swap origin and destination"
              disabled={!(fromLocation?.trim() || toLocation?.trim() ||
                (fromLocation === undefined && fromStop) || (toLocation === undefined && toStop))}
              onClick={swapEndpoints}>
              <FontAwesome name="exchange" aria-hidden="true" />
            </Button>
            <div className="transit-planner-endpoint">
              {inSidebar && <EndpointMarker field="to" />}
              <PlannerEndpointField field="to" state={state} savedStops={savedStops} />
            </div>
          </div>
          <p className="transit-planner-select-hint" id="planner-location-privacy">
            Nearest stop uses your location on this device only.
          </p>
          {locating && <p className="transit-planner-select-hint" role="status">Finding nearest stop…</p>}
          {(fromLocation === undefined || toLocation === undefined) &&
            <p className="transit-planner-select-hint">Search by stop ID, stop name, route name, or common place.</p>}
          {validationError && (
            <p className="transit-planner-message" role="alert">
              {validationError}
            </p>
          )}
          <Button
            type="submit"
            disabled={Boolean(locating) ||
              (fromLocation === undefined ? !fromStop || catalogState.loading : !fromLocation.trim()) ||
              (toLocation === undefined ? !toStop || catalogState.loading : !toLocation.trim())}
          >
            Find trips
          </Button>
        </form>
          </fieldset>
        )}
      </PlannerDisclosure>
  );
}
