import React from "react";
import "./PlaceFilters.scss";

export interface ReferenceLayerSwatch {
  kind: "line" | "point";
  color: string;
  dashed?: boolean;
  square?: boolean;
  className?: string;
}

export interface MapReferenceLayer {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  swatch?: ReferenceLayerSwatch;
  className?: string;
  help?: React.ReactNode;
  status?: React.ReactNode;
  children?: React.ReactNode;
}

export interface MapReferenceLayerControlsProps {
  label?: string;
  layers: readonly MapReferenceLayer[];
}

export function MapReferenceLayerControls({
  label = "Map layers",
  layers,
}: MapReferenceLayerControlsProps) {
  return (
    <fieldset className="transit-places-map-layers">
      <legend className="wm-sr-only">{label}</legend>
      {layers.map((layer) => (
        <React.Fragment key={layer.id}>
          <div className="transit-places-layer-row">
            <label
              className={`transit-places-category${layer.className ? ` ${layer.className}` : ""}`}
            >
              <input
                type="checkbox"
                checked={layer.checked}
                onChange={(event) => layer.onChange(event.target.checked)}
              />
              {layer.icon}
              {layer.swatch && (
                <span
                  aria-hidden="true"
                  className={`${layer.swatch.kind === "line" ? "transit-place-line-swatch" : "transit-place-context-swatch"}${layer.swatch.className ? ` ${layer.swatch.className}` : ""}`}
                  style={
                    layer.swatch.kind === "line"
                      ? {
                          borderColor: layer.swatch.color,
                          borderTopStyle: layer.swatch.dashed
                            ? "dashed"
                            : undefined,
                        }
                      : {
                          color: layer.swatch.color,
                          borderRadius: layer.swatch.square ? 0 : undefined,
                        }
                  }
                />
              )}
              <span className="transit-places-layer-label">{layer.label}</span>
            </label>
            {layer.help && (
              <span className="transit-places-layer-help">{layer.help}</span>
            )}
            {layer.status}
          </div>
          {layer.checked && layer.children}
        </React.Fragment>
      ))}
    </fieldset>
  );
}
