import { readRecentJourneys, recordRecentJourney } from "./recentJourneys";

const key = "overworld:recent-journeys";
const stop = (locid: number) => ({ desc: `Stop ${locid}`, locid });

beforeEach(() => localStorage.clear());

it("reads existing endpoint pairs and replaces duplicates without changing their direction", () => {
  localStorage.setItem(key, JSON.stringify([
    { from: stop(2), to: stop(1) },
    { from: stop(1), to: stop(2) },
    { from: stop(1), to: stop(1) },
  ]));

  const renamed = { desc: "Renamed stop", locid: 1 };
  recordRecentJourney(renamed, stop(2));

  const expected = [
    { from: renamed, to: stop(2) },
    { from: stop(2), to: stop(1) },
  ];
  expect(readRecentJourneys()).toEqual(expected);
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual(expected);
});

it("retains only the five latest journeys", () => {
  for (let id = 2; id <= 7; id += 1) recordRecentJourney(stop(1), stop(id));

  expect(readRecentJourneys().map(({ to }) => to.locid)).toEqual([7, 6, 5, 4, 3]);
});
