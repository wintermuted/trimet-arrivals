import { faBus, faCableCar, faTrain, faTrainTram } from "@fortawesome/free-solid-svg-icons";
import { Badge } from "@wintermuted/ui-react";
import { MultiSelect } from "@wintermuted/ui-react/select";
import React, { useMemo, useState } from "react";
import { searchStopCatalog, type StopCatalogStop, type StopMode } from "@overworld/trimet-client";
import "./PlannerStopSelect.scss";

export interface SavedPlannerStop {
  id: number;
  label: string;
}

const GROUPS = ["N", "NE", "SE", "S", "SW", "NW", "Other stops"];
const MAX_PER_GROUP = 20;
const MODE_ICONS = {
  Bus: faBus,
  Rail: faTrain,
  Streetcar: faTrainTram,
  "Aerial tram": faCableCar,
};

function StopModes({ modes }: { modes: StopMode[] }) {
  return (
    <span className="transit-planner-stop-modes">
      {modes.map(mode => {
        const { icon: [width, height, , , paths] } = MODE_ICONS[mode];
        return (
          <span key={mode} title={mode}>
            <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
              {[paths].flat().map(path => <path key={path} d={path} />)}
            </svg>
            <span className="wm-sr-only">{mode} </span>
          </span>
        );
      })}
    </span>
  );
}

export interface CommonPlannerPlace {
  id: number;
  label: string;
  aliases: readonly string[];
}

const EMPTY_COMMON_PLACES: readonly CommonPlannerPlace[] = [];

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
  return prefixes.size === 1 ? Array.from(prefixes)[0] : "Other stops";
}

export interface PlannerStopSelectProps {
  id: string;
  stops: StopCatalogStop[];
  selected?: StopCatalogStop;
  onChange: (stop: StopCatalogStop | null) => void;
  loading: boolean;
  savedStops?: SavedPlannerStop[];
  commonPlaces?: readonly CommonPlannerPlace[];
}

export default function PlannerStopSelect({ id, stops, selected, onChange, loading, savedStops,
  commonPlaces = EMPTY_COMMON_PLACES }: PlannerStopSelectProps) {
  const [query, setQuery] = useState("");
  const commonPlacesById = useMemo(() => new Map(commonPlaces.map(place => [place.id, place])), [commonPlaces]);
  const quadrants = useMemo(() => new Map(stops.map(stop => [stop.locid, stopGroup(stop)])), [stops]);
  const { options, savedLabels } = useMemo(() => {
    const groups = new Map(GROUPS.map(label => [label, { label, options: [] as StopCatalogStop[] }]));
    const trimmed = query.trim();
    const matching = trimmed ? searchStopCatalog(stops, trimmed, { includeRouteNames: true }) : stops;
    const placeQuery = normalizePlace(query);
    const savedLabels = new Map<number, string>();
    for (const { id, label } of savedStops ?? []) {
      const previous = savedLabels.get(id);
      savedLabels.set(id, previous ? `${previous} / ${label}` : label);
    }
    const commonStops = /^\d+$/.test(trimmed) ? [] : Array.from(commonPlacesById).flatMap(([id, place]) => {
      const stop = stops.find(item => item.locid === id);
      return stop && (!placeQuery || [place.label, ...place.aliases, stop.desc, ...stop.aliases]
        .some(name => normalizePlace(name).includes(placeQuery))) ? [stop] : [];
    });
    const commonIds = new Set(commonStops.map(stop => stop.locid));
    const matchingIds = new Set(matching.map(stop => stop.locid));
    const savedOptions = Array.from(savedLabels).flatMap(([id, label]) => {
      const stop = stops.find(item => item.locid === id);
      return stop && (matchingIds.has(id) || commonIds.has(id) || normalizePlace(label).includes(placeQuery))
        ? [stop] : [];
    });
    const savedIds = new Set(savedOptions.map(stop => stop.locid));
    const exact = /^\d+$/.test(trimmed) ? matching.find(stop => String(stop.locid) === trimmed) : undefined;
    for (const stop of exact ? [exact, ...matching.filter(item => item !== exact)] : matching) {
      if (savedIds.has(stop.locid) || commonIds.has(stop.locid)) continue;
      const group = groups.get(quadrants.get(stop.locid));
      if (group.options.length < MAX_PER_GROUP) group.options.push(stop);
    }
    return {
      options: [
        { label: "Saved stops", options: savedOptions },
        { label: "Common places", options: commonStops.filter(stop => !savedIds.has(stop.locid)) },
        ...Array.from(groups.values())
      ].filter(group => group.options.length > 0),
      savedLabels
    };
  }, [stops, quadrants, query, savedStops, commonPlacesById]);
  function stopLabel(stop: StopCatalogStop) {
    const label = savedLabels.get(stop.locid);
    const name = commonPlacesById.get(stop.locid)?.label ?? stop.desc;
    return `${label ? `${label}: ` : ""}${name} (${stop.locid})`;
  }

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
      getOptionLabel={stop => {
        const label = stopLabel(stop);
        return stop.modes?.length ? `${label}, ${stop.modes.join(", ")}` : label;
      }}
      formatOptionLabel={(stop, { context }) => (
        <>
          {stop.modes?.length ? <StopModes modes={stop.modes} /> : null}
          {stopLabel(stop)}
          {context === "menu" && stop.routes?.length ? (
            <span className="transit-planner-stop-routes">
              <span className="wm-sr-only">Routes: </span>
              {stop.routes.map(({ id: routeId, label, color }) => (
                <Badge
                  key={routeId}
                  className="transit-planner-stop-route"
                  style={color ? {
                    borderColor: color,
                    backgroundColor: `color-mix(in srgb, ${color} 12%, var(--wm-color-surface-solid))`,
                  } : undefined}
                >
                  {label}
                </Badge>
              ))}
            </span>
          ) : null}
        </>
      )}
      getOptionValue={stop => String(stop.locid)}
      filterOption={null}
      placeholder="Search stops or common places"
      noOptionsMessage={() => "No matches. Try a stop ID, stop name, route name, or common place."}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      menuPlacement="auto"
      maxMenuHeight={400}
      styles={{
        control: base => ({ ...base, minHeight: "var(--wm-control-height)" }),
        menu: base => ({ ...base, fontSize: "0.875rem" }),
        menuPortal: (base, { rect }) => ({
          ...base,
          width: `max(${rect.width}px, min(30rem, calc(100% - ${rect.left}px - var(--wm-space-3))))`,
          zIndex: 5
        })
      }}
    />
  );
}
