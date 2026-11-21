export { getMatchingStopTime, getTripTimes, reportedTime } from "@trimet-arrivals/trimet-client";
export type { StopTime, TripTime } from "@trimet-arrivals/trimet-client";

export const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit"
});
export const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric"
});
