import { Button } from "@wintermuted/ui-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GroupedPlaceCategoryFilters,
  MapReferenceLayerControls,
  PlaceResultRow,
} from "@overworld/ui";
import FontAwesome from "react-fontawesome";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faTree,
  faBasketShopping,
  faUsers,
  faSignsPost,
  faLandmark,
  faPersonRunning,
} from "@fortawesome/free-solid-svg-icons";
import { placeIconDefinition } from "../util/mapbox/placeIcons";
import { Link } from "react-router-dom";
import {
  categoryName,
  CULTURE_PLACE_CATEGORIES,
  InterestPlace,
  PLACE_CATEGORIES,
  PLACE_INFO,
  PlaceCategory,
  PlaceFilters,
  PlaceSourceState,
  placeDetailLink,
} from "@overworld/places/catalog";
import "./NearbyPlaces.scss";
import {
  getPlaceLayerPresentation,
  PlaceSources,
  type NeighborhoodControls,
} from "./placeLayerPresentation";
import NearbyPlaceDetails from "./NearbyPlaceDetails";
import { LineOverlayControls } from "@overworld/places/lineOverlays";
import {
  CONTEXT_CATEGORIES,
  ContextControls,
} from "@overworld/places/contextOverlays";
import { SavedPlaceControls } from "@overworld/places/savedPlaces";
import LoadStatus, { LoadIssue, placeSourceIssues } from "./PlacesLoadStatus";

const CATEGORY_GROUPS: {
  label: string;
  icon: IconDefinition;
  colorCategory: PlaceCategory;
  categories: PlaceCategory[];
}[] = [
  {
    label: "Parks & nature",
    icon: faTree,
    colorCategory: "park",
    categories: [
      "park",
      "community-garden",
      "heritage-tree",
      "park-artwork",
      "viewpoint",
      "public-garden",
      "nature-reserve",
    ],
  },
  {
    label: "Food & markets",
    icon: faBasketShopping,
    colorCategory: "food-cart-pod",
    categories: [
      "food-cart-pod",
      "farmers-market",
      "grocery-store",
      "csa-pickup",
      "cafe",
      "bakery",
    ],
  },
  {
    label: "Community & resources",
    icon: faUsers,
    colorCategory: "community-center",
    categories: ["community-center", "library", "reuse-repair"],
  },
  {
    label: "Arts & culture",
    icon: faLandmark,
    colorCategory: "museum",
    categories: [...CULTURE_PLACE_CATEGORIES, "historic-site", "public-art"],
  },
  {
    label: "Play & recreation",
    icon: faPersonRunning,
    colorCategory: "sports-court",
    categories: ["playground", "splash-pad", "sports-court", "skatepark"],
  },
  {
    label: "Trip amenities",
    icon: faSignsPost,
    colorCategory: "bicycle-parking",
    categories: [
      "public-restroom",
      "bicycle-parking",
      "drinking-fountain",
      "picnic-seating",
    ],
  },
];

interface Props {
  sources: Record<PlaceCategory, PlaceSourceState>;
  filters: PlaceFilters;
  onFilters: (filters: PlaceFilters) => void;
  visiblePlaces: InterestPlace[];
  selected?: InterestPlace;
  onSelect: (id?: string, pan?: boolean) => void;
  origin?: number[];
  originMode?: string;
  onRetry: (category: PlaceCategory) => void;
  mapError: boolean;
  onRetryMap?: () => void;
  mapReady: boolean;
  lineOverlays?: LineOverlayControls;
  contextOverlays?: ContextControls;
  discovery?: React.ReactNode;
  savedPlaces?: SavedPlaceControls;
  viewSearch?: string;
  areaLabel?: string;
  neighborhoods?: NeighborhoodControls;
}

export default function NearbyPlaces({
  sources,
  filters,
  onFilters,
  visiblePlaces,
  selected,
  onSelect,
  origin,
  originMode,
  onRetry,
  mapError,
  onRetryMap,
  mapReady,
  neighborhoods,
  lineOverlays,
  contextOverlays,
  discovery,
  savedPlaces,
  viewSearch = "",
  areaLabel = "map area",
}: Props) {
  const [limit, setLimit] = useState(40);
  const [sections, setSections] = useState({
    discovery: false,
    categories: false,
    layers: false,
  });
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  function toggleSection(section: keyof typeof sections, open: boolean) {
    setSections((previous) =>
      previous[section] === open ? previous : { ...previous, [section]: open },
    );
  }
  const heading = useRef<HTMLHeadingElement>(null);
  const browseHeading = useRef<HTMLHeadingElement>(null);
  const results = useRef<HTMLUListElement>(null);
  const previousSelection = useRef<string>(undefined);
  useEffect(() => {
    if (selected) heading.current?.focus();
    else if (previousSelection.current) {
      const result = Array.from(
        results.current?.querySelectorAll<HTMLAnchorElement>(
          "a[data-place-id]",
        ) || [],
      ).find((link) => link.dataset.placeId === previousSelection.current);
      (result || browseHeading.current)?.focus();
    }
    previousSelection.current = selected?.id;
  }, [selected?.id]);
  const sorted = useMemo(
    () => [...visiblePlaces].sort((a, b) => a.name.localeCompare(b.name)),
    [visiblePlaces],
  );
  useEffect(() => setLimit(40), [filters]);
  const loading = PLACE_CATEGORIES.some(
    (category) => sources[category].loading && filters[category],
  );
  const available = PLACE_CATEGORIES.some(
    (category) => sources[category].snapshot && filters[category],
  );
  const placeIssues = placeSourceIssues(sources, onRetry);
  const markerIssues: LoadIssue[] = mapError
    ? [
        {
          label: "Place markers",
          message:
            "Place markers could not be drawn. You can still select places from this list.",
          retry: onRetryMap,
        },
      ]
    : [];
  const savedIssues: LoadIssue[] = savedPlaces?.error
    ? [
        {
          label: "Saved places",
          message: savedPlaces.error,
          retry: savedPlaces.retry,
        },
      ]
    : [];
  const {
    layerIssues,
    layersLoading,
    contextWarnings,
    mapLayers,
    provenanceSources,
    contextSourceCount,
  } = getPlaceLayerPresentation({
    sources,
    neighborhoods,
    lineOverlays,
    contextOverlays,
  });

  return (
    <section
      className="transit-places"
      aria-labelledby={
        selected ? "selected-place-heading" : "nearby-places-heading"
      }
    >
      {!selected && (
        <>
          <h2
            id="nearby-places-heading"
            className="wm-sr-only"
            ref={browseHeading}
            tabIndex={-1}
          >
            Places nearby
          </h2>
          {discovery && (
            <details
              className="transit-places-section"
              open={sections.discovery}
              onToggle={(event) =>
                toggleSection("discovery", event.currentTarget.open)
              }
            >
              <summary>
                Discovery tools
                <LoadStatus label="Saved places" issues={savedIssues} />
              </summary>
              {discovery}
            </details>
          )}
          <details
            className="transit-places-section"
            open={sections.categories}
            onToggle={(event) =>
              toggleSection("categories", event.currentTarget.open)
            }
          >
            <summary>
              Place categories
              {!sections.categories && (
                <LoadStatus
                  label="Place categories"
                  issues={[...placeIssues, ...markerIssues]}
                  loading={loading}
                />
              )}
            </summary>
            <GroupedPlaceCategoryFilters
              selected={Object.fromEntries(
                PLACE_CATEGORIES.map((category) => [
                  category,
                  filters[category],
                ]),
              )}
              onSelectionChange={(changes) =>
                onFilters({ ...filters, ...changes })
              }
              expandedGroups={expandedGroups}
              onExpandedGroupsChange={setExpandedGroups}
              status={
                sections.categories &&
                markerIssues.length > 0 && (
                  <div className="transit-places-layer-row">
                    <span>Map markers</span>
                    <LoadStatus label="Place markers" issues={markerIssues} />
                  </div>
                )
              }
              groups={CATEGORY_GROUPS.map((group) => ({
                id: group.label,
                label: group.label,
                icon: (
                  <FontAwesomeIcon
                    className={`transit-places-group-icon transit-place-icon--${group.colorCategory}`}
                    icon={group.icon}
                    aria-hidden="true"
                  />
                ),
                status: (
                  <LoadStatus
                    label={group.label}
                    issues={placeIssues.filter((issue) =>
                      group.categories.some(
                        (category) => categoryName(category) === issue.label,
                      ),
                    )}
                    loading={group.categories.some(
                      (category) =>
                        sources[category].loading && filters[category],
                    )}
                  />
                ),
                categories: group.categories.map((category) => ({
                  id: category,
                  label: categoryName(category),
                  className: `transit-places-category--${category}`,
                  icon: (
                    <FontAwesomeIcon
                      icon={placeIconDefinition(category)}
                      aria-hidden="true"
                    />
                  ),
                  status: (
                    <LoadStatus
                      label={categoryName(category)}
                      issues={placeIssues.filter(
                        (issue) => issue.label === categoryName(category),
                      )}
                      loading={sources[category].loading}
                    />
                  ),
                })),
              }))}
            />
          </details>
          {neighborhoods && (
            <details
              className="transit-places-section"
              open={sections.layers}
              onToggle={(event) =>
                toggleSection("layers", event.currentTarget.open)
              }
            >
              <summary>
                Map layers
                {!sections.layers && (
                  <LoadStatus
                    label="Map layers"
                    issues={layerIssues}
                    loading={layersLoading}
                    warnings={CONTEXT_CATEGORIES.flatMap(contextWarnings)}
                  />
                )}
              </summary>
              <MapReferenceLayerControls layers={mapLayers} />
            </details>
          )}
          <label className="transit-places-search">
            Search places in this {areaLabel}
            <input
              type="search"
              className="wm-input"
              value={filters.search}
              maxLength={200}
              onChange={(event) =>
                onFilters({ ...filters, search: event.target.value })
              }
            />
          </label>
        </>
      )}
      {selected && (
        <NearbyPlaceDetails
          selected={selected}
          heading={heading}
          sources={sources}
          placeIssues={placeIssues}
          savedIssues={savedIssues}
          markerIssues={markerIssues}
          savedPlaces={savedPlaces}
          origin={origin}
          originMode={originMode}
          viewSearch={viewSearch}
        />
      )}
      {!selected && (
        <>
          {!PLACE_CATEGORIES.some((category) => filters[category]) ? (
            <p role="status">Choose a category to show places.</p>
          ) : !mapReady ? (
            <p role="status">Preparing the map area...</p>
          ) : available && !loading && sorted.length === 0 ? (
            <p role="status">
              No matching places in this {areaLabel}. Try another search, enable
              more categories, or change the discovery filters. Coverage is
              limited to the Portland parks system and mapped Portland places.
            </p>
          ) : null}
          <p className="transit-places-count" role="status">
            {sorted.length} {sorted.length === 1 ? "place" : "places"} in{" "}
            {areaLabel}
          </p>
          <ul
            ref={results}
            className="transit-places-list"
            aria-label={`Places in ${areaLabel}`}
          >
            {sorted.slice(0, limit).map((place) => (
              <PlaceResultRow
                key={place.id}
                name={place.name}
                secondary={place.address || PLACE_INFO[place.category].singular}
                icon={
                  <FontAwesomeIcon
                    icon={placeIconDefinition(place.category)}
                    aria-hidden="true"
                    className={`transit-place-icon transit-place-icon--${place.category}`}
                  />
                }
                trailing={<FontAwesome name="angle-right" aria-hidden="true" />}
                renderLink={(props) => (
                  <Link
                    {...props}
                    to={placeDetailLink(place.id, viewSearch)}
                    data-place-id={place.id}
                    onClick={(event) => {
                      if (
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return;
                      event.preventDefault();
                      onSelect(place.id, true);
                    }}
                  />
                )}
                action={
                  savedPlaces && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="transit-place-save"
                      aria-label={`${savedPlaces.saved[place.id] ? "Unsave" : "Save"} ${place.name}`}
                      aria-pressed={Boolean(savedPlaces.saved[place.id])}
                      onClick={() => savedPlaces.toggle(place)}
                    >
                      <FontAwesome
                        name={
                          savedPlaces.saved[place.id]
                            ? "bookmark"
                            : "bookmark-o"
                        }
                        aria-hidden="true"
                      />
                    </Button>
                  )
                }
              />
            ))}
          </ul>
          {sorted.length > limit && (
            <Button
              variant="secondary"
              onClick={() => setLimit((value) => value + 40)}
            >
              Show more places ({sorted.length - limit} remaining)
            </Button>
          )}
        </>
      )}
      <PlaceSources
        sources={provenanceSources}
        noticeAfter={contextSourceCount}
      />
    </section>
  );
}
