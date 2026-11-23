import React from "react";
import "./Indicator.css";
import EarlyIndicator from "./EarlyIndicator";
import LateIndicator from "./LateIndicator";
import { isValidTimestamp } from "../timeUtils";

interface Props {
  scheduled: number;
  estimated: number;
}

export function isEstimatedEarly(scheduled: number, estimated: number) {
  return isValidTimestamp(scheduled) && isValidTimestamp(estimated) && estimated < scheduled;
}

export function estimatedToArriveAtSameTime(
  scheduled: number,
  estimated: number
) {
  return isValidTimestamp(scheduled) && isValidTimestamp(estimated) && scheduled === estimated;
}

export default function OnTimeIndicator({ scheduled, estimated }: Props) {
  if (isValidTimestamp(scheduled) && isValidTimestamp(estimated)) {
    if (estimatedToArriveAtSameTime(scheduled, estimated)) {
      return <span className="arrival-on-time"> On time</span>;
    } else {
      if (isEstimatedEarly(scheduled, estimated)) {
        return <EarlyIndicator scheduled={scheduled} estimated={estimated} />;
      } else {
        return <LateIndicator scheduled={scheduled} estimated={estimated} />;
      }
    }
  }

  return null;
}
