import { size } from "lodash";
import React from "react";
import { TrimetRoute } from "../../../api/trimet/types";
import Modal from "../../../component/modal/Modal";
import ModalContent from "../../../component/modal/ModalContent";
import NearbySubRoutes from "../../../routes/NearbySubRoutes";
import { LoadStopData } from "../../../store/action/stopActions";
import { StopLocationsDictionary } from "../../../store/reducers/stopsReducer";
import { RouteDirectionDict } from "../../../store/reducers/util/getRoutesFromStopLocations";
import NearbyMapContainer from "../containers/NearbyMapContainer";
import NearbySubNav from "./NearbySubNav";
import "./NearbyViewComponent.scss";

interface Props {
  loadStopData: LoadStopData;
  loading: boolean;
  stopLocations: StopLocationsDictionary;
  nearbyRoutes: RouteDirectionDict;
}

interface State {
  modalOpen: boolean;
  routeInfo: TrimetRoute;
}

export default class NearbyViewComponent extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      modalOpen: false,
      routeInfo: null
    };

    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
  }

  public componentDidMount() {
    const { loadStopData } = this.props;

    if (loadStopData) {
      loadStopData(1000);
    }
  }

  public render() {
    const { loading, stopLocations, nearbyRoutes } = this.props;

    const stopCount = size(stopLocations);
    const routeCount = size(nearbyRoutes);

    return (
      <div id="nearby-stops-view-component">
        {loading && <div className="loading-message">Loading...</div>}
        {!loading && stopLocations && (
          <div className="nearby-stops">
            <main>
              <div className="flex-container">
                <section className="flex-stops">
                  <NearbyMapContainer />
                  <NearbySubNav stopCount={stopCount} routeCount={routeCount} />
                  <NearbySubRoutes stopLocations={stopLocations} />
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

  public openModal(route: TrimetRoute) {
    this.setState({
      modalOpen: true,
      routeInfo: route
    });
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
