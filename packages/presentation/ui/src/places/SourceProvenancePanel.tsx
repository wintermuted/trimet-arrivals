import React from "react";
import "./SourceProvenancePanel.scss";

export interface SourceProvenanceRecord {
  id: string;
  label: string;
  source: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  retrievedDate: string;
  updatedDate?: string;
  coverage?: React.ReactNode;
}

export interface SourceProvenancePanelProps {
  title?: string;
  description?: React.ReactNode;
  sources: readonly SourceProvenanceRecord[];
  notice?: React.ReactNode;
  noticeAfter?: number;
}

export function SourceProvenancePanel({
  title = "Data sources and coverage",
  description,
  sources,
  notice,
  noticeAfter = 0,
}: SourceProvenancePanelProps) {
  const noticeIndex = Math.max(0, Math.min(sources.length, noticeAfter));
  return (
    <details className="transit-places-notices">
      <summary>{title}</summary>
      {description}
      {noticeIndex === 0 && notice}
      {sources.map((source, index) => (
        <React.Fragment key={source.id}>
          <p>
            <strong>{source.label}</strong>
            <br />
            <a href={source.sourceUrl} target="_blank" rel="noreferrer">
              {source.source}
            </a>
            {" · "}
            <a href={source.licenseUrl} target="_blank" rel="noreferrer">
              {source.license}
            </a>
            <br />
            Retrieved {source.retrievedDate}.
            {source.updatedDate && (
              <> Source data as of {source.updatedDate}.</>
            )}{" "}
            {source.coverage}
          </p>
          {index + 1 === noticeIndex && notice}
        </React.Fragment>
      ))}
    </details>
  );
}
