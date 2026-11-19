import { useEffect, useState } from "react";
import { InterestPlace, placeCategoryForId } from "./places";

export const SAVED_PLACES_KEY = "SAVED_PLACES_V1";
export type SavedPlaces = Record<string, string>;
export function readSavedPlaces(): SavedPlaces {
  const value: unknown = JSON.parse(localStorage.getItem(SAVED_PLACES_KEY) ?? "[]");
  if (!Array.isArray(value) || !value.every(entry => entry && typeof entry === "object" &&
    typeof entry.id === "string" && entry.id.length <= 200 && placeCategoryForId(entry.id) &&
    typeof entry.name === "string" && entry.name.trim() && entry.name.length <= 500) ||
    new Set(value.map(entry => entry.id)).size !== value.length) throw new Error("Invalid saved places");
  return Object.fromEntries(value.map(entry => [entry.id, entry.name]));
}
export interface SavedPlaceControls {
  saved: SavedPlaces;
  error?: string;
  toggle: (place: InterestPlace) => void;
  remove: (id: string) => void;
  retry: () => void;
}
function readState(): { saved: SavedPlaces; error?: string; unreadable?: boolean } {
  try { return { saved: readSavedPlaces() }; }
  catch (error) {
    console.warn("Could not read saved places.", error);
    return { saved: {}, unreadable: true, error: "Saved places could not be read on this device. Existing data has not been overwritten. Retry to read it again." };
  }
}
export function useSavedPlaces(): SavedPlaceControls {
  const [state, setState] = useState(readState);
  const retry = () => setState(readState());
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === SAVED_PLACES_KEY || event.key === null) setState(readState());
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  function write(id: string, place?: InterestPlace) {
    if (state.unreadable) return;
    try {
      // Re-read before writing so changes from another tab are not overwritten.
      const saved = readSavedPlaces();
      if (place && !saved[id]) saved[id] = place.name;
      else delete saved[id];
      localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(Object.entries(saved).map(([key, name]) => ({ id: key, name }))));
      setState({ saved });
    } catch (error) {
      console.warn("Could not update saved places.", error);
      setState(previous => ({ ...previous, error: "Saved places could not be updated on this device. Your changes were not saved. Retry before trying again." }));
    }
  }
  return { saved: state.saved, error: state.error, retry,
    toggle: place => write(place.id, place), remove: id => write(id) };
}
