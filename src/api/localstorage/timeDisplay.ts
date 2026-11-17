export type TimeFormat = "12h" | "24h";
export type TimezonePreference = "default" | "local" | "utc";

export const TIME_FORMAT_KEY = "TIME_FORMAT";
export const TIMEZONE_KEY = "TIMEZONE";

function readStoredValue(key: string): Record<string, unknown> {
  try {
    const stored = localStorage.getItem(key);
    const value: unknown = stored ? JSON.parse(stored) : {};
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function fetchStoredTimeFormat(): TimeFormat {
  const format = readStoredValue(TIME_FORMAT_KEY).format;
  return format === "24h" ? "24h" : "12h";
}

export function fetchStoredTimezone(): TimezonePreference {
  const timezone = readStoredValue(TIMEZONE_KEY).timezone;
  return timezone === "local" || timezone === "utc" ? timezone : "default";
}

export function storeTimeFormat(format: TimeFormat): boolean {
  try {
    localStorage.setItem(TIME_FORMAT_KEY, JSON.stringify({ format }));
    return true;
  } catch {
    return false;
  }
}

export function storeTimezone(timezone: TimezonePreference): boolean {
  try {
    if (timezone === "default") {
      localStorage.removeItem(TIMEZONE_KEY);
    } else {
      localStorage.setItem(TIMEZONE_KEY, JSON.stringify({ timezone }));
    }
    return true;
  } catch {
    return false;
  }
}
