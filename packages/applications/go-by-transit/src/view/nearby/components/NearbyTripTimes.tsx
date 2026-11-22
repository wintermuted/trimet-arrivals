import { Button } from "@wintermuted/ui-theme/react";
import { faBus, faCableCar, faRoute, faTrain, faTrainTram } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import { ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import { RouteDirectionStop } from "../../../api/trimet/interfaces/routes";
import type { StopMode } from "../../../api/trimet/stopCatalog";
import { getTripTimes, StopTime, TripTime } from "../util/tripTimes";
import { TopNavBar } from "./common/TopNavBar";
import { useTimeDisplay } from "@overworld/ui";
import { DirectionsStopPair } from "../../tripPlanner/DirectionsStopPair";

const routeIcons: Record<StopMode, typeof faBus> = {
  Bus: faBus, Rail: faTrain, Streetcar: faTrainTram, "Aerial tram": faCableCar
};

function TripClock({ time }: { time: StopTime }) {
  const { formatTime } = useTimeDisplay();
  return <time dateTime={new Date(time.at).toISOString()}>{formatTime(time.at, "America/Los_Angeles")}</time>;
}

function TripTimeStatus({ time, today }: { time: StopTime; today: string }) {
  const { formatDay } = useTimeDisplay();
  const day = formatDay(time.at, "America/Los_Angeles");
  return <>{time.kind}{day !== today && ` · ${day}`}</>;
}

function TripStopTime({ time, today }: { time: StopTime; today: string }) {
  return (
    <>
      <TripClock time={time} />
      <small><TripTimeStatus time={time} today={today} /></small>
    </>
  );
}

interface TimesState {
  key: string;
  data: ArrivalData | null;
  loading: boolean;
  error: boolean;
}

function rideDuration(trip: TripTime): string {
  if (trip.durationMs === undefined) return "Travel time unavailable";
  return trip.durationMs < 60000 ? "<1 min" : `${Math.round(trip.durationMs / 60000)} min`;
}

export default function NearbyTripTimes({
  routeId, direction, origin, destination, routeName, routeMode, directionName, backTo, inline = false, selectedTrip
}: {
  routeId: number;
  direction: number;
  origin: RouteDirectionStop;
  destination: RouteDirectionStop;
  routeName: string;
  routeMode?: StopMode;
  directionName: string;
  backTo: string;
  inline?: boolean;
  selectedTrip?: { departureId: string; tripId?: string };
}) {
  const { formatTime, formatDay, timezone } = useTimeDisplay();
  const from = origin.locid;
  const to = destination.locid;
  const key = `${routeId}-${direction}-${from}-${to}`;
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<TimesState>({
    key, data: null, loading: true, error: false
  });

  useEffect(() => {
    let active = true;
    let pending = false;
    async function load() {
      if (pending) {
        return;
      }
      pending = true;
      setState(previous => ({
        key, data: previous.key === key ? previous.data : null, loading: true, error: false
      }));
      try {
        const data = await getArrivals(`${from},${to}`, 60);
        if (!data || "errorMessage" in data || !Array.isArray(data.arrival) ||
            !Number.isFinite(Number(data.queryTime)) || Number(data.queryTime) <= 0) {
          throw new Error("Invalid trip times response");
        }
        if (active) {
          setState({ key, data, loading: false, error: false });
        }
      } catch {
        if (active) {
          setState(previous => ({ ...previous, loading: false, error: true }));
        }
      } finally {
        pending = false;
      }
    }
    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [key, from, to, retry]);

  const current = state.key === key ? state : null;
  const data = current?.data;
  const trips = data ? getTripTimes(data.arrival, routeId, direction, from, to, selectedTrip ? 0 : Date.now()) : [];
  const selected = selectedTrip && trips.find(trip =>
    trip.id === selectedTrip.departureId &&
    (!selectedTrip.tripId || trip.tripId === selectedTrip.tripId)
  );
  const today = formatDay(Date.now(), "America/Los_Angeles");
  const timezoneLabel = timezone === "utc"
    ? "UTC"
    : timezone === "local"
      ? "device local time"
      : "Pacific";
  const loading = !current || current.loading;

  function tripUrl(trip: TripTime) {
    const query = new URLSearchParams({
      route: String(routeId), direction: String(direction),
      from: String(from), to: String(to), departure: trip.id
    });
    if (trip.tripId) {
      query.set("trip", trip.tripId);
    }
    if (!inline) {
      query.set("source", "arrivals");
    }
    return `/nearby/directions/trip?${query}`;
  }

  return (
    <div className={inline ? "transit-directions" : "scrollarea transit-directions"}>
      {inline ? (
        <h4>Departure and arrival times</h4>
      ) : (
        <>
          <TopNavBar
            id={selectedTrip ? routeName : "Trip times"}
            subtitle={selectedTrip ? `To ${destination.desc}` : undefined}
            backTo={backTo}
          />
          {selectedTrip ? (
            <div>
              <h4>Trip details</h4>
              <p className="transit-trip-note">
                {selectedTrip.tripId ? `Trip ${selectedTrip.tripId}` : "Trip ID not reported"}
              </p>
            </div>
          ) : <div>
            <h4>{routeName}</h4>
            <p>{directionName}</p>
          </div>}
          {!selectedTrip && <dl className="transit-trip-stops">
            <div><dt>Board at</dt><dd>{origin.desc} ({from})</dd></div>
            <div><dt>Get off at</dt><dd>{destination.desc} ({to})</dd></div>
          </dl>}
        </>
      )}
      {selectedTrip && (
        <div className="transit-planner-leg transit-selected-trip">
          <DirectionsStopPair
            from={<>
              <span className="transit-selected-trip-label">Board at</span>
              <strong>{origin.desc} ({from})</strong>
              {selected && <div className="transit-selected-trip-time">
                <TripStopTime time={selected.departure} today={today} />
              </div>}
            </>}
            to={<>
              <span className="transit-selected-trip-label">Get off at</span>
              <strong>{destination.desc} ({to})</strong>
              {selected && <div className="transit-selected-trip-time">
                {selected.arrival
                  ? <TripStopTime time={selected.arrival} today={today} />
                  : <span>Arrival not reported</span>}
              </div>}
            </>}
          />
          {selected && <p className="transit-planner-leg-duration transit-planner-leg-distance">
            {rideDuration(selected)}{selected.durationMs !== undefined && " ride"}
          </p>}
        </div>
      )}
      <div className="transit-trip-refresh">
        <p className="transit-trip-note">
          {data
            ? `Updated ${formatTime(Number(data.queryTime), "America/Los_Angeles")} ${timezoneLabel}`
            : `Times in ${timezoneLabel}`}
        </p>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => setRetry(value => value + 1)}
        >
          {loading ? "Refreshing..." : current?.error ? "Try again" : "Refresh"}
        </Button>
      </div>
      {loading && !data && <p role="status">Loading departures and destination times...</p>}
      {current?.error && (
        <p role="alert">
          {data
            ? "Could not refresh trip times. Showing the last received times; try again."
            : "Could not load trip times for these stops. Try again."}
        </p>
      )}
      {data && (
        <>
          {!selectedTrip && trips.length > 0 && (
            <ol className="transit-planner-options transit-upcoming-trips" role="list"
              aria-label={`Upcoming trips from ${origin.desc} to ${destination.desc} (times in ${timezoneLabel})`}>
              {trips.map(trip => (
                <li key={trip.id}>
                  <Link className="transit-planner-option transit-trip-link" to={tripUrl(trip)}>
                    <span className="transit-planner-option-timing">
                      <strong>
                        <span className="wm-sr-only">View trip departing at </span>
                        <TripClock time={trip.departure} />
                        {trip.arrival && <> to <TripClock time={trip.arrival} /></>}
                      </strong>
                      {trip.durationMs !== undefined && (
                        <span className="transit-planner-option-duration">
                          {rideDuration(trip)}<span className="wm-sr-only"> ride</span>
                        </span>
                      )}
                    </span>
                    <span className="transit-planner-option-route">
                      <span className="transit-planner-option-leg">
                        <FontAwesomeIcon className="transit-upcoming-trip-icon"
                          icon={routeMode ? routeIcons[routeMode] : faRoute} aria-hidden="true" />
                        <span>{routeName}</span>
                      </span>
                    </span>
                    <span className="transit-planner-option-meta">
                      Departure: <TripTimeStatus time={trip.departure} today={today} />
                      {" · "}
                      {trip.arrival ? <>Arrival: <TripTimeStatus time={trip.arrival} today={today} /></>
                        : "Arrival not reported"}
                      {trip.durationMs === undefined && <> · {rideDuration(trip)}</>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {(selectedTrip ? !selected : trips.length === 0) && (
            selectedTrip ? (
              <div role="status">
                <p>This trip is no longer reported for these stops. It may have departed or its predictions may be unavailable.</p>
                <Link to={backTo}>Choose another trip</Link>
              </div>
            ) : <p role="status">No upcoming boardable trips with reported times. Refresh or choose different stops.</p>
          )}
          {!selectedTrip && trips.some(trip => !trip.arrival) && (
            <p className="transit-trip-note">
              Some destination times are not yet reported.
            </p>
          )}
          <p className="transit-trip-note">
            Updates every 30 seconds. Boarding and travel times are approximate.
            Canceled, uncertain and drop-off-only departures are excluded.
          </p>
        </>
      )}
    </div>
  );
}
