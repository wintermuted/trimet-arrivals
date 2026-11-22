import React from "react";
import { Alert } from "../../../api/trimet/interfaces/alertsData";
import { TrimetRoute } from "../../../api/trimet/interfaces/routes";
import { AlertRequestState } from "../../../store/reducers/data/alertDataReducer";
import RouteIndicator from "../../../component/route/RouteIndicator";
import { getRouteIndicatorClassName } from "../../../component/route/RouteListItem";
import "./NearbyRouteDetail.scss";
import RouteAlerts from "./RouteAlerts";
import RouteDirections from "./RouteDirections";

interface Props {
  id: number;
  loadRouteData: (id: number) => void;
  loadAlertData: (id: number) => void;
  retryAlertData: (id: number) => void;
  route: TrimetRoute;
  alerts: Alert[];
  alertRequest: AlertRequestState;
}

export default class NearbyRouteDetail extends React.Component<Props> {
  public componentDidMount(): void {
    const { id, loadAlertData, loadRouteData } = this.props;

    loadRouteData(id);
    loadAlertData(id);
  }

  public componentDidUpdate(previousProps: Props): void {
    if (previousProps.id !== this.props.id) {
      this.props.loadRouteData(this.props.id);
      this.props.loadAlertData(this.props.id);
    }
  }

  public render() {
    const { route, id, alerts, alertRequest, retryAlertData } = this.props;

    if (!route) {
      return <div>Loading</div>;
    }

    return (
      <div>
        <div
          className="route-header nearby-route"
          style={{ ...{ backgroundColor: `#${route.routeColor}` } }}
        >
          <RouteIndicator
            key={route.route}
            routeId={route.route}
            route={undefined}
            verbose={true}
          />
        </div>
        <RouteAlerts
          id={id}
          alerts={alerts}
          loading={alertRequest?.loading}
          error={alertRequest?.error}
          onRetry={() => retryAlertData(id)}
        />
        <RouteDirections route={route} />
      </div>
    );
  }
}
