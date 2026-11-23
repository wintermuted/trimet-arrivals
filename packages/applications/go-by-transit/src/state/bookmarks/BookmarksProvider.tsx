import React, { createContext, useContext, useMemo, useReducer } from "react";
import {
  addStoredRouteToBookmarkGroup,
  fetchStoredBookmarkSections,
  fetchStoredBookmarks,
  fetchStoredRouteBookmarkGroups,
  fetchStoredRouteBookmarks,
  removeAllStoredBookmarksInSection,
  removeStoredBookmark,
  removeStoredBookmarkFromSection,
  removeStoredBookmarkSection,
  removeStoredRouteBookmark,
  removeStoredRouteBookmarkGroup,
  removeStoredRouteFromAllBookmarkGroups,
  removeStoredRouteFromBookmarkGroup,
  storeBookmarkSection,
  storeLocationBookmark,
  storeRouteBookmark,
  updateStoredBookmarkSection,
  updateStoredBookmarkSectionName,
  type BookmarkSectionsProps,
  type RouteBookmark,
  type RouteBookmarkGroups,
  type RouteBookmarks,
  type StoredBookmarks,
} from "@overworld/bookmarks";
import type { StopLocation } from "@overworld/trimet-client";

type Domain = "stops" | "routes" | "sections" | "routeGroups";
type BookmarkErrors = Partial<Record<Domain, string>>;

interface BookmarkState {
  stops: StoredBookmarks;
  routes: RouteBookmarks;
  sections: BookmarkSectionsProps;
  routeGroups: RouteBookmarkGroups;
  sectionName: string;
  errors: BookmarkErrors;
}

type Action =
  | { type: "stops"; value: StoredBookmarks }
  | { type: "routes"; value: RouteBookmarks }
  | { type: "sections"; value: BookmarkSectionsProps }
  | { type: "routeGroups"; value: RouteBookmarkGroups }
  | { type: "sectionName"; value: string }
  | { type: "error"; domain: Domain; message: string };

function reducer(state: BookmarkState, action: Action): BookmarkState {
  if (action.type === "sectionName") {
    return { ...state, sectionName: action.value };
  }
  if (action.type === "error") {
    return {
      ...state,
      errors: { ...state.errors, [action.domain]: action.message },
    };
  }
  return {
    ...state,
    [action.type]: action.value,
    errors: { ...state.errors, [action.type]: undefined },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Browser storage is unavailable.";
}

function loadInitialState(): BookmarkState {
  const errors: BookmarkErrors = {};
  function read<T>(domain: Domain, load: () => T, empty: T): T {
    try {
      return load();
    } catch (error) {
      console.warn(`Could not load bookmark ${domain}.`, error);
      errors[domain] = errorMessage(error);
      return empty;
    }
  }
  return {
    stops: read("stops", fetchStoredBookmarks, {}),
    routes: read("routes", fetchStoredRouteBookmarks, {}),
    sections: read("sections", fetchStoredBookmarkSections, {}),
    routeGroups: read("routeGroups", fetchStoredRouteBookmarkGroups, {}),
    sectionName: "",
    errors,
  };
}

function createCommands(dispatch: React.Dispatch<Action>) {
  function run(domain: Domain, operation: () => void) {
    try {
      operation();
    } catch (error) {
      console.warn(`Could not save bookmark ${domain}.`, error);
      dispatch({ type: "error", domain, message: errorMessage(error) });
    }
  }

  function updateSections(write: () => void) {
    run("sections", () => {
      write();
      dispatch({ type: "sections", value: fetchStoredBookmarkSections() });
    });
  }

  function updateGroups(write: () => RouteBookmarkGroups) {
    run("routeGroups", () => {
      dispatch({ type: "routeGroups", value: write() });
    });
  }

  return {
    setSectionName(value: string) {
      dispatch({ type: "sectionName", value });
    },
    bookmarkStop(stop: StopLocation) {
      run("stops", () => {
        storeLocationBookmark(stop);
        dispatch({ type: "stops", value: fetchStoredBookmarks() });
      });
    },
    removeStop(locationId: number) {
      run("stops", () => {
        removeStoredBookmark(locationId);
        dispatch({ type: "stops", value: fetchStoredBookmarks() });
      });
    },
    bookmarkRoute(route: RouteBookmark) {
      run("routes", () => {
        dispatch({ type: "routes", value: storeRouteBookmark(route) });
      });
    },
    removeRoute(routeId: number) {
      let groupsRemoved = false;
      run("routeGroups", () => {
        const value = removeStoredRouteFromAllBookmarkGroups(routeId);
        dispatch({ type: "routeGroups", value });
        groupsRemoved = true;
      });
      if (groupsRemoved) {
        run("routes", () => {
          dispatch({
            type: "routes",
            value: removeStoredRouteBookmark(routeId),
          });
        });
      }
    },
    createSection(name: string) {
      run("sections", () => {
        const sections = fetchStoredBookmarkSections();
        const nextId = Math.max(-1, ...Object.keys(sections).map(Number)) + 1;
        storeBookmarkSection(nextId, { name, order: 0, bookmarkedStops: [] });
        dispatch({ type: "sections", value: fetchStoredBookmarkSections() });
        dispatch({ type: "sectionName", value: "" });
      });
    },
    removeSection(sectionId: number) {
      let groupsRemoved = false;
      run("routeGroups", () => {
        dispatch({
          type: "routeGroups",
          value: removeStoredRouteBookmarkGroup(sectionId),
        });
        groupsRemoved = true;
      });
      if (groupsRemoved) {
        updateSections(() => removeStoredBookmarkSection(sectionId));
      }
    },
    renameSection(sectionId: number, name: string) {
      updateSections(() => updateStoredBookmarkSectionName(sectionId, name));
    },
    addStopToSection(sectionId: number, stopId: number) {
      updateSections(() => updateStoredBookmarkSection(sectionId, stopId));
    },
    removeStopFromSection(sectionId: number, stopId: number) {
      updateSections(() => removeStoredBookmarkFromSection(sectionId, stopId));
    },
    clearSectionStops(sectionId: number) {
      updateSections(() => removeAllStoredBookmarksInSection(sectionId));
    },
    addRouteToSection(sectionId: number, routeId: number) {
      updateGroups(() => addStoredRouteToBookmarkGroup(sectionId, routeId));
    },
    removeRouteFromSection(sectionId: number, routeId: number) {
      updateGroups(() =>
        removeStoredRouteFromBookmarkGroup(sectionId, routeId),
      );
    },
  };
}

const BookmarkStateContext = createContext<BookmarkState | undefined>(
  undefined,
);
const BookmarkCommandsContext = createContext<
  ReturnType<typeof createCommands> | undefined
>(undefined);

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const commands = useMemo(() => createCommands(dispatch), [dispatch]);
  return (
    <BookmarkCommandsContext.Provider value={commands}>
      <BookmarkStateContext.Provider value={state}>
        {children}
      </BookmarkStateContext.Provider>
    </BookmarkCommandsContext.Provider>
  );
}

export function useBookmarks() {
  const state = useContext(BookmarkStateContext);
  if (!state) throw new Error("Bookmark consumers require BookmarksProvider.");
  return state;
}

export function useBookmarkCommands() {
  const commands = useContext(BookmarkCommandsContext);
  if (!commands)
    throw new Error("Bookmark commands require BookmarksProvider.");
  return commands;
}

export function useBookmarkError(...domains: Domain[]) {
  const { errors } = useBookmarks();
  const messages = domains.length
    ? domains.map((domain) => errors[domain])
    : Object.values(errors);
  return messages.filter(Boolean).join(" ");
}

export function BookmarkStorageErrors() {
  const error = useBookmarkError();
  return error ? (
    <p role="alert">
      Bookmarks could not be loaded or saved. {error} Check browser storage and
      try again.
    </p>
  ) : null;
}
