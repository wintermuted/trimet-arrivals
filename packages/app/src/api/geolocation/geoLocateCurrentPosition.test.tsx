import geoLocateCurrentPosition from "./geoLocateCurrentPosition";

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
});
