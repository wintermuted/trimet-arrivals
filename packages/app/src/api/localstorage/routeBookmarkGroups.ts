export const ROUTE_BOOKMARK_GROUPS = "ROUTE_BOOKMARK_GROUPS_V1";

export interface RouteBookmarkGroups {
  [sectionId: number]: number[];
}

interface StoredRouteBookmarkGroups {
  version: 1;
  groups: RouteBookmarkGroups;
}

function readStoredGroups(): RouteBookmarkGroups {
  const contents = localStorage.getItem(ROUTE_BOOKMARK_GROUPS);
  if (contents === null) {
    return {};
  }

  let stored: StoredRouteBookmarkGroups;
  try {
    stored = JSON.parse(contents);
  } catch {
    throw new Error("Stored route groups are malformed.");
  }

  if (
    !stored ||
    stored.version !== 1 ||
    !stored.groups ||
    typeof stored.groups !== "object" ||
    Array.isArray(stored.groups)
  ) {
    throw new Error("Stored route groups have an unsupported format.");
  }

  return Object.keys(stored.groups).reduce((groups, sectionId) => {
    const numericSectionId = Number(sectionId);
    const routeIds = stored.groups[sectionId];
    if (
      Number.isInteger(numericSectionId) &&
      numericSectionId >= 0 &&
      String(numericSectionId) === sectionId &&
      Array.isArray(routeIds) &&
      routeIds.every(routeId => Number.isInteger(routeId) && routeId > 0)
    ) {
      groups[numericSectionId] = Array.from(
        new Set(routeIds)
      );
    } else {
      throw new Error("Stored route groups contain malformed records.");
    }
    return groups;
  }, {} as RouteBookmarkGroups);
}

function writeStoredGroups(groups: RouteBookmarkGroups) {
  const stored: StoredRouteBookmarkGroups = { groups, version: 1 };
  localStorage.setItem(ROUTE_BOOKMARK_GROUPS, JSON.stringify(stored));
}

export function fetchStoredRouteBookmarkGroups(): RouteBookmarkGroups {
  return readStoredGroups();
}

export function addStoredRouteToBookmarkGroup(
  sectionId: number,
  routeId: number
): RouteBookmarkGroups {
  if (!Number.isInteger(sectionId) || sectionId < 0 ||
      !Number.isInteger(routeId) || routeId <= 0) {
    throw new Error("Valid section and route IDs are required.");
  }

  const groups = readStoredGroups();
  const routeIds = groups[sectionId] || [];
  if (!routeIds.includes(routeId)) {
    groups[sectionId] = [...routeIds, routeId];
    writeStoredGroups(groups);
  }
  return groups;
}

export function removeStoredRouteFromBookmarkGroup(
  sectionId: number,
  routeId: number
): RouteBookmarkGroups {
  if (!Number.isInteger(sectionId) || sectionId < 0 ||
      !Number.isInteger(routeId) || routeId <= 0) {
    throw new Error("Valid section and route IDs are required.");
  }

  const groups = readStoredGroups();
  groups[sectionId] = (groups[sectionId] || []).filter(id => id !== routeId);
  if (groups[sectionId].length === 0) {
    delete groups[sectionId];
  }
  writeStoredGroups(groups);
  return groups;
}

export function removeStoredRouteBookmarkGroup(
  sectionId: number
): RouteBookmarkGroups {
  if (!Number.isInteger(sectionId) || sectionId < 0) {
    throw new Error("A valid section ID is required.");
  }

  const groups = readStoredGroups();
  delete groups[sectionId];
  writeStoredGroups(groups);
  return groups;
}

export function removeStoredRouteFromAllBookmarkGroups(
  routeId: number
): RouteBookmarkGroups {
  if (!Number.isInteger(routeId) || routeId <= 0) {
    throw new Error("A valid route ID is required.");
  }

  const groups = readStoredGroups();
  Object.keys(groups).forEach(sectionId => {
    groups[sectionId] = groups[sectionId].filter(id => id !== routeId);
    if (groups[sectionId].length === 0) {
      delete groups[sectionId];
    }
  });
  writeStoredGroups(groups);
  return groups;
}
