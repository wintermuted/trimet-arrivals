import { Button } from "@wintermuted/ui-theme/react";
import React from "react";
import FontAwesome from "react-fontawesome";
import { categoryName, PLACE_CATEGORIES, PlaceCategory, PlaceSourceState } from "../../../api/places/places";
import PlacesHelp from "./PlacesHelp";
import "./PlacesLoadStatus.scss";

export type LoadIssue = { label: string; message: string; retry?: () => void };

export function placeSourceIssues(sources: Record<PlaceCategory, PlaceSourceState>, onRetry: (category: PlaceCategory) => void): LoadIssue[] {
  return PLACE_CATEGORIES.filter(category => sources[category].error).map(category => ({
    label: categoryName(category),
    message: `${categoryName(category)} could not be loaded.${sources[category].snapshot
      ? " The previously loaded snapshot is still shown." : " Other available places remain usable."}`,
    retry: () => onRetry(category)
  }));
}

export default function PlacesLoadStatus({ label, issues, loading = false, warnings = [] }: {
  label: string; issues: LoadIssue[]; loading?: boolean; warnings?: string[]
}) {
  if (!issues.length && !loading && !warnings.length) return null;
  const message = [...issues.map(issue => issue.message), ...warnings].join(" ");
  return <span className={`transit-places-load-status${issues.length ? "" : " transit-places-load-status--warning"}`}
    onClick={event => event.stopPropagation()}
    onKeyDown={event => event.stopPropagation()}>
    {(issues.length > 0 || warnings.length > 0) && <>
      <span role={issues.length ? "alert" : "status"} className="wm-sr-only">{message}</span>
      <PlacesHelp label={label} triggerLabel={`${label} ${issues.length ? "error" : "warning"}`} icon="exclamation-triangle"
        text={message} />
      {issues.some(issue => issue.retry) && <Button size="sm" variant="ghost" aria-label={`Retry ${label.toLowerCase()}`} disabled={loading}
        onClick={event => { event.preventDefault(); issues.forEach(issue => issue.retry?.()); }}>
        <FontAwesome name="refresh" spin={loading} aria-hidden="true" />
      </Button>}
    </>}
    {loading && !issues.length && <span role="status" aria-label={`Loading ${label.toLowerCase()}...`}>
      <FontAwesome name="spinner" spin aria-hidden="true" />
    </span>}
  </span>;
}
