import { useCallback, useEffect, useState } from "react";
import type { StopCatalog } from "./stopCatalog";

export type StopCatalogRequest<C extends StopCatalog> = (forceRefresh: boolean) => Promise<C>;

export interface StopCatalogState<C extends StopCatalog> {
  catalog?: C;
  error: boolean;
  fetchedAt?: Date;
  loading: boolean;
}

export function useStopCatalog<C extends StopCatalog & { receivedAt?: string }>(
  request: StopCatalogRequest<C>,
) {
  const [state, setState] = useState<StopCatalogState<C>>({ error: false, loading: true });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    let active = true;
    setState(previous => ({ ...previous, error: false, loading: true }));
    async function load() {
      try {
        const catalog = await request(revision > 0);
        if (active) {
          setState({
            catalog,
            error: false,
            fetchedAt: catalog.receivedAt ? new Date(catalog.receivedAt) : new Date(),
            loading: false,
          });
        }
      } catch {
        if (active) setState(previous => ({ ...previous, error: true, loading: false }));
      }
    }
    void load();
    return () => { active = false; };
  }, [request, revision]);

  return { ...state, refresh };
}
