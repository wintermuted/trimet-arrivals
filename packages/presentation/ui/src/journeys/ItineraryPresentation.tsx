import { faBus, faPersonWalking, faRoute, faTrain, faTrainTram } from "@fortawesome/free-solid-svg-icons";
import type { TripPlannerItinerary, TripPlannerLeg } from "@trimet-arrivals/trimet-client";
import React, { useId, useState } from "react";
import FontAwesome from "react-fontawesome";
import { DirectionsStopPair } from "./DirectionsStopPair";
import "./ItineraryPresentation.scss";

export type TransitLegColor = (leg: TripPlannerLeg) => string;

function formatStop(location?: TripPlannerLeg["from"]): string {
  if (!location?.description) {
    return location?.stopId ? `Stop ${location.stopId}` : "Stop information unavailable";
  }
  return location.stopId
    ? `${location.description} (${location.stopId})`
    : location.description;
}

export function transferCount(itinerary: TripPlannerItinerary): number {
  return Math.max(
    0,
    itinerary.numberOfTransfers ??
      Math.max(
        0,
        itinerary.legs.filter((leg) => leg.mode && leg.mode !== "Walk").length -
          1,
      ),
  );
}

function legTitle(leg: TripPlannerLeg): string {
  if (leg.mode === "Walk") {
    return "Walk";
  }
  const routeName = leg.route?.name || leg.route?.number;
  return [leg.mode, routeName].filter(Boolean).join(" · ") || "Transit";
}

function legIcon(mode?: string) {
  const name = mode?.trim().toLowerCase() || "";
  if (name === "walk" || name === "walking") return faPersonWalking;
  if (/\b(bus|fx)\b/.test(name)) return faBus;
  if (/\b(light rail|max|streetcar|tram)\b/.test(name)) return faTrainTram;
  if (/\b(rail|train|wes)\b/.test(name)) return faTrain;
  return faRoute;
}

function LegIcon({ leg, transitColor }: { leg: TripPlannerLeg; transitColor?: TransitLegColor }) {
  const { iconName, icon: [width, height, , , paths] } = legIcon(leg.mode);
  const walking = iconName === "person-walking";
  return (
    <svg
      className={`transit-planner-leg-icon${walking ? " transit-planner-leg-icon--walk" : ""}`}
      style={walking ? undefined : { color: transitColor?.(leg) }}
      data-icon={iconName}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      {[paths].flat().map(path => <path key={path} d={path} />)}
    </svg>
  );
}

export function JourneyDirections({ itinerary, headingRef, transitColor }: {
  itinerary: TripPlannerItinerary;
  headingRef: React.Ref<HTMLHeadingElement>;
  transitColor?: TransitLegColor;
}) {
  return (
    <>
      <header className="transit-journey-header">
        <h2 tabIndex={-1} ref={headingRef}>Journey directions</h2>
        <p>Planned times from TriMet, not live updates.</p>
        {itinerary.startTime && itinerary.endTime && (
          <p>Planned trip: {itinerary.startTime} to {itinerary.endTime}</p>
        )}
      </header>
      {itinerary.legs.length ? (
        <ol className="transit-journey-steps" aria-label="Journey steps">
          {itinerary.legs.map((leg, index) => {
            const walking = /^walk(?:ing)?$/i.test(leg.mode?.trim() ?? "");
            const hasRoute = !walking && Boolean(leg.route?.name || leg.route?.number);
            const direction = leg.direction || leg.route?.direction;
            return (
              <li className="transit-planner-leg" key={index}>
                <h3><LegIcon leg={leg} transitColor={transitColor} />{legTitle(leg)}</h3>
                {!walking && direction && <p className="transit-planner-leg-time">Direction: {direction}</p>}
                <dl>
                  <dt>{walking ? "Start walking" : hasRoute ? "Board at" : "Start at"}</dt>
                  <dd>{formatStop(leg.from)}<span>{leg.startTime ?? "Time unavailable"}</span></dd>
                  <dt>{hasRoute ? "Get off at" : "Arrive at"}</dt>
                  <dd>{formatStop(leg.to)}<span>{leg.endTime ?? "Time unavailable"}</span></dd>
                </dl>
              </li>
            );
          })}
        </ol>
      ) : <p>TriMet did not provide steps for this trip.</p>}
    </>
  );
}

export function PlannerDisclosure({ title, children, onCollapse, headingId, edit }: {
  title: string;
  children: React.ReactNode;
  onCollapse?: () => void;
  headingId?: string;
  edit?: {
    label: string;
    buttonRef: React.Ref<HTMLButtonElement>;
    onClick: () => void;
  };
}) {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();
  const Heading = headingId ? "h2" : "h3";

  return (
    <div>
      <header className="transit-planner-disclosure-header">
        <Heading id={headingId} className="transit-planner-disclosure-heading">
          <button
            type="button"
            aria-controls={panelId}
            aria-expanded={expanded}
            onClick={() => {
              if (expanded) onCollapse?.();
              setExpanded(!expanded);
            }}
          >
            <FontAwesome name="caret-right" aria-hidden="true" />
            {title}
          </button>
        </Heading>
        {edit && (
          <button
            type="button"
            className="transit-planner-edit"
            ref={edit.buttonRef}
            aria-label={edit.label}
            title={edit.label}
            onClick={() => {
              setExpanded(true);
              edit.onClick();
            }}
          >
            <FontAwesome name="pencil" aria-hidden="true" />
          </button>
        )}
      </header>
      <div id={panelId} hidden={!expanded}>
        {children}
      </div>
    </div>
  );
}

export function ItineraryDetails({
  itinerary,
  index,
  highlight,
  transitColor,
}: {
  itinerary: TripPlannerItinerary;
  index: number;
  transitColor?: TransitLegColor;
  highlight?: {
    leg?: number;
    onHover: (leg?: number) => void;
    onFocus: (leg?: number) => void;
  };
}) {
  let transitLegSeen = false;

  return (
    <div className="transit-planner-itinerary-detail">
      <PlannerDisclosure
        title="Directions"
        onCollapse={() => {
          highlight?.onHover();
          highlight?.onFocus();
        }}
      >
        {itinerary.partial && (
          <p className="transit-planner-partial" role="status">
            Some details were missing from TriMet. Available leg information is
            shown below.
          </p>
        )}
        <ol aria-label={`Itinerary ${index + 1} steps`}>
          {itinerary.legs.map((leg, legIndex) => {
            const isTransit = leg.mode !== "Walk";
            const showTransfer = isTransit && transitLegSeen;
            if (isTransit) {
              transitLegSeen = true;
            }

            return (
              <li
                className={`transit-planner-leg${highlight?.leg === legIndex ? " transit-planner-leg--highlighted" : ""}`}
                key={leg.id || `${index}-${legIndex}`}
                tabIndex={highlight ? 0 : undefined}
                onPointerEnter={highlight ? event => {
                  if (event.pointerType !== "touch") highlight.onHover(legIndex);
                } : undefined}
                onPointerLeave={highlight ? () => highlight.onHover() : undefined}
                onFocus={highlight ? () => highlight.onFocus(legIndex) : undefined}
                onBlur={highlight ? () => highlight.onFocus() : undefined}
              >
                {showTransfer && (
                  <div className="transit-planner-transfer">Transfer</div>
                )}
                <div>
                  <LegIcon leg={leg} transitColor={transitColor} />
                  <strong>{legTitle(leg)}</strong>
                  {leg.direction && <span> · {leg.direction}</span>}
                </div>
                <DirectionsStopPair from={formatStop(leg.from)} to={formatStop(leg.to)} />
                {(leg.startTime || leg.endTime) && (
                  <p className="transit-planner-leg-time">
                    {leg.startTime || "Time unavailable"}
                    {leg.endTime ? `–${leg.endTime}` : ""}
                  </p>
                )}
                {(leg.duration !== undefined ||
                  leg.distance !== undefined) && (
                  <p className="transit-planner-leg-distance">
                    {leg.duration !== undefined && `${leg.duration} min`}
                    {leg.duration !== undefined &&
                      leg.distance !== undefined &&
                      " · "}
                    {leg.distance !== undefined &&
                      `${leg.distance.toFixed(2)} mi`}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </PlannerDisclosure>
    </div>
  );
}

function optionLegLabel(leg: TripPlannerLeg) {
  const mode = leg.mode?.trim();
  const name = leg.route?.name?.trim();
  const number = leg.route?.number?.trim();
  if (legIcon(mode) === faPersonWalking) return "Walk";
  const maxLine = name?.match(/^(MAX \w+ Line)(?: to |$)/i);
  if (maxLine) return maxLine[1];
  if (mode?.toLowerCase() === "bus" && number && /^\d+$/.test(number) && !/^FX\b/i.test(name || "")) {
    return `Bus ${number}`;
  }
  return name || [mode, number].filter(Boolean).join(" ") || "Leg details unavailable";
}

export function TripOptionSummary({ itinerary, index, current, transitColor }: {
  itinerary: TripPlannerItinerary;
  index: number;
  current: boolean;
  transitColor?: TransitLegColor;
}) {
  const { startTime, endTime, duration, numberOfTransfers, legs } = itinerary;
  const schedule = startTime && endTime ? `${startTime} to ${endTime}`
    : startTime ? `Departs ${startTime}` : endTime ? `Arrives ${endTime}` : "Times unavailable";
  return (
    <>
      <span className="transit-planner-option-timing">
        <strong>{schedule}</strong>
        <span className="transit-planner-option-duration">
          {duration !== undefined ? `${duration} min` : "Duration unavailable"}
        </span>
      </span>
      {legs.length > 0 ? (
        <span className="transit-planner-option-route">
          {legs.map((leg, legIndex) => (
            <span className="transit-planner-option-step" key={legIndex}>
              {legIndex > 0 && <>
                <span className="wm-sr-only">Then </span>
                <span className="transit-planner-option-chevron" aria-hidden="true">›</span>
              </>}
              <span className="transit-planner-option-leg">
                <LegIcon leg={leg} transitColor={transitColor} />
                <span>{optionLegLabel(leg)}</span>
              </span>
            </span>
          ))}
        </span>
      ) : <span className="transit-planner-option-meta">Route details unavailable</span>}
      <span className="transit-planner-option-meta">
        Option {index + 1}
        {numberOfTransfers !== undefined && ` · ${numberOfTransfers} ${numberOfTransfers === 1 ? "transfer" : "transfers"}`}
        {current && " · Current trip"}
      </span>
    </>
  );
}
