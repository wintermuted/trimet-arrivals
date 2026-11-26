import type { TripPlannerItinerary } from "@overworld/trimet-client";
import { Button } from "@wintermuted/ui-react";
import React from "react";
import {
  PlannerDisclosure,
  TripOptionSummary,
  transferCount,
  type TransitLegColor,
} from "./ItineraryPresentation";
import "./TripOptionPicker.scss";

export interface TripOptionPickerProps {
  itineraries: readonly TripPlannerItinerary[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  editing?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onCollapse?: () => void;
  onHover?: (index?: number) => void;
  onFocus?: (index?: number) => void;
  currentOptionRef?: React.Ref<HTMLButtonElement>;
  editButtonRef?: React.Ref<HTMLButtonElement>;
  transitColor?: TransitLegColor;
  emptyContent?: React.ReactNode;
}

export function TripOptionPicker({
  itineraries,
  selectedIndex,
  onSelect,
  editing = false,
  onEdit,
  onCancel,
  onCollapse,
  onHover,
  onFocus,
  currentOptionRef,
  editButtonRef,
  transitColor,
  emptyContent = <p role="status">No trips available.</p>,
}: TripOptionPickerProps) {
  const active = itineraries[selectedIndex];
  return (
    <PlannerDisclosure
      title="Choose a trip"
      onCollapse={onCollapse}
      edit={
        active && !editing && onEdit
          ? {
              label: "Edit trip",
              buttonRef: editButtonRef ?? null,
              onClick: onEdit,
            }
          : undefined
      }
    >
      {!active || editing ? (
        <>
          {!itineraries.length ? (
            emptyContent
          ) : (
            <ul
              className="transit-planner-options"
              aria-label="Available trips"
            >
              {itineraries.map((itinerary, index) => (
                <li key={itinerary.id || index}>
                  <button
                    type="button"
                    className="transit-planner-option"
                    aria-current={selectedIndex === index ? "true" : undefined}
                    ref={selectedIndex === index ? currentOptionRef : undefined}
                    onPointerEnter={(event) => {
                      if (event.pointerType !== "touch") onHover?.(index);
                    }}
                    onPointerLeave={() => onHover?.(undefined)}
                    onFocus={() => onFocus?.(index)}
                    onBlur={() => onFocus?.(undefined)}
                    onClick={() => onSelect(index)}
                  >
                    <TripOptionSummary
                      itinerary={itinerary}
                      index={index}
                      current={selectedIndex === index}
                      transitColor={transitColor}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {editing && onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </>
      ) : (
        <div className="transit-planner-summary">
          <h4>
            Option {selectedIndex + 1}
            {active.startTime &&
              active.endTime &&
              ` · ${active.startTime}–${active.endTime}`}
          </h4>
          <p>
            {active.duration !== undefined && `${active.duration} min · `}
            {transferCount(active)}{" "}
            {transferCount(active) === 1 ? "transfer" : "transfers"}
            {active.distance !== undefined &&
              ` · ${active.distance.toFixed(2)} mi`}
            {active.fare !== undefined &&
              ` · $${active.fare.toFixed(2)} regular fare`}
          </p>
        </div>
      )}
    </PlannerDisclosure>
  );
}
