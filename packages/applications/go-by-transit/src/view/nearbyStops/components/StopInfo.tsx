import { Card, CardBody, CardHeader } from "@wintermuted/ui-react";
import React from "react";
import { TrimetRoute } from "../../../api/trimet/interfaces/types";
import StopLocationIndicator from "../../../component/stop/StopLocationIndicator";
import { StopLocationWithDistance } from "../../../store/reducers/util/formatStopLocations";
import "./StopInfo.css";
import StopRouteListing from "./StopRouteListing";

interface Props {
  stopLocation: StopLocationWithDistance;
  onClick: (route: TrimetRoute) => void;
}

export default function StopInfo({ stopLocation, onClick }: Props) {
  if (!stopLocation) {
    return null;
  }

  const id = stopLocation.locid ? stopLocation.locid : stopLocation.id;
  return (
    <Card className="stop-info-header">
      <CardHeader>
        <h3 style={{ fontSize: "1rem" }}>
          <StopLocationIndicator locationId={id} />
          <span className="stop-info">
            {stopLocation.desc} - {stopLocation.dir} -
          </span>
          <span>{stopLocation.distance} feet away</span>
        </h3>
      </CardHeader>
      <CardBody>
        <StopRouteListing routes={stopLocation.route} onClick={onClick} />
      </CardBody>
    </Card>
  );
}
