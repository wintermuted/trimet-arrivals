import { Button, CardHeader } from "@wintermuted/ui-react";
import cx from "classnames";
import React from "react";
import FontAwesome from "react-fontawesome";
import { RemoveBookmarkSectionButton } from "../../../../../component/buttons/RemoveBookmarkSectionButton";
import EditSectionNameInput from "./EditSectionNameInput";

function EditModeToggleButton({ onClick, editMode }) {
  return (
    <Button
      onClick={onClick}
      aria-label={editMode ? "Finish editing section" : "Edit bookmark section"}
      aria-pressed={editMode}
    >
      <FontAwesome name="edit" />
    </Button>
  );
}

interface Props {
  editMode: boolean;
  name: string;
  removeBookmarkSection: () => void;
  toggleEditMode: () => void;
  updateBookmarkSectionName: (bookmarkSectionName: string) => void;
}

export default function BookmarkSectionNameControl({
  editMode,
  name,
  removeBookmarkSection,
  toggleEditMode,
  updateBookmarkSectionName
}: Props) {
  return (
    <CardHeader
      className="transit-responsive-nowrap"
      style={{
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        paddingTop: "1rem",
        paddingBottom: ".5rem",
        marginBottom: "1rem"
      }}
    >
      {editMode && (
        <EditSectionNameInput
          sectionName={name}
          updateBookmarkSectionName={updateBookmarkSectionName}
        />
      )}
      {!editMode && <h3 style={{ fontSize: "1rem" }}>{name}</h3>}
      {editMode && (
        <RemoveBookmarkSectionButton
          removeBookmarkSection={removeBookmarkSection}
        />
      )}
      <EditModeToggleButton editMode={editMode} onClick={toggleEditMode} />
    </CardHeader>
  );
}
