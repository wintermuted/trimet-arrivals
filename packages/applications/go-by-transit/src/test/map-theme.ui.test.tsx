import { vi } from "vitest";
import { act } from "react";
import mapboxgl from "mapbox-gl";
import { createThemedMap } from "../view/nearby/util/mapbox/themedMap";

vi.mock("mapbox-gl", () => {
  const MapMock = vi.fn();
  return {
    __esModule: true,
    default: { Map: MapMock },
    configureMocks() {
      const listeners: Record<string, () => void> = {};
      let preset: string;
      const map = {
        on: vi.fn((name, listener) => { listeners[name] = listener; }),
        off: vi.fn((name, listener) => {
          if (listeners[name] === listener) {
            delete listeners[name];
          }
        }),
        getConfigProperty: vi.fn(() => preset),
        setConfigProperty: vi.fn((scope, name, value) => { preset = value; }),
        remove: vi.fn(() => listeners.remove?.())
      };
      MapMock.mockImplementation(function (options) {
        preset = options.config.basemap.lightPreset;
        return map;
      });
      return { map, emit: (name: string) => listeners[name]?.() };
    }
  };
});

describe("Mapbox resolved-theme synchronization", () => {
  let mock: {
    map: { remove: () => void };
    emit: (name: string) => void;
  };
  const previousTheme = document.documentElement.dataset.theme;

  beforeEach(async () => {
    vi.clearAllMocks();
    mock = (await vi.importMock("mapbox-gl")).configureMocks();
  });

  afterEach(() => {
    mock.map.remove();
    if (previousTheme === undefined) {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = previousTheme;
    }
  });

  function create() {
    return createThemedMap({ container: document.createElement("div"), center: [0, 0], zoom: 12 });
  }

  it.each([["dark", "night"], ["light", "day"]])(
    "starts in %s mode without waiting for a theme-change event", (theme, preset) => {
      document.documentElement.dataset.theme = theme;
      create();
      expect(mapboxgl.Map).toHaveBeenCalledWith(expect.objectContaining({
        config: { basemap: { lightPreset: preset } }
      }));
    }
  );

  it("switches the existing basemap in both directions without rebuilding the map", async () => {
    document.documentElement.dataset.theme = "light";
    const map = create();
    mock.emit("style.load");
    await act(async () => { document.documentElement.dataset.theme = "dark"; });
    expect(map.setConfigProperty).toHaveBeenLastCalledWith("basemap", "lightPreset", "night");
    await act(async () => { document.documentElement.dataset.theme = "light"; });
    expect(map.setConfigProperty).toHaveBeenLastCalledWith("basemap", "lightPreset", "day");
    expect(mapboxgl.Map).toHaveBeenCalledTimes(1);
    expect(map.remove).not.toHaveBeenCalled();
  });

  it("applies the latest resolved theme if it changes before the basemap has loaded", async () => {
    document.documentElement.dataset.theme = "light";
    const map = create();
    await act(async () => { document.documentElement.dataset.theme = "dark"; });
    expect(map.setConfigProperty).not.toHaveBeenCalled();
    mock.emit("style.load");
    expect(map.setConfigProperty).toHaveBeenCalledWith("basemap", "lightPreset", "night");
  });

  it("disconnects theme and style listeners when the map is removed", async () => {
    document.documentElement.dataset.theme = "light";
    const map = create();
    mock.emit("style.load");
    map.remove();
    await act(async () => { document.documentElement.dataset.theme = "dark"; });
    mock.emit("style.load");
    expect(map.setConfigProperty).not.toHaveBeenCalled();
    expect(map.off).toHaveBeenCalledWith("style.load", expect.any(Function));
  });
});
