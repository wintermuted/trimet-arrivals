import React from "react";
import { StopLocation } from "../../api/trimet/types";
import { LoadArrivalData } from "../../store/action/stopActions";
import ArrivalsContainer from "../arrivals/ArrivalsContainer";
import StopsTableHeader from "./components/StopsTableHeader";
import "./Stops.css";

interface Props {
  stopLocation: StopLocation;
  loadArrivalData: (locationId: number) => TimerHandler;
  locationId: number;
  loading: boolean;
  showArrivals: boolean;
}

const interval = 30000;

class StopComponent extends React.Component<Props> {
  public refreshInterval: {};
  public loadAndSetInterval(locationId: number) {
    const { loadArrivalData } = this.props;
    loadArrivalData(locationId);
    this.refreshInterval = setInterval(loadArrivalData(locationId), interval);
  }
  public loadArrivals(locationId: number) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval as number);
    }
    this.loadAndSetInterval(locationId);
  }
  public render() {
    const { stopLocation, locationId, loading, showArrivals } = this.props;

    return (
      <div className="stop">
        <StopsTableHeader
          stopLocation={stopLocation}
          loadArrivalData={(locId: number) => this.loadArrivals(locId)}
          loading={loading}
          showArrivals={showArrivals}
        />
        <ArrivalsContainer
          locationId={locationId}
          showArrivals={showArrivals}
          loadArrivalData={(locId: number) => this.loadArrivals(locId)}
        />
      </div>
    );
  }
}

export default StopComponent;
