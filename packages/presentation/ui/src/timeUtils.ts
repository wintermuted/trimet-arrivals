import { round } from "lodash";
import { formatDisplayTime } from "./TimeDisplay";

export function isValidTimestamp(time: number): boolean {
  return Number.isFinite(time) && time > 0;
}

export function getFormattedTime(arrival: number): string {
  const formatted = formatDisplayTime(arrival, "12h", "default");
  return isValidTimestamp(arrival)
    ? formatted.replace(/\s/g, "").toLowerCase()
    : formatted;
}

export function getFormattedLoadTime(time: number): string {
  if (!isValidTimestamp(time)) {
    return "Time unavailable";
  }
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(time);
  const clock = formatDisplayTime(time, "12h", "default", undefined, true)
    .replace(/\s+/g, " ").toLowerCase();
  return `${weekday}, ${clock}`;
}

export function getNormalizedTimeDifference(time: number, toTime: number): string {
  const minutesUntilArrival = getTimeDifferenceInMinutes(time, toTime);
  if (minutesUntilArrival === null) {
    return "Time unavailable";
  }
  if (time <= toTime) {
    return "Due";
  }

  return minutesUntilArrival >= 60
    ? `${round((time - toTime) / 3600000, 1)} hrs`
    : `${minutesUntilArrival} min`;
}

export function getTimeDifferenceInMinutes(time: number, toTime: number): number | null {
  if (!isValidTimestamp(time) || !isValidTimestamp(toTime)) {
    return null;
  }
  const minutes = Math.trunc((time - toTime) / 60000);
  return minutes === 0 ? 0 : minutes;
}

export function getTimeUntilArrival(
  estimatedArrivalTime: number,
  scheduledArrivalTime: number
): string {
  const now = Date.now();
  const timeStampToDiff = isValidTimestamp(estimatedArrivalTime)
    ? estimatedArrivalTime
    : scheduledArrivalTime;
  return getNormalizedTimeDifference(timeStampToDiff, now);
}
