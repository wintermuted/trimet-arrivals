import { Button } from "@wintermuted/ui-theme/react";
import React, { useEffect, useState } from "react";
import { getArrivals } from "../../../api/trimet/arrivals";
import { ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import { RouteDirectionStop } from "../../../api/trimet/interfaces/routes";
import { dayFormat, getTripTimes, StopTime, timeFormat } from "../util/tripTimes";
import { TopNavBar } from "./common/TopNavBar";

function TripStopTime({ time, today }: { time: StopTime; today: string }) {
  const day = dayFormat.format(time.at);
  return (
    <>
      <time dateTime={new Date(time.at).toISOString()}>{timeFormat.format(time.at)}</time>
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

export default function NearbyTripTimes({
  routeId, direction, origin, destination, routeName, directionName, backTo, inline = false
}: {
  routeId: number;
  direction: number;
  origin: RouteDirectionStop;
  destination: RouteDirectionStop;
  routeName: string;
  directionName: string;
  backTo: string;
  inline?: boolean;
}) {
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
  const trips = data ? getTripTimes(data.arrival, routeId, direction, from, to, Date.now()) : [];
  const today = dayFormat.format(Date.now());
  const loading = !current || current.loading;

  return (
    <div className={inline ? "transit-directions" : "scrollarea transit-directions"}>
      {inline ? (
        <h4>Departure and arrival times</h4>
      ) : (
        <>
          <TopNavBar id="Trip times" backTo={backTo} />
          <div>
            <h4>{routeName}</h4>
            <p>{directionName}</p>
          </div>
          <dl className="transit-trip-stops">
            <div><dt>Board at</dt><dd>{origin.desc} ({from})</dd></div>
            <div><dt>Get off at</dt><dd>{destination.desc} ({to})</dd></div>
          </dl>
        </>
      )}
      <div className="transit-trip-refresh">
        <p className="transit-trip-note">
          {data
            ? `Updated ${timeFormat.format(Number(data.queryTime))} Pacific`
            : "Times in Portland (Pacific)"}
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
          {trips.length > 0 ? (
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
                  <tr key={trip.id}>
                    <td><TripStopTime time={trip.departure} today={today} /></td>
                    <td>
                      {trip.arrival
                        ? <TripStopTime time={trip.arrival} today={today} />
                        : <span>Not reported</span>}
                      <small>
                        {trip.durationMs === undefined ? "Travel time unavailable" : trip.durationMs < 60000
                          ? "<1 min ride" : `${Math.round(trip.durationMs / 60000)} min ride`}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p role="status">No upcoming boardable trips with reported times. Refresh or choose different stops.</p>
          )}
          {trips.some(trip => !trip.arrival) && (
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
