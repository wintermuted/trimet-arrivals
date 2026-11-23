import { Button } from "@wintermuted/ui-react";
import React from "react";
import type { Arrival, StopLocation } from "@overworld/trimet-client";
import type { ArrivalRowProps } from "./ArrivalRow";
import "./Arrivals.css";
import ArrivalsTable from "./ArrivalsTable";

export interface ArrivalsTableLoadMoreProps {
  loading: boolean;
  arrivals: Arrival[];
  now: number;
  stopLocation: StopLocation;
  renderRouteIndicator: ArrivalRowProps["renderRouteIndicator"];
  formatDistance: ArrivalRowProps["formatDistance"];
}

interface State {
  showMore: boolean;
}

export default class ArrivalsTableLoadMore extends React.Component<
  ArrivalsTableLoadMoreProps,
  State
> {
  constructor(props: ArrivalsTableLoadMoreProps) {
    super(props);

    this.state = {
      showMore: false
    };

    this.toggleShowMore = this.toggleShowMore.bind(this);
  }

  public render() {
    const {
      arrivals,
      loading = true,
      now,
      renderRouteIndicator,
      formatDistance,
      stopLocation
    } = this.props;
    const { showMore } = this.state;
    const arrivalsCount = arrivals && arrivals.length;

    return (
      <div className="arrivals-wrapper">
        <ArrivalsTable
          arrivals={arrivals}
          loading={loading}
          now={now}
          renderRouteIndicator={renderRouteIndicator}
          formatDistance={formatDistance}
          stopLocation={stopLocation}
          showMore={showMore}
        />
        {arrivalsCount > 5 && this.showLoadMoreControl(showMore, arrivalsCount)}
      </div>
    );
  }

  private showLoadMoreControl(showMore: boolean, arrivalCount: number) {
    const additionalArrivals = arrivalCount - 5;

    return (
      <div className="arrivals-load-more-control">
        <div className="load-more-flex-container">
          {showMore && (
            <Button onClick={this.toggleShowMore}>Only show 5 arrivals</Button>
          )}
          {!showMore && (
            <Button onClick={this.toggleShowMore}>
              Show {additionalArrivals} more arrivals
            </Button>
          )}
        </div>
      </div>
    );
  }

  private toggleShowMore() {
    this.setState({
      showMore: !this.state.showMore
    });
  }
}
