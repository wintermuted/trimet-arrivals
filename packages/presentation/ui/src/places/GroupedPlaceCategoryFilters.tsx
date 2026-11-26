import React, { useId } from "react";
import FontAwesome from "react-fontawesome";
import "./PlaceFilters.scss";

export interface PlaceCategoryOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  status?: React.ReactNode;
}

export interface PlaceCategoryGroup {
  id: string;
  label: string;
  icon?: React.ReactNode;
  categories: readonly PlaceCategoryOption[];
  status?: React.ReactNode;
}

export interface GroupedPlaceCategoryFiltersProps {
  label?: string;
  groups: readonly PlaceCategoryGroup[];
  selected: Readonly<Record<string, boolean>>;
  onSelectionChange: (changes: Record<string, boolean>) => void;
  expandedGroups: readonly string[];
  onExpandedGroupsChange: (groups: string[]) => void;
  status?: React.ReactNode;
}

export function GroupedPlaceCategoryFilters({
  label = "Place categories",
  groups,
  selected,
  onSelectionChange,
  expandedGroups,
  onExpandedGroupsChange,
  status,
}: GroupedPlaceCategoryFiltersProps) {
  const id = useId();
  return (
    <fieldset className="transit-places-filters">
      <legend className="wm-sr-only">{label}</legend>
      {status}
      {groups.map((group, index) => {
        const all =
          group.categories.length > 0 &&
          group.categories.every((category) => selected[category.id]);
        const some = group.categories.some((category) => selected[category.id]);
        const expanded = expandedGroups.includes(group.id);
        const childrenId = `${id}-categories-${index}`;
        return (
          <fieldset key={group.id} className="transit-places-category-group">
            <legend className="wm-sr-only">{group.label}</legend>
            <div className="transit-places-group-header">
              <label className="transit-places-category transit-places-group-bulk">
                <input
                  type="checkbox"
                  checked={all}
                  disabled={!group.categories.length}
                  aria-label={`Toggle all ${group.label.toLowerCase()}`}
                  ref={(input) => {
                    if (input) input.indeterminate = some && !all;
                  }}
                  onChange={(event) =>
                    onSelectionChange(
                      Object.fromEntries(
                        group.categories.map((category) => [
                          category.id,
                          event.target.checked,
                        ]),
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="transit-places-group-toggle"
                aria-expanded={expanded}
                aria-controls={childrenId}
                onClick={() =>
                  onExpandedGroupsChange(
                    expanded
                      ? expandedGroups.filter((groupId) => groupId !== group.id)
                      : [...expandedGroups, group.id],
                  )
                }
              >
                {group.icon}
                <span className="transit-places-group-label">
                  {group.label}
                </span>
                <FontAwesome
                  name={expanded ? "caret-down" : "caret-right"}
                  aria-hidden="true"
                />
              </button>
              {!expanded && group.status}
            </div>
            <div
              id={childrenId}
              className="transit-places-group-children"
              hidden={!expanded}
            >
              {group.categories.map((category) => (
                <div key={category.id} className="transit-places-layer-row">
                  <label
                    className={`transit-places-category${category.className ? ` ${category.className}` : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selected[category.id])}
                      onChange={(event) =>
                        onSelectionChange({
                          [category.id]: event.target.checked,
                        })
                      }
                    />
                    {category.icon}
                    <span className="transit-places-layer-label">
                      {category.label}
                    </span>
                  </label>
                  {category.status}
                </div>
              ))}
            </div>
          </fieldset>
        );
      })}
    </fieldset>
  );
}
