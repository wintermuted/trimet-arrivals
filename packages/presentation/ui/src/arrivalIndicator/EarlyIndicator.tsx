import React from "react";
import "./Indicator.css";
import { timeDiff } from "./util";
import { isValidTimestamp } from "../timeUtils";

interface Props {
  scheduled: number;
  estimated: number;
}

export default class EarlyIndicator extends React.PureComponent<Props> {
  public render() {
    const { scheduled, estimated } = this.props;

    if (isValidTimestamp(scheduled) && isValidTimestamp(estimated)) {
      const { seconds, minutes } = timeDiff(scheduled, estimated);

      if (minutes === 0) {
        return (
          <span className="arrival-estimated-early">{seconds}s early</span>
        );
      }

      return (
        <span className="arrival-estimated-early">
          {minutes}m {seconds}s early
        </span>
      );
    }

    return "-";
  }
}
