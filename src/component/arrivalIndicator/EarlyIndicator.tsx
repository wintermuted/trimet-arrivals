import { Moment } from "moment";
import React from "react";
import "./Indicator.css";
import { remainingTime, timeDiff } from "./util";

interface Props {
  scheduled: Moment;
  estimated: Moment;
}

export default class EarlyIndicator extends React.PureComponent<Props> {
  public render() {
    const { scheduled, estimated } = this.props;

    if (scheduled && estimated) {
      const { seconds, minutes } = timeDiff(estimated, scheduled);
      const { secondsDiff, minutesDiff } = remainingTime(minutes, seconds);

      if (minutesDiff === 0) {
        return (
          <span className="arrival-estimated-early">{secondsDiff}s early</span>
        );
      }

      return (
        <span className="arrival-estimated-early">
          {59 - minutes}m {60 - seconds}s early
        </span>
      );
    }

    return "-";
  }
}
