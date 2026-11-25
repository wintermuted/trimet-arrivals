import {
  LoadStatus,
  type LoadIssue as GenericLoadIssue,
} from "@overworld/ui-staging";
import React from "react";
import FontAwesome from "react-fontawesome";
import {
  categoryName,
  PLACE_CATEGORIES,
  PlaceCategory,
  PlaceSourceState,
} from "@overworld/places/catalog";
import PlacesHelp from "./PlacesHelp";

export type LoadIssue = GenericLoadIssue & { label: string };

export function placeSourceIssues(
  sources: Record<PlaceCategory, PlaceSourceState>,
  onRetry: (category: PlaceCategory) => void,
): LoadIssue[] {
  return PLACE_CATEGORIES.filter((category) => sources[category].error).map(
    (category) => ({
      label: categoryName(category),
      message: `${categoryName(category)} could not be loaded.${
        sources[category].snapshot
          ? " The previously loaded snapshot is still shown."
          : " Other available places remain usable."
      }`,
      retry: () => onRetry(category),
    }),
  );
}

export default function PlacesLoadStatus({
  label,
  issues,
  loading = false,
  warnings = [],
}: {
  label: string;
  issues: LoadIssue[];
  loading?: boolean;
  warnings?: string[];
}) {
  return (
    <LoadStatus
      issues={issues}
      warnings={warnings}
      loading={loading}
      className={`transit-places-load-status${issues.length ? "" : " transit-places-load-status--warning"}`}
      labels={{
        retry: `Retry ${label.toLowerCase()}`,
        loading: `Loading ${label.toLowerCase()}...`,
      }}
      renderHelp={({ message, tone }) => (
        <PlacesHelp
          label={label}
          triggerLabel={`${label} ${tone}`}
          icon="exclamation-triangle"
          text={message}
        />
      )}
      retryIcon={
        <FontAwesome name="refresh" spin={loading} aria-hidden="true" />
      }
      loadingIcon={<FontAwesome name="spinner" spin aria-hidden="true" />}
    />
  );
}
