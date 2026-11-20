import { Button, Card, CardBody, CardHeader } from "@wintermuted/ui-theme/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Link } from "react-router-dom";
import { categoryName, placeCategoryForId, placeDetailLink } from "../../../api/places/places";
import { useSavedPlaces } from "../../../api/places/savedPlaces";
import PlacesLoadStatus from "../../nearby/components/PlacesLoadStatus";
import { placeIconDefinition } from "../../nearby/util/mapbox/placeIcons";

export default function BookmarkedPlaces() {
  const { saved, error, remove, retry } = useSavedPlaces();
  const places = Object.entries(saved).sort(([aId, aName], [bId, bName]) =>
    aName.localeCompare(bName) || aId.localeCompare(bId));

  return <Card>
    <CardHeader>
      <div className="bookmark-places-heading">
        <span>Saved places</span>
        <PlacesLoadStatus label="Saved places" issues={error ? [{ label: "Saved places", message: error, retry }] : []} />
      </div>
    </CardHeader>
    <CardBody>
      {!places.length ? (!error && <p>Save a place from <Link to="/nearby/places">Places nearby</Link> to see it here.</p>) :
        <ul className="bookmark-places-list" aria-label="Saved places">
          {places.map(([id, name]) => {
            const category = placeCategoryForId(id);
            return <li key={id}>
              <Link to={placeDetailLink(id)}>
                {category && <FontAwesomeIcon icon={placeIconDefinition(category)} aria-hidden="true"
                  className={`transit-place-icon transit-place-icon--${category}`} />}
                <span className="bookmark-place-label">
                  <strong>{name}</strong>
                  {category && <small>{categoryName(category)}</small>}
                </span>
              </Link>
              <Button size="sm" variant="ghost" aria-label={`Remove ${name} from saved places`}
                onClick={() => remove(id)}>Remove</Button>
            </li>;
          })}
        </ul>}
    </CardBody>
  </Card>;
}
