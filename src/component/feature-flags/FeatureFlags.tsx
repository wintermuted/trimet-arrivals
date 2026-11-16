import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { clearWalkingCache } from "../../api/mapbox/walking";

interface FeatureFlags {
  walkingEnabled: boolean;
  setWalkingEnabled: (enabled: boolean) => void;
}

const FeatureFlagsContext = createContext<FeatureFlags | undefined>(undefined);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [walkingEnabled, setWalkingEnabled] = useState(false);

  useEffect(() => {
    if (!walkingEnabled) clearWalkingCache();
    return () => clearWalkingCache();
  }, [walkingEnabled]);

  return (
    <FeatureFlagsContext.Provider value={{ setWalkingEnabled, walkingEnabled }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlags {
  const flags = useContext(FeatureFlagsContext);
  if (!flags) throw new Error("Feature flags require FeatureFlagsProvider.");
  return flags;
}
