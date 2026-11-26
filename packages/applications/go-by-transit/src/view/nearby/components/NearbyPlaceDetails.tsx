import { Button } from "@wintermuted/ui-react";
import React from "react";
import { PlaceDetailsPanel } from "@overworld/ui";
import FontAwesome from "react-fontawesome";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import {
  categoryName,
  CULTURE_PLACE_CATEGORIES,
  OUTING_PLACE_CATEGORIES,
  PLACE_INFO,
  placePlannerLink,
  type InterestPlace,
  type PlaceCategory,
  type PlaceSourceState,
} from "@overworld/places/catalog";
import { type SavedPlaceControls } from "@overworld/places/savedPlaces";
import { placeIconDefinition } from "../util/mapbox/placeIcons";
import LoadStatus, { type LoadIssue } from "./PlacesLoadStatus";

interface Props {
  selected: InterestPlace;
  heading: React.Ref<HTMLHeadingElement>;
  sources: Record<PlaceCategory, PlaceSourceState>;
  placeIssues: LoadIssue[];
  savedIssues: LoadIssue[];
  markerIssues: LoadIssue[];
  savedPlaces?: SavedPlaceControls;
  origin?: number[];
  originMode?: string;
  viewSearch: string;
}

export default function NearbyPlaceDetails({
  selected,
  heading,
  sources,
  placeIssues,
  savedIssues,
  markerIssues,
  savedPlaces,
  origin,
  originMode,
  viewSearch,
}: Props) {
  return (
    <PlaceDetailsPanel
      name={selected.name}
      headingId="selected-place-heading"
      headingRef={heading}
      status={
        <>
          <LoadStatus
            label={categoryName(selected.category)}
            issues={placeIssues.filter(
              (issue) => issue.label === categoryName(selected.category),
            )}
            loading={sources[selected.category].loading}
          />
          <LoadStatus label="Saved places" issues={savedIssues} />
          <LoadStatus label="Place markers" issues={markerIssues} />
        </>
      }
      category={
        <>
          <FontAwesomeIcon
            icon={placeIconDefinition(selected.category)}
            aria-hidden="true"
          />{" "}
          {PLACE_INFO[selected.category].singular}
        </>
      }
      bookmarkAction={
        savedPlaces && (
          <Button
            size="sm"
            variant="secondary"
            aria-pressed={Boolean(savedPlaces.saved[selected.id])}
            onClick={() => savedPlaces.toggle(selected)}
          >
            <FontAwesome
              name={savedPlaces.saved[selected.id] ? "bookmark" : "bookmark-o"}
              aria-hidden="true"
            />{" "}
            {savedPlaces.saved[selected.id]
              ? "Remove saved place"
              : "Save place"}
          </Button>
        )
      }
      address={selected.address}
      arrivalNotice="Approximate map location, not a verified public entrance. Confirm your arrival point before finding trips."
      tripAction={
        <Link
          className="wm-btn wm-btn-primary"
          to={placePlannerLink(selected, origin, originMode, viewSearch)}
        >
          Plan a trip here
        </Link>
      }
      sourceUrl={selected.sourceUrl}
      website={selected.website}
      sourceDate={
        sources[selected.category].snapshot?.sourceUpdatedAt
          ? new Date(
              sources[selected.category].snapshot.sourceUpdatedAt,
            ).toLocaleDateString()
          : undefined
      }
    >
      {["drinking-fountain", "picnic-seating", "park-artwork"].includes(
        selected.category,
      ) && (
        <section aria-label="Park amenity information">
          <h3>Source-listed amenity</h3>
          <p>
            {selected.amenityStyle ||
              selected.amenityType ||
              PLACE_INFO[selected.category].singular}
          </p>
          {selected.category === "drinking-fountain" ? (
            <p>
              Water service, potability, seasonal operation and accessible
              approaches are not verified. Some listed assets are dog bowls.
              Check local signs and the fixture before relying on this stop.
            </p>
          ) : selected.category === "picnic-seating" ? (
            <p>
              Each marker represents an individual table or bench, not a
              reservable picnic area. Seating, availability, reservations, fees,
              condition and accessible approaches are not verified.
            </p>
          ) : (
            <p>
              This is a Parks asset record, not a complete public-art directory
              or a verified artwork title. Current visibility, condition and
              public access are not verified.
            </p>
          )}
        </section>
      )}
      {selected.category === "grocery-store" && (
        <p>
          Source-listed grocery store, not live opening or stock information.
          Confirm the current location and hours before traveling.
        </p>
      )}
      {selected.category === "reuse-repair" && (
        <section aria-label="Reuse and repair services">
          <h3>Source-listed services</h3>
          {selected.reuseServices && <p>{selected.reuseServices}</p>}
          {selected.reuseItems && (
            <p>
              <strong>Items:</strong> {selected.reuseItems}
            </p>
          )}
          <p>
            This listing may be out of date. Confirm hours, eligibility,
            appointments, accepted items, and fees before visiting or bringing
            donations.
          </p>
        </section>
      )}
      {selected.category === "csa-pickup" && (
        <section aria-label="CSA pickup information">
          <h3>Source-listed pickup</h3>
          {selected.pickupSeason && (
            <p>
              <strong>Season:</strong> {selected.pickupSeason}
            </p>
          )}
          {selected.pickupProducts && (
            <p>
              <strong>Products:</strong> {selected.pickupProducts}
            </p>
          )}
          <p>
            Community-supported agriculture (CSA) pickups may require
            membership, scheduled collection, and permission to access the site.
            This is not a public market or a live schedule. Confirm the current
            pickup location and arrangements with the farm; do not enter private
            property without permission.
          </p>
        </section>
      )}
      {selected.category === "bicycle-parking" && (
        <section aria-label="Bicycle rack information">
          <h3>Source-listed rack</h3>
          <p>
            <strong>Capacity:</strong>{" "}
            {selected.bikeSpaces === undefined
              ? "Unknown"
              : `${selected.bikeSpaces} spaces`}
          </p>
          <p>
            <strong>Covered:</strong>{" "}
            {selected.bikeCovered === "yes"
              ? "Yes"
              : selected.bikeCovered === "no"
                ? "No"
                : "Unknown"}
          </p>
          <p>
            Markers and cluster counts represent racks, not spaces. This is not
            live availability or a guarantee of condition, security, or access.
            Check the rack and local signs before parking. Trip planning does
            not reserve parking or select a cycling route.
          </p>
        </section>
      )}
      {selected.category === "public-restroom" && (
        <section aria-label="Restroom access">
          <h3>Source-listed access</h3>
          <p>
            <strong>Status:</strong>{" "}
            {selected.restroomStatus === "listed-24-7"
              ? "Listed 24/7 in the source; not verified."
              : "Opening status unknown."}
          </p>
          <p>
            <strong>ADA designation:</strong>{" "}
            {selected.restroomAda === "yes"
              ? "Yes (source-listed)"
              : selected.restroomAda === "no"
                ? "No (source-listed)"
                : "Unknown"}
          </p>
          <p>
            Not live availability or a verified accessible route. Seasonal
            closures, fees, or building access restrictions may apply. Check
            with Portland Parks before relying on this stop.
          </p>
        </section>
      )}
      {selected.category === "heritage-tree" && (
        <section aria-label="Heritage tree access">
          {selected.scientificName && (
            <p>
              <em>{selected.scientificName}</em>
            </p>
          )}
          {selected.treeOwnership && (
            <p>
              <strong>Source-listed setting:</strong> {selected.treeOwnership}
            </p>
          )}
          <p>
            This point marks the tree trunk, not a public entrance. Trees may be
            on private land or not visible from public paths. View only from
            lawful public access; do not enter private property.
          </p>
        </section>
      )}
      {selected.category === "community-garden" && (
        <p>
          Garden plots may require registration and have restricted access.
          Check with Portland Parks before visiting.
        </p>
      )}
      {CULTURE_PLACE_CATEGORIES.includes(selected.category) && (
        <section aria-label="Cultural venue information">
          <h3>Source-mapped venue</h3>
          <p>
            This community-mapped listing is not live opening information.
            Admission, tickets, reservations, accessibility and public access
            are not verified. Confirm the current location, hours and visiting
            arrangements with the venue.
          </p>
        </section>
      )}
      {OUTING_PLACE_CATEGORIES.includes(selected.category) && (
        <section aria-label="Outing destination information">
          {selected.siteType && (
            <p>
              <strong>Source-listed type:</strong> {selected.siteType}
            </p>
          )}
          <p>
            This community-mapped listing is not live opening or availability
            information. Confirm public access, hours, fees and accessibility
            before visiting. Do not enter restricted property.
          </p>
          {selected.category === "splash-pad" && (
            <p>
              Water operation is seasonal and not verified. A mapped splash pad
              is not a drinking-water source or a guarantee that water is
              running.
            </p>
          )}
          {["playground", "sports-court", "skatepark"].includes(
            selected.category,
          ) && (
            <p>
              Mapped facilities do not establish current condition, age
              suitability, opening hours or availability. School and managed
              sites may have restricted access; check posted rules and
              reservations.
            </p>
          )}
          {["public-garden", "nature-reserve", "viewpoint"].includes(
            selected.category,
          ) && (
            <p>
              Use designated public entrances and paths. Conservation
              restrictions, tickets and seasonal closures may apply; this point
              does not establish a safe or accessible approach.
            </p>
          )}
          {["historic-site", "public-art"].includes(selected.category) && (
            <p>
              View only from lawful public access. A source classification is
              not verified historic designation, an artwork title or permission
              to enter a building or site.
            </p>
          )}
        </section>
      )}
      {selected.category === "farmers-market" && (
        <section aria-label="Market schedule">
          <h3>Source-listed schedule</h3>
          <p>
            This snapshot may contain older seasonal dates and hours. Check the
            market website before traveling; this is not live opening
            information.
          </p>
          {selected.marketDays && (
            <p>
              <strong>Days:</strong> {selected.marketDays}
            </p>
          )}
          {selected.marketSeason && (
            <p>
              <strong>Season:</strong> {selected.marketSeason}
            </p>
          )}
          {selected.marketHours && (
            <p>
              <strong>Hours:</strong> {selected.marketHours}
            </p>
          )}
        </section>
      )}
    </PlaceDetailsPanel>
  );
}
