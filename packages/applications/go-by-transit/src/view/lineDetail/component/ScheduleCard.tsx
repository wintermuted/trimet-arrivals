import {
  Card,
  CardBody,
  CardHeader,
  CardText
} from "@wintermuted/ui-react";
import React from "react";
import { TrimetRoute } from "../../../api/trimet/interfaces/routes";
import FrequentServiceIndicator from "../../../component/route/FrequentServiceIndicator";
import { LineScheduleInfo } from "../../../data/trimet/schedules/maxLightRail";

interface ScheduleCardParams {
  routeSchedule: LineScheduleInfo;
  route: TrimetRoute;
}

export function ScheduleCard({ routeSchedule, route }: ScheduleCardParams) {
  return (
    <Card>
      <CardHeader as="h5">Schedule</CardHeader>
      <CardBody>
        <CardText>
          <>
            {routeSchedule && routeSchedule.frequentService && (
              <FrequentServiceIndicator
                frequentService={routeSchedule.frequentService}
              />
            )}
            <strong>Hours of Operation:</strong> 5:00 AM - 12:00 PM
            <br />
            <strong>Connections:</strong>
            <br />
            <strong>Areas served:</strong>
          </>
        </CardText>
      </CardBody>
    </Card>
  );
}
