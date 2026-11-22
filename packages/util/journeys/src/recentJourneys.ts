const STORAGE_KEY = "overworld:recent-journeys";
const LIMIT = 5;

interface JourneyStop {
  locid: number;
  desc: string;
}

export interface RecentJourney {
  from: JourneyStop;
  to: JourneyStop;
}

function isJourneyStop(value: unknown): value is JourneyStop {
  if (!value || typeof value !== "object") return false;
  const { locid, desc } = value as Partial<JourneyStop>;
  return (
    typeof locid === "number" &&
    Number.isSafeInteger(locid) &&
    locid > 0 &&
    typeof desc === "string" &&
    Boolean(desc.trim())
  );
}

function isJourney(value: unknown): value is RecentJourney {
  if (!value || typeof value !== "object") return false;
  const { from, to } = value as Partial<RecentJourney>;
  return isJourneyStop(from) && isJourneyStop(to) && from.locid !== to.locid;
}

export function readRecentJourneys(): RecentJourney[] {
  const journeys: unknown = JSON.parse(
    localStorage.getItem(STORAGE_KEY) ?? "[]",
  );
  if (!Array.isArray(journeys)) throw new Error("Invalid recent journeys");
  return journeys.filter(isJourney).slice(0, LIMIT);
}

export function recordRecentJourney(from: JourneyStop, to: JourneyStop) {
  const previous = readRecentJourneys().filter(
    (journey) =>
      journey.from.locid !== from.locid || journey.to.locid !== to.locid,
  );
  const journey = {
    from: { locid: from.locid, desc: from.desc },
    to: { locid: to.locid, desc: to.desc },
  };
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([journey, ...previous].slice(0, LIMIT)),
  );
}
