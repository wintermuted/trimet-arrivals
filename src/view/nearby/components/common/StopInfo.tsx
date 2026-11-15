import {
  Card,
  CardBody,
  CardText,
  CardTitle
} from "@wintermuted/ui-theme/react";
import React from "react";
import { StopLocation } from "../../../../api/trimet/interfaces/types";

interface StopInfoParams {
  stopLocation: StopLocation;
}

function StopInfo({ stopLocation }: StopInfoParams) {
  return (
    <Card>
      <CardBody>
        <CardTitle>{stopLocation.desc}</CardTitle>
        <CardText>
          <small style={{ color: "var(--wm-color-text-muted)" }}>
            StopID: {stopLocation.id}
          </small>
        </CardText>
      </CardBody>
    </Card>
  );
}

export default StopInfo;
