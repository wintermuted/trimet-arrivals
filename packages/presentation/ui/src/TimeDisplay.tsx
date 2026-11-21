import React, { createContext, useContext, useMemo, useState } from "react";
import {
  fetchStoredTimeFormat,
  fetchStoredTimezone,
  storeTimeFormat,
  storeTimezone,
  TimeFormat,
  TimezonePreference
} from "./timePreferences";

export function formatDisplayTime(
  timestamp: number,
  format: TimeFormat,
  timezone: TimezonePreference,
  defaultTimeZone?: string,
  seconds = false
): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "Time unavailable";
  }
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    ...(format === "12h" ? { hour12: true } : { hourCycle: "h23" })
  };
  if (seconds) {
    options.second = "2-digit";
  }
  if (timezone === "utc") {
    options.timeZone = "UTC";
  } else if (timezone === "default" && defaultTimeZone) {
    options.timeZone = defaultTimeZone;
  }
  return new Intl.DateTimeFormat("en-US", options).format(timestamp);
}

export function formatDisplayDay(
  timestamp: number,
  timezone: TimezonePreference,
  defaultTimeZone?: string
): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "Date unavailable";
  }
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric"
  };
  if (timezone === "utc") {
    options.timeZone = "UTC";
  } else if (timezone === "default" && defaultTimeZone) {
    options.timeZone = defaultTimeZone;
  }
  return new Intl.DateTimeFormat("en-US", options).format(timestamp);
}

export function formatDisplayDate(
  timestamp: number,
  timezone: TimezonePreference,
  defaultTimeZone?: string
): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "Date unavailable";
  }
  const options: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit"
  };
  if (timezone === "utc") {
    options.timeZone = "UTC";
  } else if (timezone === "default" && defaultTimeZone) {
    options.timeZone = defaultTimeZone;
  }
  return new Intl.DateTimeFormat("en-US", options).format(timestamp);
}

export interface TimeDisplayContextValue {
  format: TimeFormat;
  timezone: TimezonePreference;
  storageError: boolean;
  setFormat: (format: TimeFormat) => void;
  setTimezone: (timezone: TimezonePreference) => void;
  formatTime: (
    timestamp: number,
    defaultTimeZone?: string,
    seconds?: boolean
  ) => string;
  formatDay: (timestamp: number, defaultTimeZone?: string) => string;
  formatDate: (timestamp: number, defaultTimeZone?: string) => string;
}

const defaultValue: TimeDisplayContextValue = {
  format: "12h",
  timezone: "default",
  storageError: false,
  setFormat: () => undefined,
  setTimezone: () => undefined,
  formatTime: (timestamp, defaultTimeZone, seconds) =>
    formatDisplayTime(timestamp, "12h", "default", defaultTimeZone, seconds),
  formatDay: (timestamp, defaultTimeZone) =>
    formatDisplayDay(timestamp, "default", defaultTimeZone),
  formatDate: (timestamp, defaultTimeZone) =>
    formatDisplayDate(timestamp, "default", defaultTimeZone)
};

const TimeDisplayContext = createContext(defaultValue);

export function TimeDisplayProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [format, setFormatState] = useState(fetchStoredTimeFormat);
  const [timezone, setTimezoneState] = useState(fetchStoredTimezone);
  const [storageError, setStorageError] = useState(false);

  const value = useMemo<TimeDisplayContextValue>(
    () => ({
      format,
      timezone,
      storageError,
      setFormat: next => {
        setFormatState(next);
        setStorageError(!storeTimeFormat(next));
      },
      setTimezone: next => {
        setTimezoneState(next);
        setStorageError(!storeTimezone(next));
      },
      formatTime: (timestamp, defaultTimeZone, seconds) =>
        formatDisplayTime(timestamp, format, timezone, defaultTimeZone, seconds),
      formatDay: (timestamp, defaultTimeZone) =>
        formatDisplayDay(timestamp, timezone, defaultTimeZone),
      formatDate: (timestamp, defaultTimeZone) =>
        formatDisplayDate(timestamp, timezone, defaultTimeZone)
    }),
    [format, timezone, storageError]
  );

  return (
    <TimeDisplayContext.Provider value={value}>
      {children}
    </TimeDisplayContext.Provider>
  );
}

export function useTimeDisplay(): TimeDisplayContextValue {
  return useContext(TimeDisplayContext);
}
