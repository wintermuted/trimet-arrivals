import { Badge } from "@wintermuted/ui-react";
import { map } from "lodash";
import React, { useEffect, useState } from "react";
import FontAwesome from "react-fontawesome";
import { getArrivals } from "../../../../api/trimet/arrivals";
import { Arrival } from "../../../../api/trimet/interfaces/arrivals";
import { RouteDirectionStop } from "../../../../api/trimet/interfaces/routes";
import { StopData, TrimetRoute } from "../../../../api/trimet/interfaces/types";
import { getNearbyStops } from "../../../../api/trimet/stops";
import { getMatchingStopTime, reportedTime } from "../../util/tripTimes";
import { StopPredictionList, useTimeDisplay } from "@overworld/ui";

interface StopsOnRouteParams {
  remainingStopsOnRoute: RouteDirectionStop[];
  selectedArrival?: Arrival;
  repeatedStopIds?: number[];
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

function StopRoutes({
  routeDirectionStop,
}: {
  routeDirectionStop: RouteDirectionStop;
}) {
  const [stopData, setStopData] = useState<StopData>(null);

  useEffect(() => {
    async function fetchData() {
      if (routeDirectionStop) {
        const location = {
          coords: {
            latitude: routeDirectionStop.lat,
            longitude: routeDirectionStop.lng,
          },
        };

        const nearbyStopData = await getNearbyStops(location, 10);
        setStopData(nearbyStopData);
      }
    }

    fetchData();
  }, [routeDirectionStop]);

  return stopData && <RouteAtStop stopData={stopData} />;
}

export function StopsOnRoute({
  remainingStopsOnRoute,
  selectedArrival,
  repeatedStopIds = [],
}: StopsOnRouteParams) {
  const { timezone } = useTimeDisplay();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<PredictionsState>();
  const ids = Array.from(
    new Set(
      remainingStopsOnRoute
        .map((stop) => stop.locid)
        .filter((id) => !repeatedStopIds.includes(id)),
    ),
  );
  const key = JSON.stringify([
    selectedArrival?.id,
    selectedArrival?.tripID,
    selectedArrival?.route,
    selectedArrival?.dir,
    selectedArrival?.locid,
    ids,
  ]);
  const canFetch =
    !!selectedArrival?.tripID &&
    !!reportedTime(selectedArrival) &&
    ids.length > 0;

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
      setState((previous) => ({
        key,
        batches: groups.map((group) => {
          const last =
            previous?.key === key
              ? previous.batches.find(
                  (batch) => batch.ids.join(",") === group.join(","),
                )
              : undefined;
          return {
            ids: group,
            arrivals: last?.arrivals ?? null,
            error: false,
            loading: true,
          };
        }),
        loading: true,
      }));
      await Promise.all(
        groups.map(async (group) => {
          let result: { arrivals: Arrival[] | null; error: boolean };
          try {
            const data = await getArrivals(group.join(","), 60);
            if (
              !data ||
              "errorMessage" in data ||
              !Array.isArray(data.location) ||
              (data.arrival != null && !Array.isArray(data.arrival))
            ) {
              throw new Error("Invalid stop predictions response");
            }
            result = { arrivals: data.arrival ?? [], error: false };
          } catch {
            result = { arrivals: null, error: true };
          }
          if (active)
            setState((previous) => {
              if (!previous || previous.key !== key) return previous;
              const batches = previous.batches.map((batch) =>
                batch.ids.join(",") === group.join(",")
                  ? {
                      ...batch,
                      arrivals: result.error ? batch.arrivals : result.arrivals,
                      error: result.error,
                      loading: false,
                    }
                  : batch,
              );
              return {
                key,
                batches,
                loading: batches.some((batch) => batch.loading),
              };
            });
        }),
      );
      pending = false;
    }
    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [key, canFetch, retry]);

  const current = state?.key === key ? state : undefined;
  const hasError = current?.batches.some((batch) => batch.error);
  const hasRepeatedStops = remainingStopsOnRoute.some((stop) =>
    repeatedStopIds.includes(stop.locid),
  );

  return (
    <StopPredictionList
      updateNote={
        canFetch && (
          <>
            {timezone === "utc"
              ? "UTC"
              : timezone === "local"
                ? "Device local time"
                : "Pacific time"}
            {" · "}Updates every 30 seconds
          </>
        )
      }
      onRefresh={canFetch ? () => setRetry((value) => value + 1) : undefined}
      refreshLabel={
        !current || current.loading
          ? "Retry"
          : hasError
            ? "Try again"
            : "Refresh"
      }
      loading={
        canFetch &&
        (!current ||
          current.batches.some((batch) => batch.loading && !batch.arrivals))
      }
      error={
        hasError &&
        "Some stop predictions could not be loaded or refreshed. Last received times are labeled; try again."
      }
      notices={[
        ...(selectedArrival && !selectedArrival.tripID
          ? ["This departure has no trip ID; stop times are not reported."]
          : []),
        ...(hasRepeatedStops
          ? ["Times for repeated stops cannot be matched reliably."]
          : []),
      ]}
      stops={remainingStopsOnRoute.map((routeDirectionStop) => {
        const repeated = repeatedStopIds.includes(routeDirectionStop.locid);
        const batch = current?.batches.find((item) =>
          item.ids.includes(routeDirectionStop.locid),
        );
        const prediction =
          !repeated && selectedArrival && batch?.arrivals
            ? getMatchingStopTime(
                selectedArrival,
                batch.arrivals,
                routeDirectionStop.locid,
              )
            : undefined;
        const predictionLabel = !selectedArrival
          ? "Select a departure"
          : repeated ||
              !selectedArrival.tripID ||
              !reportedTime(selectedArrival)
            ? "Not reported"
            : !batch || (batch.loading && !batch.arrivals)
              ? "Loading..."
              : batch.error
                ? "Unavailable"
                : "Not reported";
        return {
          id: `${routeDirectionStop.locid}-${routeDirectionStop.seq}`,
          name: routeDirectionStop.desc,
          stopId: routeDirectionStop.locid,
          prediction,
          predictionLabel,
          stale: !!batch?.error,
          routes: <StopRoutes routeDirectionStop={routeDirectionStop} />,
        };
      })}
    />
  );
}
