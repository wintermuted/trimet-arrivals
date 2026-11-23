import { MultiSelect } from "@wintermuted/ui-react/select";
import React from "react";
import { StopLocation } from "../../../../../api/trimet/interfaces/types";
import { formatStopLocations } from "./sectionSelectorUtil";

interface Props {
  bookmarksInSection: StopLocation[];
  allBookmarks: StopLocation[];
  onChange: () => void;
}

export default function BookmarksInSectionSelector({
  bookmarksInSection,
  allBookmarks,
  onChange
}: Props) {
  const defaultOptions = formatStopLocations(bookmarksInSection);
  const options = formatStopLocations(allBookmarks);

  return (
    <MultiSelect
      aria-label="Stops in this bookmark section"
      options={options}
      isMulti={true}
      defaultValue={defaultOptions}
      onChange={onChange}
    />
  );
}
