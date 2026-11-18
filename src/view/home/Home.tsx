import React, { useEffect, useState } from "react";

import { fetchStoredBookmarks } from "../../api/localstorage/bookmarks.localstorage";
import { getSystemAlerts } from "../../api/trimet/alerts";
import { Alert } from "../../api/trimet/interfaces/alertsData";
import AllAlertsCard from "./AllAlertsCard";
import BookmarksCard from "./BookmarksCard";
import { InfoCard } from "./InfoCard";
import { SystemAlertsCard } from "./SystemAlertsCard";

interface AlertsState {
  alerts: Alert[] | undefined;
  systemAlerts: Alert[] | undefined;
  loading: boolean;
  error: boolean;
}

export function partitionAlerts(alerts: Alert[]) {
  return {
    alerts: alerts
      .filter(alert => alert.system_wide_flag !== true)
      .sort((a, b) => b.begin - a.begin),
    systemAlerts: alerts.filter(alert => alert.system_wide_flag === true)
  };
}

export function useHomeAlerts() {
  const [alertsState, setAlertsState] = useState<AlertsState>({
    alerts: undefined,
    systemAlerts: undefined,
    loading: true,
    error: false
  });
  const [alertRefresh, setAlertRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setAlertsState(previous => ({ ...previous, loading: true, error: false }));
    getSystemAlerts()
      .then(result => {
        if (!result || !Array.isArray(result.alert)) {
          throw new Error("Invalid system alerts response");
        }
        if (active) {
          setAlertsState({
            ...partitionAlerts(result.alert),
            loading: false,
            error: false
          });
        }
      })
      .catch(() => {
        if (active) {
          setAlertsState(previous => ({
            ...previous,
            loading: false,
            error: true
          }));
        }
      });
    return () => {
      active = false;
    };
  }, [alertRefresh]);

  return {
    ...alertsState,
    onRefresh: () => setAlertRefresh(value => value + 1)
  };
}

function Home() {
  const alertsState = useHomeAlerts();
  const [bookmarksData, setBookmarksData] = useState(undefined);

  useEffect(() => {
    const storedBookmarks = fetchStoredBookmarks();
    setBookmarksData(storedBookmarks);
  }, []);

  return (
    <div className="transit-container">
      <br />
      <div className="transit-columns">
        <div className="transit-column transit-column-5">
          <InfoCard />
          <br />
          <SystemAlertsCard
            systemAlertsData={alertsState.systemAlerts}
            loading={alertsState.loading}
            error={alertsState.error}
            onRefresh={alertsState.onRefresh}
          />
        </div>
        <div className="transit-column transit-column-4">
          <AllAlertsCard
            alertsData={alertsState.alerts}
            loading={alertsState.loading}
            error={alertsState.error}
            onRefresh={alertsState.onRefresh}
          />
        </div>
        <div className="transit-column transit-column-3">
          <BookmarksCard bookmarks={bookmarksData} />
        </div>
      </div>
    </div>
  );
}

export default Home;
