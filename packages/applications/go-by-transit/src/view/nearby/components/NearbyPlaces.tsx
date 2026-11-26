import { Button } from "@wintermuted/ui-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GroupedPlaceCategoryFilters,
  MapReferenceLayerControls,
  PlaceResultRow,
  PlaceDetailsPanel,
  SourceProvenancePanel,
  type MapReferenceLayer,
  type SourceProvenanceRecord,
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
  OUTING_PLACE_CATEGORIES,
  InterestPlace,
  PLACE_CATEGORIES,
  PLACE_INFO,
  PlaceCategory,
  PlaceFilters,
  PlaceSourceState,
  placeDetailLink,
  placePlannerLink,
} from "@overworld/places/catalog";
import "./NearbyPlaces.scss";
import { NeighborhoodState } from "@overworld/places/neighborhoods";
import {
  LINE_OVERLAY_CATEGORIES,
  LINE_OVERLAY_INFO,
  LineOverlayControls,
} from "@overworld/places/lineOverlays";
import {
  CONTEXT_CATEGORIES,
  CONTEXT_OVERLAY_INFO,
  ContextCategory,
  ContextControls,
} from "@overworld/places/contextOverlays";
import { SavedPlaceControls } from "@overworld/places/savedPlaces";
import PlacesHelp from "./PlacesHelp";
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

const LINE_OVERLAY_HELP =
  "Optional reference lines, not turn-by-turn routes. Trail access, bike permissions, directions, and closures are not verified.";
const CONTEXT_LAYER_HELP = {
  "street-trees": "Street trees do not establish shade or public access.",
  sidewalks: "Sidewalk gaps do not prove absence.",
  crossings: "Crossing points do not guarantee safety or accessibility.",
  "crossing-deficiencies":
    "Orange points mark planning deficiencies, not live closures.",
};

function provenanceRecord(
  id: string,
  label: string,
  snapshot: {
    source: string;
    sourceUrl: string;
    license: string;
    licenseUrl: string;
    retrievedAt: string;
    sourceUpdatedAt?: string;
    coverage: string;
  },
): SourceProvenanceRecord {
  return {
    id,
    label,
    source: snapshot.source,
    sourceUrl: snapshot.sourceUrl,
    license: snapshot.license,
    licenseUrl: snapshot.licenseUrl,
    retrievedDate: new Date(snapshot.retrievedAt).toLocaleDateString(),
    updatedDate: snapshot.sourceUpdatedAt
      ? new Date(snapshot.sourceUpdatedAt).toLocaleDateString()
      : undefined,
    coverage: snapshot.coverage,
  };
}

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
  neighborhoods?: NeighborhoodState & {
    shown: boolean;
    onShown: (shown: boolean) => void;
    polygonsShown: boolean;
    onPolygonsShown: (shown: boolean) => void;
    mapError: boolean;
    onRetry: () => void;
  };
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
  const neighborhoodIssues: LoadIssue[] =
    neighborhoods?.shown && (neighborhoods.error || neighborhoods.mapError)
      ? [
          {
            label: "Portland neighborhoods",
            message: `Neighborhood boundaries could not be ${neighborhoods.error ? "loaded" : "drawn"}. Other places remain usable.${
              neighborhoods.error && neighborhoods.snapshot
                ? " The previously loaded boundaries are still shown."
                : ""
            }`,
            retry: neighborhoods.onRetry,
          },
        ]
      : [];
  const lineIssues: LoadIssue[] = lineOverlays
    ? LINE_OVERLAY_CATEGORIES.filter(
        (category) =>
          lineOverlays.shown[category] &&
          (lineOverlays.sources[category].error ||
            lineOverlays.mapErrors[category]),
      ).map((category) => ({
        label: LINE_OVERLAY_INFO[category].label,
        message: `${LINE_OVERLAY_INFO[category].label} could not be ${lineOverlays.sources[category].error ? "loaded" : "drawn"}. Other map layers and places remain usable.${
          lineOverlays.sources[category].error &&
          lineOverlays.sources[category].snapshot
            ? " The previously loaded snapshot is still shown."
            : ""
        }`,
        retry: () => lineOverlays.onRetry(category),
      }))
    : [];
  const contextIssues: LoadIssue[] = contextOverlays
    ? CONTEXT_CATEGORIES.filter(
        (category) =>
          contextOverlays.shown[category] &&
          (contextOverlays.sources[category].error ||
            contextOverlays.mapErrors[category]),
      ).map((category) => ({
        label: CONTEXT_OVERLAY_INFO[category].label,
        message: `${CONTEXT_OVERLAY_INFO[category].label} could not be ${contextOverlays.sources[category].error ? "loaded" : "drawn"}. Other places and layers remain usable.${
          contextOverlays.sources[category].snapshot
            ? " A previously loaded area may still be shown."
            : ""
        }`,
        retry: () => contextOverlays.onRetry(category),
      }))
    : [];
  const layerIssues = [...neighborhoodIssues, ...lineIssues, ...contextIssues];
  const layersLoading =
    Boolean(neighborhoods?.shown && neighborhoods.loading) ||
    LINE_OVERLAY_CATEGORIES.some(
      (category) =>
        lineOverlays?.shown[category] && lineOverlays.sources[category].loading,
    ) ||
    CONTEXT_CATEGORIES.some(
      (category) =>
        contextOverlays?.shown[category] &&
        contextOverlays.sources[category].loading,
    );
  const contextWarnings = (category: ContextCategory) =>
    contextOverlays?.shown[category] &&
    contextOverlays.sources[category].zoomRequired
      ? [
          `Zoom in to level ${CONTEXT_OVERLAY_INFO[category].minZoom} or closer to see ${CONTEXT_OVERLAY_INFO[category].label.toLowerCase()}.`,
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
  const mapLayers: MapReferenceLayer[] = neighborhoods
    ? [
        {
          id: "neighborhoods",
          label: "Portland neighborhoods",
          checked: neighborhoods.shown,
          onChange: neighborhoods.onShown,
          icon: <FontAwesome name="map-o" aria-hidden="true" />,
          help: (
            <PlacesHelp
              label="portland neighborhoods"
              text="Boundaries and names; shared areas may overlap."
            />
          ),
          status: (
            <LoadStatus
              label="Neighborhoods"
              issues={neighborhoodIssues}
              loading={neighborhoods.shown && neighborhoods.loading}
            />
          ),
          children: (
            <label className="transit-places-category transit-places-polygon-toggle">
              <input
                type="checkbox"
                checked={neighborhoods.polygonsShown}
                onChange={(event) =>
                  neighborhoods.onPolygonsShown(event.target.checked)
                }
              />
              <span className="transit-places-layer-label">
                Show neighborhood polygons
              </span>
            </label>
          ),
        },
        ...(lineOverlays
          ? LINE_OVERLAY_CATEGORIES.map((category): MapReferenceLayer => ({
              id: category,
              label: LINE_OVERLAY_INFO[category].label,
              checked: lineOverlays.shown[category],
              onChange: (shown) => lineOverlays.onShown(category, shown),
              className: "transit-places-line-toggle",
              swatch: {
                kind: "line",
                color: LINE_OVERLAY_INFO[category].color,
                dashed: category === "park-trails",
                className: `transit-place-line-swatch--${category}`,
              },
              help: (
                <PlacesHelp
                  label={LINE_OVERLAY_INFO[category].label.toLowerCase()}
                  text={
                    LINE_OVERLAY_HELP +
                    (category === "bicycle-network"
                      ? " Blue shows active mixed bicycle facilities only; future and retired segments are excluded."
                      : category === "recommended-bike-routes"
                        ? " Red dashes: difficult, higher-traffic or unclassified connections. A recommendation is not a safety guarantee."
                        : "")
                  }
                />
              ),
              status: (
                <LoadStatus
                  label={LINE_OVERLAY_INFO[category].label}
                  issues={lineIssues.filter(
                    (issue) =>
                      issue.label === LINE_OVERLAY_INFO[category].label,
                  )}
                  loading={
                    lineOverlays.shown[category] &&
                    lineOverlays.sources[category].loading
                  }
                />
              ),
            }))
          : []),
        ...(contextOverlays
          ? CONTEXT_CATEGORIES.map((category): MapReferenceLayer => ({
              id: category,
              label: CONTEXT_OVERLAY_INFO[category].label,
              checked: contextOverlays.shown[category],
              onChange: (shown) => contextOverlays.onShown(category, shown),
              className:
                "transit-places-line-toggle transit-places-context-toggle",
              swatch: {
                kind: "point",
                color: CONTEXT_OVERLAY_INFO[category].color,
                square: category === "sidewalks",
                className: `transit-place-context-swatch--${category}`,
              },
              help: (
                <PlacesHelp
                  label={CONTEXT_OVERLAY_INFO[category].label.toLowerCase()}
                  text={`Inventory context, not routing destinations. Hover for source details. ${CONTEXT_LAYER_HELP[category]}`}
                />
              ),
              status: (
                <LoadStatus
                  label={CONTEXT_OVERLAY_INFO[category].label}
                  issues={contextIssues.filter(
                    (issue) =>
                      issue.label === CONTEXT_OVERLAY_INFO[category].label,
                  )}
                  loading={
                    contextOverlays.shown[category] &&
                    contextOverlays.sources[category].loading
                  }
                  warnings={contextWarnings(category)}
                />
              ),
            }))
          : []),
      ]
    : [];
  const contextSources = contextOverlays
    ? CONTEXT_CATEGORIES.flatMap((category) => {
        const index = contextOverlays.sources[category].index;
        return index
          ? [
              {
                ...provenanceRecord(
                  category,
                  CONTEXT_OVERLAY_INFO[category].label,
                  index,
                ),
                coverage: (
                  <>
                    {index.count.toLocaleString()} mapped features; only tiles
                    intersecting this map area load at the required zoom.{" "}
                    {index.coverage}
                  </>
                ),
              },
            ]
          : [];
      })
    : [];
  const provenanceSources: SourceProvenanceRecord[] = [
    ...contextSources,
    ...PLACE_CATEGORIES.flatMap((category) => {
      const snapshot = sources[category].snapshot;
      return snapshot
        ? [provenanceRecord(category, categoryName(category), snapshot)]
        : [];
    }),
    ...(neighborhoods?.snapshot
      ? [
          provenanceRecord(
            "neighborhoods",
            "Portland neighborhoods",
            neighborhoods.snapshot,
          ),
        ]
      : []),
    ...(lineOverlays
      ? LINE_OVERLAY_CATEGORIES.flatMap((category) => {
          const snapshot = lineOverlays.sources[category].snapshot;
          return snapshot
            ? [
                provenanceRecord(
                  category,
                  LINE_OVERLAY_INFO[category].label,
                  snapshot,
                ),
              ]
            : [];
        })
      : []),
  ];

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
        <PlaceDetailsPanel
          name={selected.name}
          headingId="selected-place-heading"
          headingRef={heading}
          status={
            <>
              <LoadStatus
                label={categoryName(selected.category)}
                issues={placeIssues.filter(
                  (issue) => issue.label === categoryName(selected.category),
                )}
                loading={sources[selected.category].loading}
              />
              <LoadStatus label="Saved places" issues={savedIssues} />
              <LoadStatus label="Place markers" issues={markerIssues} />
            </>
          }
          category={
            <>
              <FontAwesomeIcon
                icon={placeIconDefinition(selected.category)}
                aria-hidden="true"
              />{" "}
              {PLACE_INFO[selected.category].singular}
            </>
          }
          bookmarkAction={
            savedPlaces && (
              <Button
                size="sm"
                variant="secondary"
                aria-pressed={Boolean(savedPlaces.saved[selected.id])}
                onClick={() => savedPlaces.toggle(selected)}
              >
                <FontAwesome
                  name={
                    savedPlaces.saved[selected.id] ? "bookmark" : "bookmark-o"
                  }
                  aria-hidden="true"
                />{" "}
                {savedPlaces.saved[selected.id]
                  ? "Remove saved place"
                  : "Save place"}
              </Button>
            )
          }
          address={selected.address}
          arrivalNotice="Approximate map location, not a verified public entrance. Confirm your arrival point before finding trips."
          tripAction={
            <Link
              className="wm-btn wm-btn-primary"
              to={placePlannerLink(selected, origin, originMode, viewSearch)}
            >
              Plan a trip here
            </Link>
          }
          sourceUrl={selected.sourceUrl}
          website={selected.website}
          sourceDate={
            sources[selected.category].snapshot?.sourceUpdatedAt
              ? new Date(
                  sources[selected.category].snapshot.sourceUpdatedAt,
                ).toLocaleDateString()
              : undefined
          }
        >
          {["drinking-fountain", "picnic-seating", "park-artwork"].includes(
            selected.category,
          ) && (
            <section aria-label="Park amenity information">
              <h3>Source-listed amenity</h3>
              <p>
                {selected.amenityStyle ||
                  selected.amenityType ||
                  PLACE_INFO[selected.category].singular}
              </p>
              {selected.category === "drinking-fountain" ? (
                <p>
                  Water service, potability, seasonal operation and accessible
                  approaches are not verified. Some listed assets are dog bowls.
                  Check local signs and the fixture before relying on this stop.
                </p>
              ) : selected.category === "picnic-seating" ? (
                <p>
                  Each marker represents an individual table or bench, not a
                  reservable picnic area. Seating, availability, reservations,
                  fees, condition and accessible approaches are not verified.
                </p>
              ) : (
                <p>
                  This is a Parks asset record, not a complete public-art
                  directory or a verified artwork title. Current visibility,
                  condition and public access are not verified.
                </p>
              )}
            </section>
          )}
          {selected.category === "grocery-store" && (
            <p>
              Source-listed grocery store, not live opening or stock
              information. Confirm the current location and hours before
              traveling.
            </p>
          )}
          {selected.category === "reuse-repair" && (
            <section aria-label="Reuse and repair services">
              <h3>Source-listed services</h3>
              {selected.reuseServices && <p>{selected.reuseServices}</p>}
              {selected.reuseItems && (
                <p>
                  <strong>Items:</strong> {selected.reuseItems}
                </p>
              )}
              <p>
                This listing may be out of date. Confirm hours, eligibility,
                appointments, accepted items, and fees before visiting or
                bringing donations.
              </p>
            </section>
          )}
          {selected.category === "csa-pickup" && (
            <section aria-label="CSA pickup information">
              <h3>Source-listed pickup</h3>
              {selected.pickupSeason && (
                <p>
                  <strong>Season:</strong> {selected.pickupSeason}
                </p>
              )}
              {selected.pickupProducts && (
                <p>
                  <strong>Products:</strong> {selected.pickupProducts}
                </p>
              )}
              <p>
                Community-supported agriculture (CSA) pickups may require
                membership, scheduled collection, and permission to access the
                site. This is not a public market or a live schedule. Confirm
                the current pickup location and arrangements with the farm; do
                not enter private property without permission.
              </p>
            </section>
          )}
          {selected.category === "bicycle-parking" && (
            <section aria-label="Bicycle rack information">
              <h3>Source-listed rack</h3>
              <p>
                <strong>Capacity:</strong>{" "}
                {selected.bikeSpaces === undefined
                  ? "Unknown"
                  : `${selected.bikeSpaces} spaces`}
              </p>
              <p>
                <strong>Covered:</strong>{" "}
                {selected.bikeCovered === "yes"
                  ? "Yes"
                  : selected.bikeCovered === "no"
                    ? "No"
                    : "Unknown"}
              </p>
              <p>
                Markers and cluster counts represent racks, not spaces. This is
                not live availability or a guarantee of condition, security, or
                access. Check the rack and local signs before parking. Trip
                planning does not reserve parking or select a cycling route.
              </p>
            </section>
          )}
          {selected.category === "public-restroom" && (
            <section aria-label="Restroom access">
              <h3>Source-listed access</h3>
              <p>
                <strong>Status:</strong>{" "}
                {selected.restroomStatus === "listed-24-7"
                  ? "Listed 24/7 in the source; not verified."
                  : "Opening status unknown."}
              </p>
              <p>
                <strong>ADA designation:</strong>{" "}
                {selected.restroomAda === "yes"
                  ? "Yes (source-listed)"
                  : selected.restroomAda === "no"
                    ? "No (source-listed)"
                    : "Unknown"}
              </p>
              <p>
                Not live availability or a verified accessible route. Seasonal
                closures, fees, or building access restrictions may apply. Check
                with Portland Parks before relying on this stop.
              </p>
            </section>
          )}
          {selected.category === "heritage-tree" && (
            <section aria-label="Heritage tree access">
              {selected.scientificName && (
                <p>
                  <em>{selected.scientificName}</em>
                </p>
              )}
              {selected.treeOwnership && (
                <p>
                  <strong>Source-listed setting:</strong>{" "}
                  {selected.treeOwnership}
                </p>
              )}
              <p>
                This point marks the tree trunk, not a public entrance. Trees
                may be on private land or not visible from public paths. View
                only from lawful public access; do not enter private property.
              </p>
            </section>
          )}
          {selected.category === "community-garden" && (
            <p>
              Garden plots may require registration and have restricted access.
              Check with Portland Parks before visiting.
            </p>
          )}
          {CULTURE_PLACE_CATEGORIES.includes(selected.category) && (
            <section aria-label="Cultural venue information">
              <h3>Source-mapped venue</h3>
              <p>
                This community-mapped listing is not live opening information.
                Admission, tickets, reservations, accessibility and public
                access are not verified. Confirm the current location, hours and
                visiting arrangements with the venue.
              </p>
            </section>
          )}
          {OUTING_PLACE_CATEGORIES.includes(selected.category) && (
            <section aria-label="Outing destination information">
              {selected.siteType && (
                <p>
                  <strong>Source-listed type:</strong> {selected.siteType}
                </p>
              )}
              <p>
                This community-mapped listing is not live opening or
                availability information. Confirm public access, hours, fees and
                accessibility before visiting. Do not enter restricted property.
              </p>
              {selected.category === "splash-pad" && (
                <p>
                  Water operation is seasonal and not verified. A mapped splash
                  pad is not a drinking-water source or a guarantee that water
                  is running.
                </p>
              )}
              {["playground", "sports-court", "skatepark"].includes(
                selected.category,
              ) && (
                <p>
                  Mapped facilities do not establish current condition, age
                  suitability, opening hours or availability. School and managed
                  sites may have restricted access; check posted rules and
                  reservations.
                </p>
              )}
              {["public-garden", "nature-reserve", "viewpoint"].includes(
                selected.category,
              ) && (
                <p>
                  Use designated public entrances and paths. Conservation
                  restrictions, tickets and seasonal closures may apply; this
                  point does not establish a safe or accessible approach.
                </p>
              )}
              {["historic-site", "public-art"].includes(selected.category) && (
                <p>
                  View only from lawful public access. A source classification
                  is not verified historic designation, an artwork title or
                  permission to enter a building or site.
                </p>
              )}
            </section>
          )}
          {selected.category === "farmers-market" && (
            <section aria-label="Market schedule">
              <h3>Source-listed schedule</h3>
              <p>
                This snapshot may contain older seasonal dates and hours. Check
                the market website before traveling; this is not live opening
                information.
              </p>
              {selected.marketDays && (
                <p>
                  <strong>Days:</strong> {selected.marketDays}
                </p>
              )}
              {selected.marketSeason && (
                <p>
                  <strong>Season:</strong> {selected.marketSeason}
                </p>
              )}
              {selected.marketHours && (
                <p>
                  <strong>Hours:</strong> {selected.marketHours}
                </p>
              )}
            </section>
          )}
        </PlaceDetailsPanel>
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
      <SourceProvenancePanel
        sources={provenanceSources}
        noticeAfter={contextSources.length}
        description={
          <p>
            Snapshots are not live listings. Access, entrances, and opening
            hours are not verified. Mapped places may be missing or out of date.
          </p>
        }
        notice={
          <p>
            Regional Land Information System data are a product of Metro and
            made publicly available according to the{" "}
            <a
              href="https://rlisdiscovery.oregonmetro.gov/pages/open-database-license"
              target="_blank"
              rel="noreferrer"
            >
              RLIS license agreement
            </a>
            .
          </p>
        }
      />
    </section>
  );
}
