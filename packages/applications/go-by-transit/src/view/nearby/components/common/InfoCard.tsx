import {
  Card,
  CardBody,
  CardText,
  CardTitle
} from "@wintermuted/ui-theme/react";
import React from "react";
interface InfoCardParams {
  id: string;
}

export function InfoCard({ id }: InfoCardParams) {
  return (
    <Card>
      {/*<Card.Header>Stop Info</Card.Header>*/}
      <CardBody>
        <CardTitle as="h6">{id} schedule:</CardTitle>
        <CardText>5:00 to 23:30</CardText>
        <hr />
        <CardTitle as="h6">Stop also serves:</CardTitle>
        <CardText>56, 54</CardText>
      </CardBody>
    </Card>
  );
}
