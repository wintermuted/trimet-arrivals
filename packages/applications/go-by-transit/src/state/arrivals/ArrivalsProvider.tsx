import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { getFormattedLoadTime } from "@overworld/ui";
import { getArrivals } from "../../api/trimet/arrivals";
import type {
  Arrival,
  ArrivalData,
} from "../../api/trimet/interfaces/arrivals";
import formatStopLocations, {
  type StopLocationsDictionary,
} from "./formatStopLocations";

const REFRESH_INTERVAL = 30000;

interface StopArrivals {
  arrivals?: Arrival[];
  loading: boolean;
  error?: string;
  nextRefreshAt: number | null;
}

interface State {
  stops: Record<number, StopArrivals>;
  locations: StopLocationsDictionary;
  lastSuccess: number | null;
}

type Action =
  | { type: "loading"; id: number }
  | { type: "scheduled"; id: number; nextRefreshAt: number | null }
  | { type: "loaded"; id: number; data: ArrivalData; at: number }
  | { type: "failed"; id: number; error: string };

const initialState: State = { stops: {}, locations: {}, lastSuccess: null };
const initialStop: StopArrivals = { loading: false, nextRefreshAt: null };

function reducer(state: State, action: Action): State {
  const previous = state.stops[action.id] || initialStop;
  if (action.type === "loaded") {
    const origin = action.data.location.find(
      (location) => location.id === action.id,
    );
    const locations = formatStopLocations([origin], {
      latitude: origin.lat,
      longitude: origin.lng,
    });
    return {
      stops: {
        ...state.stops,
        [action.id]: {
          ...previous,
          arrivals: action.data.arrival.filter(
            (arrival) => arrival.locid === action.id,
          ),
          loading: false,
          error: undefined,
        },
      },
      locations: { ...state.locations, ...locations },
      lastSuccess: action.at,
    };
  }
  const stop =
    action.type === "loading"
      ? { ...previous, loading: true, error: undefined }
      : action.type === "failed"
        ? { ...previous, loading: false, error: action.error }
        : { ...previous, nextRefreshAt: action.nextRefreshAt };
  return { ...state, stops: { ...state.stops, [action.id]: stop } };
}

interface Subscription {
  consumers: number;
  pollers: number;
  timer?: ReturnType<typeof setInterval>;
  pending?: Promise<void>;
}

interface Commands {
  subscribe: (id: number, poll: boolean) => () => void;
  refresh: (id: number) => Promise<void>;
}

const StateContext = createContext<State | undefined>(undefined);
const CommandsContext = createContext<Commands | undefined>(undefined);
const RefreshTimeContext = createContext<number | null | undefined>(undefined);

function validateResponse(data: ArrivalData, id: number) {
  if (
    !data ||
    !Array.isArray(data.arrival) ||
    !Array.isArray(data.location) ||
    !data.location.some((location) => location.id === id) ||
    data.arrival.some(
      (arrival) => !arrival || !Number.isFinite(arrival.locid),
    ) ||
    data.location.some(
      (location) =>
        !Number.isFinite(location.id) ||
        !Number.isFinite(location.lat) ||
        !Number.isFinite(location.lng) ||
        Math.abs(location.lat) > 90 ||
        Math.abs(location.lng) > 180 ||
        typeof location.desc !== "string",
    )
  ) {
    throw new Error("Invalid arrival response");
  }
}

export function ArrivalsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const subscriptions = useRef(new Map<number, Subscription>());
  const commands = useMemo<Commands>(() => {
    const current = (id: number, subscription: Subscription) =>
      subscriptions.current.get(id) === subscription;

    function load(id: number, subscription: Subscription): Promise<void> {
      if (subscription.pending) return subscription.pending;
      dispatch({ type: "loading", id });
      const pending = Promise.resolve()
        .then(() =>
          current(id, subscription) ? getArrivals(String(id), 45) : undefined,
        )
        .then((data) => {
          if (current(id, subscription)) {
            validateResponse(data, id);
            dispatch({ type: "loaded", id, data, at: Date.now() });
          }
        })
        .catch(() => {
          if (current(id, subscription)) {
            dispatch({
              type: "failed",
              id,
              error: `Unable to load arrivals for stop ${id}. Please try again.`,
            });
          }
        })
        .finally(() => {
          subscription.pending = undefined;
        });
      subscription.pending = pending;
      return pending;
    }

    function schedule(id: number, subscription: Subscription) {
      clearInterval(subscription.timer);
      subscription.timer = undefined;
      const nextRefreshAt =
        subscription.pollers > 0 ? Date.now() + REFRESH_INTERVAL : null;
      dispatch({ type: "scheduled", id, nextRefreshAt });
      if (subscription.pollers > 0) {
        subscription.timer = setInterval(() => {
          if (!current(id, subscription)) return;
          dispatch({
            type: "scheduled",
            id,
            nextRefreshAt: Date.now() + REFRESH_INTERVAL,
          });
          void load(id, subscription);
        }, REFRESH_INTERVAL);
      }
    }

    return {
      subscribe(id, poll) {
        let subscription = subscriptions.current.get(id);
        if (!subscription) {
          subscription = { consumers: 0, pollers: 0 };
          subscriptions.current.set(id, subscription);
        }
        subscription.consumers++;
        if (poll) {
          subscription.pollers++;
          if (subscription.pollers === 1) schedule(id, subscription);
        }
        if (subscription.consumers === 1) void load(id, subscription);
        const retained = subscription;
        return () => {
          if (!current(id, retained)) return;
          retained.consumers--;
          if (poll) {
            retained.pollers--;
            if (retained.pollers === 0) schedule(id, retained);
          }
          if (retained.consumers === 0) {
            clearInterval(retained.timer);
            subscriptions.current.delete(id);
          }
        };
      },
      refresh(id) {
        const subscription = subscriptions.current.get(id);
        if (!subscription)
          throw new Error(`Stop ${id} has no active arrival consumer`);
        if (!subscription.pending) schedule(id, subscription);
        return load(id, subscription);
      },
    };
  }, []);

  useEffect(
    () => () => {
      for (const subscription of subscriptions.current.values()) {
        clearInterval(subscription.timer);
      }
      subscriptions.current.clear();
    },
    [],
  );

  return (
    <CommandsContext.Provider value={commands}>
      <RefreshTimeContext.Provider value={state.lastSuccess}>
        <StateContext.Provider value={state}>{children}</StateContext.Provider>
      </RefreshTimeContext.Provider>
    </CommandsContext.Provider>
  );
}

export function useStopArrivals(id: number, poll = false) {
  const state = useContext(StateContext);
  const commands = useContext(CommandsContext);
  if (!state || !commands) {
    throw new Error("Arrival consumers require ArrivalsProvider");
  }
  useEffect(() => commands.subscribe(id, poll), [commands, id, poll]);
  const refresh = useCallback(() => {
    void commands.refresh(id);
  }, [commands, id]);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!poll) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [id, poll]);

  return {
    ...(state.stops[id] || { ...initialStop, loading: true }),
    stopLocation: state.locations[id],
    refresh,
    now,
  };
}

export function useArrivalRefreshTime() {
  const at = useContext(RefreshTimeContext);
  if (at === undefined)
    throw new Error("Refresh status requires ArrivalsProvider");
  return at === null ? "" : getFormattedLoadTime(at);
}
