import React from "react";
import FontAwesome from "react-fontawesome";
import { Route } from "../../api/trimet/types";

interface Props {
  route: Route;
  closeModal: () => void;
}

export default function ModalContent({ route, closeModal }: Props) {
  return (
    <div className="modal-content">
      <header className="info-header">
        <h4>Route Info</h4>
        <div className="close-button-container">
          <button onClick={closeModal} name="Close" title="Close">
            <FontAwesome name="times" />
          </button>
        </div>
      </header>
      <section>
        <h5>{route.desc}</h5>
        <p>Type: {route.type}</p>
        <h4>Directions:</h4>
        <p>{route.dir[0].desc}</p>
      </section>
    </div>
  );
}