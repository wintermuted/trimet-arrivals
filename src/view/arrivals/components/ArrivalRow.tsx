import React from 'react';
import moment, { Moment } from 'moment';
import RouteIndicator from '../../../component/route/RouteIndicator';
import './Arrivals.css';
import TimeToArrivalIndicator from '../../../component/arrivalIndicator/TimeToArrivalIndicator';
import { getDistanceUntilArrival } from '../util';
import OnTimeIndicator from '../../../component/arrivalIndicator/OnTimeIndicator';

interface Props {
    scheduled: number
    estimated: number
    feet: number
    route: number
    shortSign: string
}

class ArrivalRow extends React.Component<Props> {
    static getEstimatedScheduledTime(scheduled: Moment, estimated: Moment) {
        const scheduledTime = scheduled.format('h:mm:ss a');
        const estimatedTime = estimated.format('h:mm:ss a');

        return `${estimatedTime} / ${scheduledTime}`;
    }

    render() {
        const { scheduled, estimated, feet, route, shortSign } = this.props;
        const scheduledMoment = moment(scheduled);
        const estimatedMoment = moment(estimated);
        const distance = getDistanceUntilArrival(feet);
        const now = moment();

        return (
            <tr>
                <td className="route-indicator-column">
                    <RouteIndicator routeId={route} />
                </td>
                <td>{shortSign}</td>
                <td>
                    <TimeToArrivalIndicator estimated={estimatedMoment} now={now} />
                </td>
                <td>
                    <OnTimeIndicator scheduled={scheduledMoment} estimated={estimatedMoment} />
                </td>
                <td>{ArrivalRow.getEstimatedScheduledTime(scheduledMoment, estimatedMoment)}</td>
                <td>{Math.round(distance)} miles</td>
            </tr>
        );
    }
}

export default ArrivalRow;