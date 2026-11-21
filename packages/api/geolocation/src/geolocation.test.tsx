import { act, render, screen } from "@testing-library/react";
import { geoLocateCurrentPosition, useSharedDeviceLocation } from ".";

describe("geoLocateCurrentPosition", () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "geolocation");

  afterEach(() => {
    if (original) Object.defineProperty(navigator, "geolocation", original);
    else delete navigator.geolocation;
  });

  it("uses the browser position rather than a fixed location", async () => {
    const position = { coords: { latitude: 1, longitude: 2 } };
    const getCurrentPosition = jest.fn(success => success(position));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    await expect(geoLocateCurrentPosition()).resolves.toEqual(position);
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { timeout: 15000 });
  });

  it("rejects denied or unavailable location requests", async () => {
    const error = new Error("denied");
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (_success, failure) => failure(error) }
    });
    await expect(geoLocateCurrentPosition()).rejects.toBe(error);
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
    await expect(geoLocateCurrentPosition()).rejects.toThrow("Geolocation is unavailable");
  });

  it("shares coordinates across subscribers and clears them when permission is denied", async () => {
    function LocationDisplay({ label }: { label: string }) {
      const coordinates = useSharedDeviceLocation();
      return <output aria-label={label}>{coordinates?.join(",") ?? "Unavailable"}</output>;
    }
    const position = { coords: { latitude: 45.5, longitude: -122.6 } };
    const getCurrentPosition = jest.fn(success => success(position));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    render(<><LocationDisplay label="Map" /><LocationDisplay label="Planner" /></>);

    await act(async () => { await geoLocateCurrentPosition(); });
    expect(screen.getByLabelText("Map")).toHaveTextContent("-122.6,45.5");
    expect(screen.getByLabelText("Planner")).toHaveTextContent("-122.6,45.5");

    const denied = { code: 1, message: "Permission denied" };
    getCurrentPosition.mockImplementation((_success, failure) => failure(denied));
    await act(async () => { await expect(geoLocateCurrentPosition()).rejects.toBe(denied); });
    expect(screen.getByLabelText("Map")).toHaveTextContent("Unavailable");
    expect(screen.getByLabelText("Planner")).toHaveTextContent("Unavailable");
  });

  it("keeps the last shared position when a request times out", async () => {
    function LocationDisplay() {
      return <output aria-label="Location">{useSharedDeviceLocation()?.join(",")}</output>;
    }
    const position = { coords: { latitude: 45.6, longitude: -122.7 } };
    const getCurrentPosition = jest.fn(success => success(position));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    render(<LocationDisplay />);
    await act(async () => { await geoLocateCurrentPosition(); });

    const timeout = { code: 3, message: "Timed out" };
    getCurrentPosition.mockImplementation((_success, failure) => failure(timeout));
    await act(async () => { await expect(geoLocateCurrentPosition()).rejects.toBe(timeout); });
    expect(screen.getByLabelText("Location")).toHaveTextContent("-122.7,45.6");
  });
});
