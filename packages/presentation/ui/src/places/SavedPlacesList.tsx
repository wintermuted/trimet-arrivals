import { Button, Card, CardBody, CardHeader } from "@wintermuted/ui-react";
import React from "react";
import { PlaceResultRow, type PlaceResultLinkProps } from "./PlaceResultRow";
import "./SavedPlacesList.scss";

export interface SavedPlaceItem {
  id: string;
  name: string;
  secondary?: React.ReactNode;
  icon?: React.ReactNode;
  renderLink: (props: PlaceResultLinkProps) => React.ReactNode;
}

export interface SavedPlacesListProps {
  places: readonly SavedPlaceItem[];
  onRemove: (id: string) => void;
  status?: React.ReactNode;
  emptyContent?: React.ReactNode;
  title?: string;
  removeLabel?: (place: SavedPlaceItem) => string;
  removeText?: string;
}

export function SavedPlacesList({
  places,
  onRemove,
  status,
  emptyContent,
  title = "Saved places",
  removeLabel = (place) => `Remove ${place.name} from saved places`,
  removeText = "Remove",
}: SavedPlacesListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="bookmark-places-heading">
          <span>{title}</span>
          {status}
        </div>
      </CardHeader>
      <CardBody>
        {!places.length ? (
          emptyContent
        ) : (
          <ul className="bookmark-places-list" aria-label={title}>
            {places.map((place) => (
              <PlaceResultRow
                key={place.id}
                variant="saved"
                name={place.name}
                secondary={place.secondary}
                icon={place.icon}
                renderLink={place.renderLink}
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={removeLabel(place)}
                    onClick={() => onRemove(place.id)}
                  >
                    {removeText}
                  </Button>
                }
              />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
