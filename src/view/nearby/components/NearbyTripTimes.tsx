import { Button } from "@wintermuted/ui-theme/react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import { ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import { RouteDirectionStop } from "../../../api/trimet/interfaces/routes";
import { getTripTimes, StopTime, TripTime } from "../util/tripTimes";
import { TopNavBar } from "./common/TopNavBar";
import { useTimeDisplay } from "../../../component/time/TimeDisplay";
import { DirectionsStopPair } from "../../tripPlanner/DirectionsStopPair";

function TripStopTime({ time, today }: { time: StopTime; today: string }) {
  const { formatTime, formatDay } = useTimeDisplay();
  const day = formatDay(time.at, "America/Los_Angeles");
  return (
    <>
      <time dateTime={new Date(time.at).toISOString()}>
        {formatTime(time.at, "America/Los_Angeles")}
      </time>
      {day !== today && <small>{day}</small>}
      <small>{time.kind}</small>
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
  return trip.durationMs < 60000 ? "<1 min ride" : `${Math.round(trip.durationMs / 60000)} min ride`;
}

export default function NearbyTripTimes({
  routeId, direction, origin, destination, routeName, directionName, backTo, inline = false, selectedTrip
}: {
  routeId: number;
  direction: number;
  origin: RouteDirectionStop;
  destination: RouteDirectionStop;
  routeName: string;
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
            {rideDuration(selected)}
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
            <table className="transit-trip-times-table">
              <caption className="wm-sr-only">
                Departures from {origin.desc} and corresponding arrivals at {destination.desc}
              </caption>
              <thead><tr>
                <th scope="col">Departure<small>{origin.desc}</small></th>
                <th scope="col">Arrival<small>{destination.desc}</small></th>
              </tr></thead>
              <tbody>
                {trips.map(trip => (
                  <tr key={trip.id} className="transit-trip-selectable">
                    <td>
                      <Link
                        className="transit-trip-link"
                        to={tripUrl(trip)}
                        aria-label={`View trip departing at ${formatTime(trip.departure.at, "America/Los_Angeles")} ${timezoneLabel} from ${origin.desc} to ${destination.desc}`}
                      >
                        <TripStopTime time={trip.departure} today={today} />
                        <small className="transit-trip-action">View trip</small>
                      </Link>
                    </td>
                    <td>
                      {trip.arrival
                        ? <TripStopTime time={trip.arrival} today={today} />
                        : <span>Not reported</span>}
                      <small>
                        {rideDuration(trip)}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
