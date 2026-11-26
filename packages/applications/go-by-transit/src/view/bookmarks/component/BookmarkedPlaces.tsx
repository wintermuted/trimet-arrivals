import { SavedPlacesList, type SavedPlaceItem } from "@overworld/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Link } from "react-router-dom";
import {
  categoryName,
  placeCategoryForId,
  placeDetailLink,
} from "@overworld/places/catalog";
import { useSavedPlaces } from "@overworld/places/savedPlaces";
import PlacesLoadStatus from "../../nearby/components/PlacesLoadStatus";
import { placeIconDefinition } from "../../nearby/util/mapbox/placeIcons";

export default function BookmarkedPlaces() {
  const { saved, error, remove, retry } = useSavedPlaces();
  const places = Object.entries(saved).sort(
    ([aId, aName], [bId, bName]) =>
      aName.localeCompare(bName) || aId.localeCompare(bId),
  );

  return (
    <SavedPlacesList
      onRemove={remove}
      status={
        <PlacesLoadStatus
          label="Saved places"
          issues={
            error ? [{ label: "Saved places", message: error, retry }] : []
          }
        />
      }
      emptyContent={
        !error && (
          <p>
            Save a place from <Link to="/nearby/places">Places nearby</Link> to
            see it here.
          </p>
        )
      }
      places={places.map<SavedPlaceItem>(([id, name]) => {
        const category = placeCategoryForId(id);
        return {
          id,
          name,
          secondary: category && categoryName(category),
          icon: category && (
            <FontAwesomeIcon
              icon={placeIconDefinition(category)}
              aria-hidden="true"
              className={`transit-place-icon transit-place-icon--${category}`}
            />
          ),
          renderLink: (props) => <Link {...props} to={placeDetailLink(id)} />,
        };
      })}
    />
  );
}
