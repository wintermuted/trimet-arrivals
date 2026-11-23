import { Dialog } from "@wintermuted/ui-react";
import React, { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
}

export default function Modal({ children, onClose }: ModalProps) {
  return (
    <Dialog open={true} onClose={onClose} title="Route Info">
      {children}
    </Dialog>
  );
}
