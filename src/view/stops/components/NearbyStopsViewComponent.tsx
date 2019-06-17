import React from "react";
import { Route } from "../../../api/trimet/types";
import NearbyStopsMap from "../../../component/maps/NearbyStopsMap";
import Modal from "../../../component/modal/Modal";
import ModalContent from "../../../component/modal/ModalContent";
import { LoadStopData } from "../../../store/action/stopActions";
import {
  SHOW_NEARBY_ROUTES,
  SHOW_NEARBY_STOPS
} from "../../../store/reducers/nearbyViewReducer";
import {
  RouteDirection,
  StopLocationsDictionary
} from "../../../store/reducers/stopsReducer";
import "../Stops.css";
import Routes from "./Routes";
import Stops from "./Stops";

interface Props {
  loadStopData: LoadStopData;
  loading: boolean;
  stopLocations: StopLocationsDictionary;
  nearbyRoutes: RouteDirection[];
  currentLocation: number[];
  activeView: string;
  changeView: (view: string) => void;
}

interface State {
  modalOpen: boolean;
  routeInfo: Route;
}

export default class NearbyStopsViewComponent extends React.Component<
  Props,
  State
> {
  constructor(props) {
    super(props);

    this.state = {
      modalOpen: false,
      routeInfo: null
    };

    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.showStops = this.showStops.bind(this);
    this.showRoutes = this.showRoutes.bind(this);
  }

  public showStops() {
    this.props.changeView(SHOW_NEARBY_STOPS);
  }

  public showRoutes() {
    this.props.changeView(SHOW_NEARBY_ROUTES);
  }

  public componentDidMount() {
    const { loadStopData } = this.props;

    if (loadStopData) {
      loadStopData(1000);
    }
  }

  public render() {
    const {
      loading,
      stopLocations,
      currentLocation,
      nearbyRoutes,
      activeView
    } = this.props;

    return (
      <div id="nearby-stops-view-component">
        {loading && <div className="loading-message">Loading...</div>}
        {!loading && stopLocations && (
          <div className="nearby-stops">
            <main>
              <div className="flex-container">
                <section className="flex-stops">
                  <NearbyStopsMap
                    currentLocation={currentLocation}
                    stopLocations={stopLocations}
                    nearbyRoutes={nearbyRoutes}
                  />
                  {this.getNav()}
                  {activeView === SHOW_NEARBY_ROUTES && (
                    <Routes nearbyRoutes={nearbyRoutes} />
                  )}
                  {activeView === SHOW_NEARBY_STOPS && (
                    <Stops
                      stopLocations={stopLocations}
                      showArrivals={false}
                      onRouteIndicatorClick={this.openModal}
                    />
                  )}
                </section>
                {this.state.modalOpen && this.showModal()}
              </div>
            </main>
          </div>
        )}
      </div>
    );
  }

  public closeModal() {
    this.setState({
      modalOpen: false,
      routeInfo: null
    });
  }

  public openModal(route: Route) {
    this.setState({
      modalOpen: true,
      routeInfo: route
    });
  }

  private getNav() {
    return (
      <nav>
        <ul>
          <li>
            <a onClick={this.showStops}>Stops</a>
          </li>
          <li>
            <a onClick={this.showRoutes}>Routes</a>
          </li>
        </ul>
      </nav>
    );
  }

  private showModal() {
    return (
      <div className="flex-info">
        <aside id="modal-root" className="modal-wrapper" />
        <Modal>
          <ModalContent
            route={this.state.routeInfo}
            closeModal={this.closeModal}
          />
        </Modal>
      </div>
    );
  }
}
