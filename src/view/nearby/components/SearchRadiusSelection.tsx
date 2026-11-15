import { FieldGroup, Select } from "@wintermuted/ui-theme/react";
import React from "react";

export interface SearchRadiusSelectionParams {
  radiusSize: number;
  handleRadiusSelectionChange: React.ChangeEventHandler<HTMLSelectElement>;
}

export function SearchRadiusSelection({
  radiusSize,
  handleRadiusSelectionChange
}: SearchRadiusSelectionParams) {
  const options = [250, 500, 750, 1000, 1500, 2000, 2500, 5000];
  return (
    <FieldGroup label="Search radius" htmlFor="nearby-search-radius">
      <Select
        id="nearby-search-radius"
        value={radiusSize}
        onChange={handleRadiusSelectionChange}
      >
        {options.map(option => (
          <option key={option} value={option}>
            {option.toLocaleString("en-US")} ft
          </option>
        ))}
      </Select>
    </FieldGroup>
  );
}
