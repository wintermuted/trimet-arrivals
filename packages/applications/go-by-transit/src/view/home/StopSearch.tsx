import React from "react";
import { Link } from "react-router-dom";
import { StopSearch as SharedStopSearch } from "@overworld/ui/search";
import { useStopCatalog } from "@overworld/trimet-client/react";
import { getStopCatalog } from "../../api/trimet/stopCatalog";
import { stopDetailUrl } from "../nearby/util/stopNavigation";

export default function StopSearch() {
  const { catalog, loading, error, refresh } = useStopCatalog(getStopCatalog);
  return <SharedStopSearch catalog={catalog} loading={loading} error={error} onRetry={refresh}
    inputId="homepage-stop"
    renderStopLinks={stop => <>
      <Link to={`/planner?to=${stop.locid}`} aria-label={`Plan a trip to ${stop.desc}, stop ${stop.locid}`}>
        Plan a trip
      </Link>
      <Link to={stopDetailUrl(stop.locid, "/")} aria-label={`Arrivals at ${stop.desc}, stop ${stop.locid}`}>
        Arrivals
      </Link>
    </>}
    footer={<>
      <Link to="/planner">Plan a trip</Link>
      <Link to="/stops">Browse all stops</Link>
      <a href="#homepage-alerts">Service alerts</a>
    </>}
  />;
}
