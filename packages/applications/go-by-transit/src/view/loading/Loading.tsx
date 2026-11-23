import { Spinner } from "@wintermuted/ui-react";
import React from "react";
function Loading() {
  return (
    <div className="transit-container">
      <Spinner label="Loading..." />
    </div>
  );
}

export default Loading;
