import { Button } from "@wintermuted/ui-react";
import { GlobalPlaceSearch, PlaceResultRow } from "@overworld/ui";
import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link, useLocation } from "react-router-dom";
import {
  categoryName,
  normalizePlaceSearch,
  PLACE_CATEGORIES,
  placeDetailLink,
  searchPlaces,
  usePlaceCatalog,
} from "@overworld/places/catalog";
import PlacesLoadStatus, {
  placeSourceIssues,
} from "../../nearby/components/PlacesLoadStatus";
import { placeIconDefinition } from "../../nearby/util/mapbox/placeIcons";
import { useSharedDeviceLocation } from "../../../api/geolocation/geoLocateCurrentPosition";
import { getDistance } from "../../nearby/util/turfUtils";
import "./GlobalPlacesSearch.scss";

const PAGE_SIZE = 10;

function distanceLabel(
  origin: readonly [number, number],
  destination: [number, number],
) {
  const miles = getDistance([...origin], destination);
  return miles < 1
    ? `${Math.round(miles * 5280)} ft`
    : `${miles.toFixed(1)} mi`;
}

function highlightMatches(text: string, query: string) {
  const normalized = normalizePlaceSearch(text);
  const matches = new Set<number>();
  for (const term of normalizePlaceSearch(query).split(/\s+/).filter(Boolean)) {
    let start = normalized.indexOf(term);
    while (start >= 0) {
      for (let index = start; index < start + term.length; index++)
        matches.add(index);
      start = normalized.indexOf(term, start + 1);
    }
  }
  const parts: { text: string; matched: boolean }[] = [];
  let offset = 0;
  for (const character of text) {
    const length = normalizePlaceSearch(character).length;
    const previous = parts[parts.length - 1];
    // Keep original accents, combining marks and surrogate pairs intact.
    const matched = length
      ? Array.from({ length }, (_, index) => matches.has(offset + index)).some(
          Boolean,
        )
      : previous?.matched || false;
    if (previous && previous.matched === matched) previous.text += character;
    else parts.push({ text: character, matched });
    offset += length;
  }
  return parts.map((part, index) =>
    part.matched ? <mark key={index}>{part.text}</mark> : part.text,
  );
}

export default function GlobalPlacesSearch() {
  const [activated, setActivated] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const catalog = usePlaceCatalog(activated);
  const deviceLocation = useSharedDeviceLocation();
  const location = useLocation();
  const matches = useMemo(
    () => searchPlaces(catalog.places, query, deviceLocation),
    [catalog.places, query, deviceLocation],
  );
  const issues = placeSourceIssues(catalog.sources, catalog.retry);
  const loading =
    activated &&
    PLACE_CATEGORIES.some(
      (category) =>
        catalog.sources[category].loading ||
        (!catalog.sources[category].snapshot &&
          !catalog.sources[category].error),
    );
  const hasQuery = Boolean(query.trim());

  useEffect(() => setOpen(false), [location]);
  useEffect(() => setLimit(PAGE_SIZE), [query]);
  return (
    <GlobalPlaceSearch
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={(next) => {
        if (next) setActivated(true);
        setOpen(next);
      }}
      hint="Search every place category across Portland, regardless of map filters. Use Arrow Down or Tab to browse results. Escape closes search."
      scope="All categories, across Portland. Map filters stay unchanged."
      loadStatus={
        <PlacesLoadStatus
          label="All places"
          issues={issues}
          loading={loading && !issues.length}
        />
      }
      status={
        !hasQuery
          ? "Search by name, category, address or source-listed type."
          : matches.length
            ? `Showing ${Math.min(limit, matches.length)} of ${matches.length} ${matches.length === 1 ? "place" : "places"}${loading ? " found so far" : ""}.`
            : loading
              ? "Loading the place catalog..."
              : issues.length
                ? "No matching places in the loaded categories. Retry unavailable categories above."
                : "No places match. Try another name, category or address."
      }
      moreAction={
        hasQuery &&
        matches.length > limit && (
          <Button
            className="transit-global-search-more"
            size="sm"
            variant="secondary"
            onClick={() => setLimit((previous) => previous + PAGE_SIZE)}
          >
            Show more places ({matches.length - limit} remaining)
          </Button>
        )
      }
    >
      {hasQuery && matches.length > 0 && (
        <ul
          aria-label="Matching places"
          className="transit-global-search-results"
        >
          {matches.slice(0, limit).map((place) => (
            <PlaceResultRow
              key={place.id}
              variant="search"
              name={highlightMatches(place.name, query)}
              secondary={highlightMatches(
                `${categoryName(place.category)}${place.address ? ` / ${place.address}` : ""}`,
                query,
              )}
              icon={
                <FontAwesomeIcon
                  icon={placeIconDefinition(place.category)}
                  aria-hidden="true"
                  className={`transit-place-icon transit-place-icon--${place.category}`}
                />
              }
              renderLink={(props) => (
                <Link
                  {...props}
                  to={placeDetailLink(place.id)}
                  data-global-place={place.id}
                  onClick={() => setOpen(false)}
                />
              )}
              trailing={
                deviceLocation && (
                  <span className="transit-global-search-distance">
                    <span>
                      {distanceLabel(deviceLocation, place.coordinates)}
                    </span>
                    <small>
                      straight-line
                      <span className="wm-sr-only">
                        {" "}
                        from your shared location
                      </span>
                    </small>
                  </span>
                )
              }
            />
          ))}
        </ul>
      )}
    </GlobalPlaceSearch>
  );
}
