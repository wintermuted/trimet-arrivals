import React from "react";
import {
  SourceProvenancePanel,
  type MapReferenceLayer,
  type SourceProvenanceRecord,
} from "@overworld/ui";
import FontAwesome from "react-fontawesome";
import {
  categoryName,
  PLACE_CATEGORIES,
  type PlaceCategory,
  type PlaceSourceState,
} from "@overworld/places/catalog";
import { type NeighborhoodState } from "@overworld/places/neighborhoods";
import {
  LINE_OVERLAY_CATEGORIES,
  LINE_OVERLAY_INFO,
  type LineOverlayControls,
} from "@overworld/places/lineOverlays";
import {
  CONTEXT_CATEGORIES,
  CONTEXT_OVERLAY_INFO,
  type ContextCategory,
  type ContextControls,
} from "@overworld/places/contextOverlays";
import PlacesHelp from "./PlacesHelp";
import LoadStatus, { type LoadIssue } from "./PlacesLoadStatus";

export type NeighborhoodControls = NeighborhoodState & {
  shown: boolean;
  onShown: (shown: boolean) => void;
  polygonsShown: boolean;
  onPolygonsShown: (shown: boolean) => void;
  mapError: boolean;
  onRetry: () => void;
};

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

export function getPlaceLayerPresentation({
  sources,
  neighborhoods,
  lineOverlays,
  contextOverlays,
}: {
  sources: Record<PlaceCategory, PlaceSourceState>;
  neighborhoods?: NeighborhoodControls;
  lineOverlays?: LineOverlayControls;
  contextOverlays?: ContextControls;
}) {
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
  return {
    layerIssues,
    layersLoading,
    contextWarnings,
    mapLayers,
    provenanceSources,
    contextSourceCount: contextSources.length,
  };
}

export function PlaceSources({
  sources,
  noticeAfter,
}: {
  sources: SourceProvenanceRecord[];
  noticeAfter: number;
}) {
  return (
    <SourceProvenancePanel
      sources={sources}
      noticeAfter={noticeAfter}
      description={
        <p>
          Snapshots are not live listings. Access, entrances, and opening hours
          are not verified. Mapped places may be missing or out of date.
        </p>
      }
      notice={
        <p>
          Regional Land Information System data are a product of Metro and made
          publicly available according to the{" "}
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
  );
}
