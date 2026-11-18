import { MultiSelect } from "@wintermuted/ui-theme/react/select";
import React, { useMemo, useState } from "react";
import { searchStopCatalog, StopCatalogStop } from "../../api/trimet/stopCatalog";

const GROUPS = ["N", "NE", "SE", "S", "SW", "NW", "Other stops"];
const MAX_PER_GROUP = 20;

const COMMON_PLACES = new Map([
  [9650, { label: "Washington Square Transit Center", aliases: ["Washington Square Mall", "Washington Sq"] }],
  [10120, { label: "Oregon Zoo / Washington Park MAX Station", aliases: ["Zoo", "Washington Park MAX"] }],
  [10579, { label: "Portland International Airport MAX Station", aliases: ["PDX"] }],
]);

function normalizePlace(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

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
    const placeQuery = normalizePlace(query);
    const commonStops = /^\d+$/.test(trimmed) ? [] : [...COMMON_PLACES].flatMap(([id, place]) => {
      const stop = stops.find(item => item.locid === id);
      return stop && (!placeQuery || [place.label, ...place.aliases, stop.desc, ...stop.aliases]
        .some(name => normalizePlace(name).includes(placeQuery))) ? [stop] : [];
    });
    const commonIds = new Set(commonStops.map(stop => stop.locid));
    const exact = /^\d+$/.test(trimmed) ? matching.find(stop => String(stop.locid) === trimmed) : undefined;
    for (const stop of exact ? [exact, ...matching.filter(item => item !== exact)] : matching) {
      if (commonIds.has(stop.locid)) continue;
      const group = groups.get(quadrants.get(stop.locid));
      if (group.options.length < MAX_PER_GROUP) group.options.push(stop);
    }
    return [{ label: "Common places", options: commonStops }, ...groups.values()]
      .filter(group => group.options.length > 0);
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
      getOptionLabel={stop => `${COMMON_PLACES.get(stop.locid)?.label ?? stop.desc} (${stop.locid})`}
      getOptionValue={stop => String(stop.locid)}
      filterOption={null}
      placeholder="Search stops or common places"
      noOptionsMessage={() => "No stops or common places match. Try another name or stop ID."}
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
