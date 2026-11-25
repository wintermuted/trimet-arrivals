import { useId, useState } from "react";
import type { ActionDisclosureProps } from "./interfaces.js";
import "./ActionDisclosure.css";

const headings = { 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

export function ActionDisclosure({
  title,
  children,
  headingLevel = 3,
  headingId,
  defaultExpanded = true,
  onCollapse,
  indicator,
  action,
  className,
  classNames,
}: ActionDisclosureProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const Heading = headings[headingLevel];

  return (
    <div className={className}>
      <header
        className={`ui-staging-disclosure-header${classNames?.header ? ` ${classNames.header}` : ""}`}
      >
        <Heading
          id={headingId}
          className={`ui-staging-disclosure-heading${classNames?.heading ? ` ${classNames.heading}` : ""}`}
        >
          <button
            type="button"
            aria-controls={panelId}
            aria-expanded={expanded}
            onClick={() => {
              if (expanded) onCollapse?.();
              setExpanded(!expanded);
            }}
          >
            <span
              className="ui-staging-disclosure-indicator"
              aria-hidden="true"
            >
              {indicator ?? (
                <svg viewBox="0 0 8 12" width="8" height="12" focusable="false">
                  <path d="M0 0 8 6 0 12Z" fill="currentColor" />
                </svg>
              )}
            </span>
            {title}
          </button>
        </Heading>
        {action && (
          <button
            type="button"
            className={`ui-staging-disclosure-action${classNames?.action ? ` ${classNames.action}` : ""}`}
            ref={action.buttonRef}
            aria-label={action.label}
            title={action.label}
            onClick={() => {
              setExpanded(true);
              action.onClick();
            }}
          >
            {action.icon ? (
              <span
                className="ui-staging-disclosure-action-icon"
                aria-hidden="true"
              >
                {action.icon}
              </span>
            ) : (
              action.label
            )}
          </button>
        )}
      </header>
      <div id={panelId} hidden={!expanded}>
        {children}
      </div>
    </div>
  );
}
