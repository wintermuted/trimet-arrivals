import React from "react";
import { DeparturePicker } from "@overworld/ui";
import { Arrival } from "../../../../api/trimet/interfaces/arrivals";

interface DeparturesCardParams {
  filteredArrivals: Arrival[];
  selectedArrival: Arrival;
  onSelect: (arrival: Arrival) => void;
}

export function DeparturesCard({
  filteredArrivals,
  selectedArrival,
  onSelect,
}: DeparturesCardParams) {
  return (
    <DeparturePicker
      departures={filteredArrivals}
      selectedId={selectedArrival?.id}
      onSelect={onSelect}
      emptyContent={null}
    />
  );
}
