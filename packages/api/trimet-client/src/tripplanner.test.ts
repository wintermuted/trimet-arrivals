import { vi } from "vitest";
/** @vitest-environment jsdom */
import { parsePlannerCoordinates, parseTripPlannerResponse, planTrip } from "./index";

const response = `<?xml version="1.0" encoding="UTF-8"?>
<response success="true" xmlns="http://maps.trimet.org/maps/model/xml">
  <from><description>Gresham City Hall</description><stopId>8356</stopId></from>
  <to><description>Wilsonville WES Station</description><stopId>13070</stopId></to>
  <itineraries count="2">
    <itinerary id="1" viaRoute="MAX">
      <time-distance><startTime>1:39 PM</startTime><endTime>2:28 PM</endTime><duration>51</duration><numberOfTransfers>1</numberOfTransfers><walkingTime>2</walkingTime></time-distance>
      <leg id="1.1" mode="Walk" order="start"><time-distance><duration>2</duration><distance>0.06</distance></time-distance><from><description>Gresham City Hall</description></from><to><description>Gresham Central Transit Center</description><stopId>8345</stopId></to></leg>
      <leg id="1.2" mode="Light Rail" order="start" xsi:type="ns:TransitLegType" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns="urn:trimet"><time-distance><startTime>1:39 PM</startTime><endTime>2:20 PM</endTime></time-distance><from><description>Gresham Central Transit Center</description><stopId>8345</stopId><stopSequence>5</stopSequence></from><to><description>Union Station</description><stopId>8230</stopId></to><route><number>MAX</number><internalNumber>100</internalNumber><name>MAX Blue Line</name><direction>west</direction><block>9006</block></route><direction>west</direction></leg>
      <leg id="1.3" mode="Commuter Rail" order="end"><time-distance><startTime>2:30 PM</startTime><endTime>3:12 PM</endTime><duration>42</duration></time-distance><from><description>Union Station</description><stopId>8230</stopId></from><to><description>Wilsonville WES Station</description><stopId>13070</stopId></to><route><number>WES</number><name>WES to Wilsonville</name></route></leg>
    </itinerary>
    <itinerary id="2"><time-distance><startTime>1:50 PM</startTime><endTime>2:50 PM</endTime><duration>60</duration></time-distance></itinerary>
  </itineraries>
</response>`;

describe("TriMet trip planner response", () => {
  it("encodes mixed endpoints with the corresponding TriMet parameters", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => response });
    const { signal } = new AbortController();
    globalThis.fetch = fetchMock;
    try {
      await planTrip(
        { fromCoord: "-122.68,45.52", toPlace: "1001 SW 5th Ave", signal },
        { baseUrl: "https://example.test/ws/", appId: "test-id" },
      );
      const [requestUrl] = fetchMock.mock.calls[0];
      expect(fetchMock).toHaveBeenCalledWith(requestUrl, { signal });
      const { origin, pathname, searchParams } = new URL(requestUrl);
      expect(`${origin}${pathname}`).toBe("https://example.test/ws/V1/trips/tripplanner");
      expect(searchParams.get("appID")).toBe("test-id");
      expect(searchParams.get("format")).toBe("xml");
      expect(searchParams.get("maxIntineraries")).toBe("6");
      expect(searchParams.get("fromCoord")).toBe("-122.68,45.52");
      expect(searchParams.has("fromPlace")).toBe(false);
      expect(searchParams.get("toPlace")).toBe("1001 SW 5th Ave");
      expect(searchParams.has("toCoord")).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("validates longitude, latitude before using a coordinate endpoint", () => {
    expect(parsePlannerCoordinates(" -122.68 , 45.52 ")).toEqual([-122.68, 45.52]);
    for (const invalid of ["45,-122", "181,45", "-122,", "0x12,45", "-122,45,2"]) {
      expect(parsePlannerCoordinates(invalid)).toBeUndefined();
    }
  });
  it("normalizes multiple itineraries, legs, route details, stops, times and transfers", () => {
    const result = parseTripPlannerResponse(response);

    expect(result.success).toBe(true);
    expect(result.from).toMatchObject({
      description: "Gresham City Hall",
      stopId: 8356,
    });
    expect(result.itineraries).toHaveLength(2);
    expect(result.itineraries[0]).toMatchObject({
      startTime: "1:39 PM",
      endTime: "2:28 PM",
      duration: 51,
      numberOfTransfers: 1,
      walkingTime: 2,
      legs: [
        {
          mode: "Walk",
          from: { description: "Gresham City Hall" },
          to: { description: "Gresham Central Transit Center", stopId: 8345 },
        },
        {
          mode: "Light Rail",
          route: {
            number: "MAX",
            internalNumber: 100,
            name: "MAX Blue Line",
            direction: "west",
          },
          from: { stopId: 8345, stopSequence: 5 },
          startTime: "1:39 PM",
        },
        {
          mode: "Commuter Rail",
          route: { number: "WES", name: "WES to Wilsonville" },
          to: { stopId: 13070 },
        },
      ],
      partial: false,
    });
    expect(result.itineraries[1].partial).toBe(true);
    expect(result.partial).toBe(true);
  });

  it("returns an explicit empty itinerary list for a successful no-service response", () => {
    const result = parseTripPlannerResponse(
      `<response success="true"><itineraries count="0"/></response>`,
    );

    expect(result).toMatchObject({
      success: true,
      itineraries: [],
      partial: false,
    });
  });

  it("preserves service errors and rejects malformed XML", () => {
    const result = parseTripPlannerResponse(
      `<response success="false"><error code="20022"><message>Uncertain Location</message></error></response>`,
    );

    expect(result).toMatchObject({
      success: false,
      errorMessage: "Uncertain Location",
      itineraries: [],
    });
    expect(() => parseTripPlannerResponse("<response>")).toThrow(
      "unreadable trip-planner response",
    );
  });
});
