import { map } from "lodash";
import { StopLocation } from "../../../../../api/trimet/interfaces/types";

export function formatStopLocations(bookmarks: StopLocation[]) {
  return map(bookmarks, stop => {
    return {
      color: "#FF5630",
      label: `${stop.locid}: ${stop.desc}`,
      value: stop.locid
    };
  });
}
