import { size } from "lodash";
import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useOutletContext,
  useParams,
  Navigate
} from "react-router-dom";
import BookmarksViewContainer from "../view/bookmarks/container/BookmarksViewContainer";
import Home from "../view/home/Home";
import SearchHome from "../view/home/SearchHome";
import LineDetailComponent from "../view/lineDetail/component/LineDetailComponent";
import { AllLines } from "../view/lines/component/AllLines";
import { BusLines } from "../view/lines/component/BusLines";
import LinesViewComponent from "../view/lines/component/LinesViewComponent";
import { MaxLines } from "../view/lines/component/MaxLines";
import { StreetCarLines } from "../view/lines/component/StreetCarLines";
import { WES } from "../view/lines/component/WES";
import MainNavigationContainer from "../view/mainNav/containers/MainNavigationContainer";
import NearbyView, {
  NearbyDirectionsComp,
  NearbyRoutesComponent,
  NearbySimpleRouteArrivalsComp,
  NearbySimpleRoutesComp,
  NearbyStopDetailComponent,
  NearbyStopsComponent,
  NearbyTripPlannerComponent
} from "../view/nearby/components/NearbyViewComponent";
import StopLocationViewContainer from "../view/stop/container/StopLocationViewContainer";
import StopCatalogView from "../view/stops/StopCatalogView";
import { ConnectedTripPlannerView } from "../view/tripPlanner/TripPlannerView";

function StopLocationViewRouter() {
  const { id } = useParams();

  return <StopLocationViewContainer locationId={parseInt(id, 10)} />;
}

function NearbyRouteDetails() {
  const { id } = useParams();

  return <div>Nearby Route Details</div>;
}

export default function RootAppRoutes() {
  return (
    <Router basename={process.env.PUBLIC_URL}>
      <MainNavigationContainer />
      <main className="main-view" tabIndex={0}>
        <Routes>
          <Route path="/" element={<SearchHome />} />
          <Route path="stops" element={<StopCatalogView />} />
          <Route path="planner" element={<ConnectedTripPlannerView />} />
          <Route path="nearby" element={<NearbyView />}>
            <Route path="" element={<Navigate to="simple-routes" />} />
            <Route path="planner" element={<NearbyTripPlannerComponent />} />
            <Route path="simple-routes" element={<NearbySimpleRoutesComp />} />
            <Route
              path="simple-routes/:id"
              element={<NearbySimpleRouteArrivalsComp />}
            />
            <Route path="directions" element={<NearbyDirectionsComp />} />
            <Route path="directions/arrivals" element={<NearbyDirectionsComp showTripTimes />} />
            <Route path="directions/trip" element={<NearbyDirectionsComp showTrip />} />
            <Route path="stops" element={<NearbyStopsComponent />} />
            <Route path="stops/:id" element={<NearbyStopDetailComponent />} />
            <Route path="routes" element={<NearbyRoutesComponent />} />
            <Route path="routes/:id" element={<NearbyRouteDetails />} />
          </Route>
          <Route path="/homepage-backup" element={<Home />} />
          <Route path="stop/:id" element={<StopLocationViewRouter />} />
          <Route path="lines" element={<LinesViewComponent />}>
            <Route path="all" element={<AllLines />} />
            <Route path={`max`} element={<MaxLines />} />
            <Route path={`streetcar`} element={<StreetCarLines />} />
            <Route path={`bus`} element={<BusLines />} />
            <Route path={`wes`} element={<WES />} />
            <Route path={`:id`} element={<LineDetailComponent />} />
          </Route>
          <Route path="bookmarks/*" element={<BookmarksViewContainer />} />
        </Routes>
      </main>
    </Router>
  );
}
