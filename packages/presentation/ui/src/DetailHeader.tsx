import React from "react";
import FontAwesome from "react-fontawesome";
import "./DetailHeader.css";

export interface DetailHeaderBackProps {
  className: string;
  "aria-label": string;
  children: React.ReactNode;
}

export interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  truncateTitle?: boolean;
  action?: React.ReactNode;
  backLabel?: string;
  onBack?: () => void;
  renderBack?: (props: DetailHeaderBackProps) => React.ReactNode;
}

export function DetailHeader({
  title,
  subtitle,
  truncateTitle = false,
  action,
  backLabel = "Back",
  onBack,
  renderBack,
}: DetailHeaderProps) {
  const backProps: DetailHeaderBackProps = {
    className: "transit-detail-back",
    "aria-label": backLabel,
    children: <FontAwesome name="caret-left" aria-hidden="true" />,
  };

  return (
    <header className="transit-detail-header">
      {renderBack
        ? renderBack(backProps)
        : onBack && <button type="button" {...backProps} onClick={onBack} />}
      <div className="transit-detail-heading">
        <h3
          className={
            truncateTitle ? "transit-detail-title-truncated" : undefined
          }
          title={truncateTitle ? title : undefined}
        >
          {title}
        </h3>
        {subtitle && <p className="transit-detail-subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
