import { MultiSelect } from "@wintermuted/ui-theme/react/select";
import React, { useMemo, useState } from "react";
import { searchStopCatalog, StopCatalogStop } from "../../api/trimet/stopCatalog";

const GROUPS = ["N", "NE", "SE", "S", "SW", "NW", "Other stops"];
const MAX_PER_GROUP = 20;

function stopGroup(stop: StopCatalogStop) {
  const prefixes = new Set(
    [stop.desc, ...stop.aliases].flatMap(name =>
      Array.from(name.matchAll(/(?:^\s*|(?:&|\/|\bat\b)\s*)(NE|SE|SW|NW|N|S)\s+(?=[\w])/gi),
        match => match[1].toUpperCase())
    )
  );
  return prefixes.size === 1 ? [...prefixes][0] : "Other stops";
}

export default function PlannerStopSelect({ id, stops, selected, onChange, loading }: {
  id: string;
  stops: StopCatalogStop[];
  selected?: StopCatalogStop;
  onChange: (stop: StopCatalogStop | null) => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const quadrants = useMemo(() => new Map(stops.map(stop => [stop.locid, stopGroup(stop)])), [stops]);
  const options = useMemo(() => {
    const groups = new Map(GROUPS.map(label => [label, { label, options: [] as StopCatalogStop[] }]));
    const trimmed = query.trim();
    const matching = trimmed ? searchStopCatalog(stops, trimmed) : stops;
    const exact = /^\d+$/.test(trimmed) ? matching.find(stop => String(stop.locid) === trimmed) : undefined;
    for (const stop of exact ? [exact, ...matching.filter(item => item !== exact)] : matching) {
      const group = groups.get(quadrants.get(stop.locid));
      if (group.options.length < MAX_PER_GROUP) group.options.push(stop);
    }
    return [...groups.values()].filter(group => group.options.length > 0);
  }, [stops, quadrants, query]);
  return (
    <MultiSelect<StopCatalogStop, false>
      inputId={id}
      className="transit-planner-stop-select"
      isMulti={false}
      isClearable
      isLoading={loading}
      isDisabled={stops.length === 0}
      value={selected ?? null}
      options={options}
      inputValue={query}
      onInputChange={value => setQuery(value)}
      onChange={onChange}
      getOptionLabel={stop => `${stop.desc} (${stop.locid})`}
      getOptionValue={stop => String(stop.locid)}
      filterOption={null}
      placeholder="Search by stop name or ID"
      noOptionsMessage={() => "No stops match. Try another name or ID."}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      menuPlacement="auto"
      maxMenuHeight={240}
      styles={{
        control: base => ({ ...base, minHeight: "var(--wm-control-height)" }),
        menuPortal: base => ({ ...base, zIndex: 5 })
      }}
    />
  );
}
