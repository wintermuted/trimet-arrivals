import { arrivalsFixtureData } from "./fixture";
import { ArrivalData } from "./interfaces/arrivals";
import { TrimetClientOptions } from "./options";
import { getTrimetData } from "./util";

export async function getArrivals(
  stopLocationIds: string, // should be an ',' joined string of stop location ids like 123,456,789
  minutes: number,
  { baseUrl, appId, useFixtures }: TrimetClientOptions
): Promise<ArrivalData> {
  if (useFixtures) {
    return arrivalsFixtureData();
  }

  const request = `${baseUrl}V2/arrivals/json/true/locIDs/${stopLocationIds}/arrivals/4/showPosition/true/minutes/${minutes}/appID/${appId}`;

  return getTrimetData<ArrivalData>(request);
}
