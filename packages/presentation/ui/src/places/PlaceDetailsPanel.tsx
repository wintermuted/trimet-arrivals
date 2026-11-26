import React, { useId } from "react";
import "./PlaceDetailsPanel.scss";

export interface PlaceDetailsPanelProps {
  name: string;
  category: React.ReactNode;
  headingId?: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
  status?: React.ReactNode;
  bookmarkAction?: React.ReactNode;
  address?: string;
  children?: React.ReactNode;
  arrivalNotice: React.ReactNode;
  tripAction: React.ReactNode;
  sourceUrl?: string;
  website?: string;
  sourceDate?: string;
  sourceLabel?: string;
  websiteLabel?: string;
}

export function PlaceDetailsPanel({
  name,
  category,
  headingId,
  headingRef,
  status,
  bookmarkAction,
  address,
  children,
  arrivalNotice,
  tripAction,
  sourceUrl,
  website,
  sourceDate,
  sourceLabel = "View source location",
  websiteLabel = "Website",
}: PlaceDetailsPanelProps) {
  const id = useId();
  const titleId = headingId || `${id}-heading`;
  return (
    <section className="transit-place-detail" aria-labelledby={titleId}>
      <div className="transit-place-detail-heading">
        <h2 id={titleId} ref={headingRef} tabIndex={-1}>
          {name}
        </h2>
        {status}
      </div>
      <p>{category}</p>
      {bookmarkAction}
      {address && <p>{address}</p>}
      {children}
      <p>{arrivalNotice}</p>
      {tripAction}
      {(sourceUrl || website || sourceDate) && (
        <p className="transit-place-source">
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              {sourceLabel}
            </a>
          )}
          {website && (
            <>
              {sourceUrl && <> · </>}
              <a href={website} target="_blank" rel="noreferrer">
                {websiteLabel}
              </a>
            </>
          )}
          {sourceDate && (
            <>
              {(sourceUrl || website) && <br />}Source data as of {sourceDate}.
            </>
          )}
        </p>
      )}
    </section>
  );
}
