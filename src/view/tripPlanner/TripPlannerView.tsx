import { Button, FieldGroup } from "@wintermuted/ui-theme/react";
import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { readRecentJourneys, recordRecentJourney } from "../../api/localstorage/recentJourneys";
import {
  getStopCatalog,
  searchStopCatalog,
  StopCatalog,
  StopCatalogStop,
} from "../../api/trimet/stopCatalog";
import {
  planTrip,
  TripPlannerItinerary,
  TripPlannerLeg,
  TripPlannerResponse,
} from "../../api/trimet/tripplanner";
import "./TripPlannerView.scss";

const MAX_STOP_MATCHES = 10;

interface StopResolution {
  matches: StopCatalogStop[];
  stop?: StopCatalogStop;
}

interface CatalogState {
  catalog?: StopCatalog;
  error: boolean;
  loading: boolean;
}

type TripState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; response: TripPlannerResponse };

function resolveStopReference(
  stops: StopCatalogStop[],
  reference: string,
): StopResolution {
  const query = reference.trim().toLowerCase();
  if (!query) {
    return { matches: [] };
  }
  if (/^\d+$/.test(query)) {
    const stop = stops.find((item) => item.locid === Number(query));
    return { matches: stop ? [stop] : [], stop };
  }

  const matches = stops.filter(
    (stop) =>
      stop.desc.toLowerCase() === query ||
      stop.aliases.some((alias) => alias.toLowerCase() === query),
  );
  return { matches, stop: matches.length === 1 ? matches[0] : undefined };
}

function stopLabel(stop: StopCatalogStop): string {
  return `${stop.desc} (${stop.locid})`;
}

function formatStop(location?: TripPlannerLeg["from"]): string {
  if (!location?.description) {
    return "Stop information unavailable";
  }
  return location.stopId
    ? `${location.description} (${location.stopId})`
    : location.description;
}

function transferCount(itinerary: TripPlannerItinerary): number {
  return Math.max(
    0,
    itinerary.numberOfTransfers ??
      Math.max(
        0,
        itinerary.legs.filter((leg) => leg.mode && leg.mode !== "Walk").length -
          1,
      ),
  );
}

function legTitle(leg: TripPlannerLeg): string {
  if (leg.mode === "Walk") {
    return "Walk";
  }
  const routeName = leg.route?.name || leg.route?.number;
  return [leg.mode, routeName].filter(Boolean).join(" · ") || "Transit";
}

function ItineraryDetails({
  itinerary,
  index,
}: {
  itinerary: TripPlannerItinerary;
  index: number;
}) {
  let transitLegSeen = false;

  return (
    <div className="transit-planner-itinerary-detail">
      {itinerary.partial && (
        <p className="transit-planner-partial" role="status">
          Some details were missing from TriMet. Available leg information is
          shown below.
        </p>
      )}
      <ol aria-label={`Itinerary ${index + 1} steps`}>
        {itinerary.legs.map((leg, legIndex) => {
          const isTransit = leg.mode !== "Walk";
          const showTransfer = isTransit && transitLegSeen;
          if (isTransit) {
            transitLegSeen = true;
          }

          return (
            <React.Fragment key={leg.id || `${index}-${legIndex}`}>
              {showTransfer && (
                <li className="transit-planner-transfer">Transfer</li>
              )}
              <li className="transit-planner-leg">
                <div>
                  <strong>{legTitle(leg)}</strong>
                  {leg.direction && <span> · {leg.direction}</span>}
                </div>
                <p>
                  {formatStop(leg.from)} <span aria-hidden="true">→</span>{" "}
                  {formatStop(leg.to)}
                </p>
                {(leg.startTime || leg.endTime) && (
                  <p className="transit-planner-leg-time">
                    {leg.startTime || "Time unavailable"}
                    {leg.endTime ? `–${leg.endTime}` : ""}
                  </p>
                )}
                {(leg.duration !== undefined ||
                  leg.distance !== undefined) && (
                  <p className="transit-planner-leg-distance">
                    {leg.duration !== undefined && `${leg.duration} min`}
                    {leg.duration !== undefined &&
                      leg.distance !== undefined &&
                      " · "}
                    {leg.distance !== undefined &&
                      `${leg.distance.toFixed(2)} mi`}
                  </p>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
}

function itineraryLabel(itinerary: TripPlannerItinerary, index: number) {
  const transfers = transferCount(itinerary);
  return [
    `Option ${index + 1}`,
    itinerary.startTime && itinerary.endTime
      ? `${itinerary.startTime} to ${itinerary.endTime}`
      : undefined,
    itinerary.duration !== undefined ? `${itinerary.duration} min` : undefined,
    `${transfers} ${transfers === 1 ? "transfer" : "transfers"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function loadRecentTrips() {
  try {
    return { journeys: readRecentJourneys(), unavailable: false };
  } catch {
    return { journeys: [], unavailable: true };
  }
}

export default function TripPlannerView({ inSidebar = false, renderMapStatus }: {
  inSidebar?: boolean;
  renderMapStatus?: (itineraries: TripPlannerItinerary[], selected: number) => React.ReactNode;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";
  const [catalogState, setCatalogState] = useState<CatalogState>({
    error: false,
    loading: true,
  });
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [fromStop, setFromStop] = useState<StopCatalogStop>();
  const [toStop, setToStop] = useState<StopCatalogStop>();
  const [selectedItinerary, setSelectedItinerary] = useState(0);
  const [tripRetry, setTripRetry] = useState(0);
  const [tripState, setTripState] = useState<TripState>({ status: "idle" });
  const [validationError, setValidationError] = useState("");
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [recentTrips, setRecentTrips] = useState(() => inSidebar ? loadRecentTrips() : undefined);
  const fromInput = useRef<HTMLInputElement>(null);
  const toInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setCatalogState((previous) => ({
      ...previous,
      error: false,
      loading: true,
    }));

    getStopCatalog(catalogRetry > 0)
      .then((catalog) => {
        if (active) {
          setCatalogState({ catalog, error: false, loading: false });
        }
      })
      .catch(() => {
        if (active) {
          setCatalogState((previous) => ({
            ...previous,
            error: true,
            loading: false,
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [catalogRetry]);

  const catalog = catalogState.catalog;

  useEffect(() => {
    if (!catalog) {
      return;
    }

    const from = resolveStopReference(catalog.stops, fromParam);
    const to = resolveStopReference(catalog.stops, toParam);
    setFromStop(from.stop);
    setToStop(to.stop);
    setFromSearch(from.stop ? stopLabel(from.stop) : fromParam);
    setToSearch(to.stop ? stopLabel(to.stop) : toParam);
    setValidationError("");
  }, [catalog, fromParam, toParam]);

  useEffect(() => {
    setHistoryUnavailable(false);
    if (!catalog || !fromParam || !toParam) {
      setTripState({ status: "idle" });
      return;
    }

    const from = resolveStopReference(catalog.stops, fromParam);
    const to = resolveStopReference(catalog.stops, toParam);
    if (!from.stop || !to.stop) {
      setTripState({ status: "idle" });
      return;
    }
    if (from.stop.locid === to.stop.locid) {
      setTripState({
        status: "error",
        message: "Choose two different stops to plan a trip.",
      });
      return;
    }

    const controller = new AbortController();
    setTripState({ status: "loading" });
    setSelectedItinerary(0);
    planTrip({
      fromPlace: String(from.stop.locid),
      toPlace: String(to.stop.locid),
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }
        if (!response.success) {
          setTripState({
            status: "error",
            message:
              response.errorMessage ||
              "TriMet could not find a trip for these stops.",
          });
          return;
        }
        setTripState({ status: "ready", response });
        if (response.itineraries.length > 0) {
          try {
            recordRecentJourney(from.stop, to.stop);
            if (inSidebar) setRecentTrips(loadRecentTrips());
          } catch {
            setHistoryUnavailable(true);
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTripState({
            status: "error",
            message: "Could not load trip options from TriMet.",
          });
        }
      });

    return () => controller.abort();
  }, [catalog, fromParam, toParam, tripRetry, inSidebar]);

  const fromMatches = useMemo(
    () =>
      catalog
        ? searchStopCatalog(catalog.stops, fromSearch).slice(
            0,
            MAX_STOP_MATCHES,
          )
        : [],
    [catalog, fromSearch],
  );
  const toMatches = useMemo(
    () =>
      catalog
        ? searchStopCatalog(catalog.stops, toSearch).slice(0, MAX_STOP_MATCHES)
        : [],
    [catalog, toSearch],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    if (!fromStop || !toStop) {
      setValidationError("Choose a boarding stop and a destination stop.");
      return;
    }
    if (fromStop.locid === toStop.locid) {
      setValidationError("Choose two different stops to plan a trip.");
      return;
    }

    setSearchParams(
      { from: String(fromStop.locid), to: String(toStop.locid) },
    );
  }

  function chooseStop(
    stop: StopCatalogStop,
    field: "from" | "to",
  ) {
    if (field === "from") {
      setFromStop(stop);
      setFromSearch(stopLabel(stop));
    } else {
      setToStop(stop);
      setToSearch(stopLabel(stop));
    }
  }

  function renderStopField(field: "from" | "to") {
    const isFrom = field === "from";
    const search = isFrom ? fromSearch : toSearch;
    const selected = isFrom ? fromStop : toStop;
    const matches = isFrom ? fromMatches : toMatches;
    const label = isFrom ? "Boarding stop" : "Destination stop";
    const id = isFrom ? "planner-from" : "planner-to";
    const inputRef = isFrom ? fromInput : toInput;
    const inputMatchesSelected =
      selected && search.toLowerCase() === stopLabel(selected).toLowerCase();
    const reference = isFrom ? fromParam : toParam;
    const referenceResolution =
      catalog && reference
        ? resolveStopReference(catalog.stops, reference)
        : undefined;
    const searchMatchesReference =
      search.trim().toLowerCase() === reference.trim().toLowerCase();

    return (
      <div className="transit-planner-stop-field">
        <FieldGroup label={label} htmlFor={id}>
          <input
            id={id}
            ref={inputRef}
            className="wm-input"
            type="search"
            autoComplete="off"
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              if (isFrom) {
                setFromSearch(value);
                if (!selected || value !== stopLabel(selected)) {
                  setFromStop(undefined);
                }
              } else {
                setToSearch(value);
                if (!selected || value !== stopLabel(selected)) {
                  setToStop(undefined);
                }
              }
              setValidationError("");
            }}
          />
        </FieldGroup>
        {selected && (
          <p className="transit-planner-selected-stop" role="status">
            Selected: {stopLabel(selected)}
          </p>
        )}
        {!selected &&
          searchMatchesReference &&
          referenceResolution &&
          referenceResolution.matches.length > 1 && (
          <p className="transit-planner-field-message" role="alert">
            This stop name matches multiple platforms. Choose the correct stop
            from the results.
          </p>
        )}
        {!selected &&
          searchMatchesReference &&
          referenceResolution &&
          referenceResolution.matches.length === 0 && (
            <p className="transit-planner-field-message" role="alert">
              The linked stop “{reference}” was not found. Search by stop name
              or ID and choose a result.
            </p>
          )}
        {search && !inputMatchesSelected && (
          <ul
            id={`${id}-matches`}
            className="transit-planner-stop-matches"
            aria-label={`${label} search results`}
          >
            {matches.map((stop) => (
              <li key={stop.locid}>
                <button
                  type="button"
                  aria-pressed={selected?.locid === stop.locid}
                  onClick={() => {
                    chooseStop(stop, field);
                    inputRef.current?.focus();
                  }}
                >
                  <span>{stop.desc}</span>
                  <small>Stop {stop.locid}</small>
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="transit-planner-no-matches" role="status">
                No stops match. Search by a different name or stop ID.
              </li>
            )}
          </ul>
        )}
      </div>
    );
  }

  const response =
    tripState.status === "ready" ? tripState.response : undefined;
  const itineraries = response?.itineraries || [];
  const activeItinerary = itineraries[selectedItinerary];

  return (
    <section
      className={`transit-planner${inSidebar ? " transit-planner--sidebar" : ""}`}
      aria-labelledby="transit-planner-title"
    >
      <header className="transit-planner-header">
        <h2 id="transit-planner-title">Plan a trip</h2>
        {!inSidebar && (
          <p>
            Choose any two TriMet stops. Search by stop name or ID; addresses are
            not supported.
          </p>
        )}
      </header>

      {recentTrips?.unavailable ? (
        <p className="transit-planner-message" role="status">Recent trips are unavailable on this device.</p>
      ) : recentTrips?.journeys.length > 0 && (
        <details className="transit-planner-recent">
          <summary>Recent trips</summary>
          <ul className="transit-planner-stop-matches">
            {recentTrips.journeys.map(({ from, to }) => (
              <li key={`${from.locid}-${to.locid}`}>
                <button type="button" onClick={() => {
                  const params = { from: String(from.locid), to: String(to.locid) };
                  if (params.from === fromParam && params.to === toParam) {
                    const origin = catalog?.stops.find(stop => stop.locid === from.locid);
                    const destination = catalog?.stops.find(stop => stop.locid === to.locid);
                    if (origin && destination) {
                      chooseStop(origin, "from");
                      chooseStop(destination, "to");
                      setValidationError("");
                    }
                    setTripRetry(value => value + 1);
                  } else {
                    setSearchParams(params);
                  }
                }}>
                  {from.desc} ({from.locid}) to {to.desc} ({to.locid})
                </button>
              </li>
            ))}
          </ul>
        </details>
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
            onClick={() => setCatalogRetry((value) => value + 1)}
          >
            Retry loading stops
          </Button>
        </div>
      )}

      <form className="transit-planner-form" onSubmit={submit}>
        {renderStopField("from")}
        {renderStopField("to")}
        {validationError && (
          <p className="transit-planner-message" role="alert">
            {validationError}
          </p>
        )}
        <Button
          type="submit"
          disabled={!fromStop || !toStop || catalogState.loading}
        >
          Find trips
        </Button>
      </form>

      {tripState.status === "loading" && (
        <p className="transit-planner-message" role="status">
          Finding trips…
        </p>
      )}
      {tripState.status === "error" && (
        <div className="transit-planner-message" role="alert">
          <p>{tripState.message}</p>
          {fromParam && toParam && (
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
      {tripState.status === "idle" && !fromParam && !toParam && (
        <p className="transit-planner-message" role="status">
          Select a boarding stop and destination to see trip options.
        </p>
      )}
      {tripState.status === "idle" && Boolean(fromParam || toParam) && (
        <p className="transit-planner-message" role="status">
          Choose valid stops from the service-wide catalog to plan this trip.
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
      {tripState.status === "ready" && itineraries.length === 0 && (
        <p className="transit-planner-message" role="status">
          No trips were found between these stops. Try another pair of stops.
        </p>
      )}
      {activeItinerary && (
        <section
          className="transit-planner-results"
          aria-label="Trip options"
        >
          {renderMapStatus?.(itineraries, selectedItinerary)}
          {itineraries.length > 1 && (
            <fieldset className="transit-planner-options">
              <legend>Choose a trip</legend>
              {itineraries.map((itinerary, index) => (
                <label key={itinerary.id || index}>
                  <input
                    type="radio"
                    name="planner-itinerary"
                    checked={selectedItinerary === index}
                    onChange={() => setSelectedItinerary(index)}
                  />
                  <span>{itineraryLabel(itinerary, index)}</span>
                </label>
              ))}
            </fieldset>
          )}
          <div className="transit-planner-summary">
            <h3>
              {activeItinerary.startTime && activeItinerary.endTime
                ? `${activeItinerary.startTime}–${activeItinerary.endTime}`
                : "Trip details"}
            </h3>
            <p>
              {activeItinerary.duration !== undefined &&
                `${activeItinerary.duration} min`}
              {activeItinerary.duration !== undefined && " · "}
              {transferCount(activeItinerary)}{" "}
              {transferCount(activeItinerary) === 1 ? "transfer" : "transfers"}
              {activeItinerary.distance !== undefined &&
                ` · ${activeItinerary.distance.toFixed(2)} mi`}
              {activeItinerary.fare !== undefined &&
                ` · $${activeItinerary.fare.toFixed(2)} regular fare`}
            </p>
          </div>
          <ItineraryDetails
            itinerary={activeItinerary}
            index={selectedItinerary}
          />
        </section>
      )}
    </section>
  );
}
