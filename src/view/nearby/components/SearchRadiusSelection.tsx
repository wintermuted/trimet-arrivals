import { Button, FieldGroup, Select } from "@wintermuted/ui-theme/react";
import React from "react";
import FontAwesome from "react-fontawesome";

export interface SearchRadiusSelectionParams {
  radiusSize: number;
  handleRadiusSelectionChange: (e) => void;
}

export function SearchRadiusSelection({
  radiusSize,
  handleRadiusSelectionChange
}: SearchRadiusSelectionParams) {
  const options = [250, 500, 750, 1000, 1500, 2000, 2500, 5000];
  return (
    <FieldGroup label="Search radius" htmlFor="nearby-search-radius">
      <div className="transit-field-row">
        <Select
          id="nearby-search-radius"
          value={radiusSize}
          onChange={handleRadiusSelectionChange}
        >
          <option>Select</option>
          {options.map(option => (
            <option key={option} value={option}>
              {option} foot radius
            </option>
          ))}
        </Select>
        <Button variant="primary" aria-label="Find transit near me">
          <FontAwesome name="location-arrow" />
          Find Near Me
        </Button>
      </div>
    </FieldGroup>
  );
}
