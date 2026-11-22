import { endpointLabel, endpointParams, locationEndpoint, sameEndpoint, sameEndpointMessage } from ".";
import type { PlannerEndpoint } from ".";
import type { InterestPlace } from "@overworld/places/catalog";

describe("planner endpoint modeling", () => {
  const stop: PlannerEndpoint = {
    kind: "stop",
    stop: { locid: 101, seq: 1, desc: "Library", aliases: [], dir: "E", tp: true, lng: -122.6, lat: 45.5 }
  };
  const place: InterestPlace = {
    id: "park:1", name: "Example Park", category: "park", coordinates: [-122.6, 45.5],
    arrival: "approximate", sourceUrl: "https://example.com"
  };

  it("parses and normalizes coordinate endpoints without converting invalid coordinates into place searches", () => {
    expect(locationEndpoint(" -122.60 , +45.50 ")).toEqual({ kind: "coord", value: "-122.6,45.5" });
    expect(locationEndpoint("Library address")).toEqual({ kind: "place", value: "Library address" });
    for (const value of ["", "181,45", "-122,91", "45", "-122,not-a-latitude"]) {
      expect(locationEndpoint(value)).toBeUndefined();
    }
    expect(locationEndpoint("Library address", true)).toBeUndefined();
  });

  it("serializes directional stop, place and named-coordinate queries without mixing parameter kinds", () => {
    expect(endpointParams(stop, "from")).toEqual({ from: "101" });
    expect(endpointParams({ kind: "place", value: "Library address" }, "to")).toEqual({ toPlace: "Library address" });
    expect(endpointParams({ kind: "coord", value: "-122.6,45.5", interestPlace: place }, "to")).toEqual({
      toCoord: "-122.6,45.5", toPlaceId: "park:1"
    });
    const query = new URLSearchParams({
      ...endpointParams(stop, "from"), ...endpointParams({ kind: "place", value: "A & B" }, "to")
    });
    expect(new URLSearchParams(query.toString()).get("toPlace")).toBe("A & B");
  });

  it("retains verified place labels, resolved address labels, and same-endpoint messages", () => {
    expect(endpointLabel(stop)).toBe("Library (101)");
    expect(endpointLabel({ kind: "coord", value: "-122.6,45.5", interestPlace: place })).toBe("Example Park");
    expect(endpointLabel({ kind: "place", value: "Library" }, { description: "Resolved Library" })).toBe("Resolved Library");
    const address: PlannerEndpoint = { kind: "place", value: "Library" };
    expect(sameEndpoint(address, { kind: "place", value: "library" })).toBe(true);
    expect(sameEndpointMessage(stop, stop)).toBe("Choose two different stops to plan a trip.");
    expect(sameEndpointMessage(address, address)).toBe("Choose two different locations to plan a trip.");
  });
});
