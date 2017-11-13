import * as React from 'react';
import { map, sortBy } from 'lodash';
import { Arrival } from '../../../api/trimet/types';
import ArrivalRow from './ArrivalRow';
import './Arrivals.css';
import * as classNames from 'classnames';

export interface Props {
    arrivals: Arrival[];
    loading: boolean;
}

function sortArrivalsByEstimatedTime(arrivals: Arrival[]): Arrival[] {
    return sortBy(arrivals, (arrival: Arrival) => {
        return arrival.estimated;
    });
}

class ArrivalsTable extends React.Component<Props> {
    static getRows(arrivals: Arrival[]) {
        const sortedArrivals = sortArrivalsByEstimatedTime(arrivals);

        return map(sortedArrivals, (arrival: Arrival) => {
            return (
                <ArrivalRow arrival={arrival} key={arrival.id} />
            );
        });
    }
    
    render() {
        const { arrivals, loading } = this.props;

        if (!arrivals) {
            return null;
        }

        const classes = classNames('arrivals-table', {
            'arrivals-loading': loading
        });

        return (
            <table className={classes}>
                <th/>
                <th>Name</th>
                <th>Arrival</th>
                <th>On Time</th>
                <th>Estimated / Scheduled</th>
                <th>Distance</th>
                <tbody>
                    {ArrivalsTable.getRows(arrivals)}
                </tbody>
            </table>
        );
    }
}

export default ArrivalsTable;