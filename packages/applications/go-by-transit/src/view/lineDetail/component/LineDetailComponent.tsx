import React from "react";
import { useParams } from "react-router-dom";
import LineDetailView from "./LineDetailView";

function LineDetailComponent() {
  const { id } = useParams();

  return <LineDetailView id={Number(id)} />;
}

export default LineDetailComponent;
