import { stopFixtureData } from "./fixture";
import { Location, StopData } from "./interfaces/types";
import { TrimetClientOptions } from "./options";
import { getTrimetData } from "./util";

export async function getNearbyStops(
  location: Location,
  radiusInFeet: number,
  { baseUrl, appId, useFixtures }: TrimetClientOptions
): Promise<StopData> {
  if (useFixtures) {
    return stopFixtureData();
  }

  const { latitude, longitude } = location.coords;
  const request = `${baseUrl}V1/stops/json/true/showRoutes/true/showRouteDirs/true/ll/${latitude},${longitude}/feet/${radiusInFeet}/appID/${appId}`;

  return getTrimetData<StopData>(request);
}
