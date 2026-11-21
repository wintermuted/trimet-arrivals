import { Spinner } from "@wintermuted/ui-theme/react";
import React from "react";
function Loading() {
  return (
    <div className="transit-container">
      <Spinner label="Loading..." />
    </div>
  );
}

export default Loading;
