import { Select } from "@wintermuted/ui-react";
import React from "react";
import FontAwesome from "react-fontawesome";

export interface SearchRadiusSelectionParams {
  radiusSize: number;
  handleRadiusSelectionChange: React.ChangeEventHandler<HTMLSelectElement>;
  compact?: boolean;
}

export function SearchRadiusSelection({
  radiusSize,
  handleRadiusSelectionChange,
  compact = false
}: SearchRadiusSelectionParams) {
  const options = [250, 500, 750, 1000, 1500, 2000, 2500, 5000];
  return (
    <label className={compact ? "transit-map-radius" : undefined} htmlFor="nearby-search-radius">
      {compact && <FontAwesome name="bullseye" aria-hidden="true" />}
      {compact && <span className="wm-sr-only">Search radius</span>}
      <Select
        id="nearby-search-radius"
        aria-label={compact ? "Search radius" : undefined}
        className={compact ? "transit-map-radius-select" : undefined}
        value={radiusSize}
        onChange={handleRadiusSelectionChange}
      >
        {options.map(option => (
          <option key={option} value={option}>
            {option.toLocaleString("en-US")} ft
          </option>
        ))}
      </Select>
    </label>
  );
}
