import { Moment } from "moment";
import React from "react";
import "./Indicator.css";
import { timeDiff } from "./util";

interface Props {
  estimated: Moment;
  now: Moment;
}

export default class TimeToArrivalIndicator extends React.PureComponent<Props> {
  public render() {
    const { estimated, now } = this.props;

    if (estimated && now) {
      const { seconds, minutes } = timeDiff(estimated, now);

      if (minutes === 0) {
        return `${seconds}s`;
      }

      return `${minutes}m ${seconds}s`;
    }

    return "-";
  }
}
