import React, { useId } from "react";
import { useTimeDisplay } from "./TimeDisplay";

export default function TimeDisplaySettings() {
  const { format, timezone, storageError, setFormat, setTimezone } =
    useTimeDisplay();
  const formatId = useId();
  const timezoneId = useId();

  return (
    <fieldset className="transit-time-settings">
      <legend>Time display</legend>
      <label htmlFor={formatId}>Clock</label>
      <select
        id={formatId}
        value={format}
        onChange={event => {
          if (event.target.value === "12h" || event.target.value === "24h") {
            setFormat(event.target.value);
          }
        }}
      >
        <option value="12h">12-hour</option>
        <option value="24h">24-hour</option>
      </select>
      <label htmlFor={timezoneId}>Timezone</label>
      <select
        id={timezoneId}
        value={timezone}
        onChange={event => {
          if (
            event.target.value === "default" ||
            event.target.value === "local" ||
            event.target.value === "utc"
          ) {
            setTimezone(event.target.value);
          }
        }}
      >
        <option value="default">Current display default</option>
        <option value="local">Device local time</option>
        <option value="utc">UTC</option>
      </select>
      <small>
        Current default: device local time; trip directions use Pacific time.
      </small>
      {storageError && (
        <small role="status">
          Could not save this preference in browser storage.
        </small>
      )}
    </fieldset>
  );
}
