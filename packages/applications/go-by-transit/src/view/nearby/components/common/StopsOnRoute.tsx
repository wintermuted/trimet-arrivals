import {
  Badge,
  Accordion,
  Button,
  ListGroup,
  ListItem
} from "@wintermuted/ui-react";
import { map } from "lodash";
import React, { useEffect, useState } from "react";
import FontAwesome from "react-fontawesome";
import { getArrivals } from "../../../../api/trimet/arrivals";
import { Arrival } from "../../../../api/trimet/interfaces/arrivals";
import { RouteDirectionStop } from "../../../../api/trimet/interfaces/routes";
import { StopData, TrimetRoute } from "../../../../api/trimet/interfaces/types";
import { getNearbyStops } from "../../../../api/trimet/stops";
import { getMatchingStopTime, reportedTime, StopTime } from "../../util/tripTimes";
import { useTimeDisplay } from "@overworld/ui";

interface StopsOnRouteParams {
  remainingStopsOnRoute: RouteDirectionStop[];
  selectedArrival?: Arrival;
  repeatedStopIds?: number[];
}

interface StopOnRouteParams {
  routeDirectionStop: RouteDirectionStop;
  prediction: StopTime | undefined;
  predictionLabel: string;
  stale: boolean;
}

interface PredictionBatch {
  ids: number[];
  arrivals: Arrival[] | null;
  error: boolean;
  loading: boolean;
}

interface PredictionsState {
  key: string;
  batches: PredictionBatch[];
  loading: boolean;
}

function RouteAtStop({ stopData }: { stopData: StopData }) {
  const routes: TrimetRoute[] = stopData.location[0].route;

  return (
    <div className="route-at-stop">
      <FontAwesome name="bus" />
      {map(routes, (route: TrimetRoute) => {
        return (
          <Badge key={route.route} tone="neutral">
            {route.route}
          </Badge>
        );
      })}
    </div>
  );
}

function StopOnRoute({ routeDirectionStop, prediction, predictionLabel, stale }: StopOnRouteParams) {
  const { formatTime, formatDay } = useTimeDisplay();
  const [stopData, setStopData] = useState<StopData>(null);

  useEffect(() => {
    async function fetchData() {
      if (routeDirectionStop) {
        const location = {
          coords: {
            latitude: routeDirectionStop.lat,
            longitude: routeDirectionStop.lng
          }
        };

        const nearbyStopData = await getNearbyStops(location, 10);
        setStopData(nearbyStopData);
      }
    }

    fetchData();
  }, [routeDirectionStop]);

  return (
    <ListItem key={routeDirectionStop.locid}>
      <span>{routeDirectionStop.desc}</span>
      <small style={{ color: "var(--wm-color-text-muted)" }}>
        {" "}
        ({routeDirectionStop.locid})
      </small>
      <div className="transit-stop-prediction">
        {prediction ? <>
          <time dateTime={new Date(prediction.at).toISOString()}>
            {formatTime(prediction.at, "America/Los_Angeles")}
          </time>
          {formatDay(prediction.at, "America/Los_Angeles") !==
            formatDay(Date.now(), "America/Los_Angeles") &&
            ` ${formatDay(prediction.at, "America/Los_Angeles")}`}
          {" "}{prediction.kind}{stale && " · Last received"}
        </> : predictionLabel}
      </div>
      {stopData && <RouteAtStop stopData={stopData} />}
    </ListItem>
  );
}

export function StopsOnRoute({ remainingStopsOnRoute, selectedArrival, repeatedStopIds = [] }: StopsOnRouteParams) {
  const { timezone } = useTimeDisplay();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<PredictionsState>();
  const ids = Array.from(new Set(remainingStopsOnRoute
    .map(stop => stop.locid)
    .filter(id => !repeatedStopIds.includes(id))));
  const key = JSON.stringify([
    selectedArrival?.id, selectedArrival?.tripID, selectedArrival?.route,
    selectedArrival?.dir, selectedArrival?.locid, ids
  ]);
  const canFetch = !!selectedArrival?.tripID && !!reportedTime(selectedArrival) && ids.length > 0;

  useEffect(() => {
    if (!canFetch) return;
    let active = true;
    let pending = false;
    const groups: number[][] = [];
    for (let index = 0; index < ids.length; index += 128) {
      groups.push(ids.slice(index, index + 128));
    }

    async function load() {
      if (pending) return;
      pending = true;
      setState(previous => ({
        key,
        batches: groups.map(group => {
          const last = previous?.key === key
            ? previous.batches.find(batch => batch.ids.join(",") === group.join(","))
            : undefined;
          return { ids: group, arrivals: last?.arrivals ?? null, error: false, loading: true };
        }),
        loading: true
      }));
      await Promise.all(groups.map(async group => {
        let result: { arrivals: Arrival[] | null; error: boolean };
        try {
          const data = await getArrivals(group.join(","), 60);
          if (!data || "errorMessage" in data || !Array.isArray(data.location) ||
              (data.arrival != null && !Array.isArray(data.arrival))) {
            throw new Error("Invalid stop predictions response");
          }
          result = { arrivals: data.arrival ?? [], error: false };
        } catch {
          result = { arrivals: null, error: true };
        }
        if (active) setState(previous => {
          if (!previous || previous.key !== key) return previous;
          const batches = previous.batches.map(batch => batch.ids.join(",") === group.join(",")
            ? { ...batch, arrivals: result.error ? batch.arrivals : result.arrivals, error: result.error, loading: false }
            : batch);
          return { key, batches, loading: batches.some(batch => batch.loading) };
        });
      }));
      pending = false;
    }
    load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [key, canFetch, retry]);

  const current = state?.key === key ? state : undefined;
  const hasError = current?.batches.some(batch => batch.error);
  const hasRepeatedStops = remainingStopsOnRoute.some(stop => repeatedStopIds.includes(stop.locid));

  return (
    <Accordion
      open
      className="transit-stop-panel"
      title={<><FontAwesome name="map-marker" aria-hidden="true" /> Stops</>}
    >
      {canFetch && <div className="transit-stop-prediction-status">
        <span className="transit-trip-note">
          {timezone === "utc" ? "UTC" : timezone === "local" ? "Device local time" : "Pacific time"}
          {" · "}Updates every 30 seconds
        </span>
        <Button variant="secondary" onClick={() => setRetry(value => value + 1)}>
          {!current || current.loading ? "Retry" : hasError ? "Try again" : "Refresh"}
        </Button>
      </div>}
      {canFetch && (!current || current.batches.some(batch => batch.loading && !batch.arrivals)) &&
        <p role="status" className="transit-stop-prediction-message">Loading stop predictions...</p>}
      {hasError && <p role="alert" className="transit-stop-prediction-message">
        Some stop predictions could not be loaded or refreshed. Last received times are labeled; try again.
      </p>}
      {selectedArrival && !selectedArrival.tripID && <p className="transit-stop-prediction-message">
        This departure has no trip ID; stop times are not reported.
      </p>}
      {hasRepeatedStops && <p className="transit-stop-prediction-message">
        Times for repeated stops cannot be matched reliably.
      </p>}
      <ListGroup>
        {map(
          remainingStopsOnRoute,
          (routeDirectionStop: RouteDirectionStop) => {
            const repeated = repeatedStopIds.includes(routeDirectionStop.locid);
            const batch = current?.batches.find(item => item.ids.includes(routeDirectionStop.locid));
            const prediction = !repeated && selectedArrival && batch?.arrivals
              ? getMatchingStopTime(selectedArrival, batch.arrivals, routeDirectionStop.locid)
              : undefined;
            const predictionLabel = !selectedArrival ? "Select a departure" :
              repeated || !selectedArrival.tripID || !reportedTime(selectedArrival) ? "Not reported" :
                !batch || (batch.loading && !batch.arrivals) ? "Loading..." : batch.error ? "Unavailable" : "Not reported";
            return <StopOnRoute key={`${routeDirectionStop.locid}-${routeDirectionStop.seq}`}
              routeDirectionStop={routeDirectionStop} prediction={prediction}
              predictionLabel={predictionLabel} stale={!!batch?.error} />;
          }
        )}
      </ListGroup>
    </Accordion>
  );
}
