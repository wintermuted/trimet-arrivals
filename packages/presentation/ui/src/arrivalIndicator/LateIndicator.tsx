import React from "react";
import "./Indicator.css";
import { timeDiff } from "./util";
import { isValidTimestamp } from "../timeUtils";

interface Props {
  scheduled: number;
  estimated: number;
}

export default class LateIndicator extends React.PureComponent<Props> {
  public render() {
    const { scheduled, estimated } = this.props;

    if (isValidTimestamp(scheduled) && isValidTimestamp(estimated)) {
      const { seconds, minutes } = timeDiff(estimated, scheduled);

      if (minutes === 0) {
        return (
          <span className="arrival-estimated-late">{seconds}s late</span>
        );
      }

      return (
        <span className="arrival-estimated-late">
          {minutes}m {seconds}s late
        </span>
      );
    }

    return "-";
  }
}
