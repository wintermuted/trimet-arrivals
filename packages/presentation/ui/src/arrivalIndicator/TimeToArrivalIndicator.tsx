import React from "react";
import "./Indicator.css";
import { timeDiff } from "./util";
import { isValidTimestamp } from "../timeUtils";

interface Props {
  estimated: number;
  now: number;
}

export default class TimeToArrivalIndicator extends React.PureComponent<Props> {
  public render() {
    const { estimated, now } = this.props;

    if (isValidTimestamp(estimated) && isValidTimestamp(now)) {
      if (estimated <= now) {
        return "Due";
      }
      const { seconds, minutes } = timeDiff(estimated, now);

      if (minutes === 0) {
        return `${seconds}s`;
      }

      return `${minutes}m ${seconds}s`;
    }

    return "-";
  }
}
