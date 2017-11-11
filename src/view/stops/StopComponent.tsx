import * as React from 'react';
import './Stops.css';
import StopsTableHeader from './components/StopsTableHeader';
import ArrivalsContainer from '../arrivals/ArrivalsContainer';
import { StopLocation } from '../../api/trimet/types';
import { LoadArrivalData } from '../../store/action/stopActions';

interface Props {
    stopLocation: StopLocation;
    loadArrivalData: LoadArrivalData;
    locationId: number;
    loading: boolean;
    showArrivals: boolean;
}

const interval = 30000;

class StopComponent extends React.Component<Props> {
    refreshInterval: {};
    loadAndSetInterval(locationId: number) {
        const { loadArrivalData } = this.props;
        loadArrivalData(locationId);
        this.refreshInterval = setInterval(loadArrivalData(locationId), interval);
    }
    loadArrivals(locationId: number) {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval as number);
            this.loadAndSetInterval(locationId);
        } else {
            this.loadAndSetInterval(locationId);
        }
    }
    render() {
        const { stopLocation, locationId, loading, showArrivals } = this.props;

        return (
            <div className="stops">
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