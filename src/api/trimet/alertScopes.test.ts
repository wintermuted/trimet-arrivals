import { Alert } from "./interfaces/alertsData";
import { TrimetRoute } from "./interfaces/routes";
import { getAlertsForRoute, getAlertsForStop } from "./alertScopes";

const alert = (overrides: Partial<Alert>): Alert => ({
  id: 1,
  begin: 1,
  end: 0,
  desc: "Service notice",
  header_text: "Notice",
  info_link_url: "",
  system_wide_flag: false,
  route: [],
  ...overrides
});

const route = (id: number): TrimetRoute => ({
  id,
  route: id,
  desc: `Route ${id}`,
  routeColor: "000000",
  type: "bus",
  dir: []
});

const location = id => ({
  id,
  desc: `Stop ${id}`,
  dir: "North",
  lat: 45,
  lng: -122,
  no_service_flag: false,
  passengerCode: String(id)
});

describe("alert scope", () => {
  it("keeps system and matching-route alerts without unrelated routes", () => {
    const alerts = [
      alert({ id: 1, route: [route(54)] }),
      alert({ id: 2, route: [route(8)] }),
      alert({ id: 3, system_wide_flag: true })
    ];
    expect(getAlertsForRoute(alerts, 54).map(item => item.id)).toEqual([1, 3]);
  });

  it("keeps system and matching-stop alerts without other stop closures", () => {
    const alerts = [
      alert({ id: 1, location: [location(123)] }),
      alert({ id: 2, location: [location(456)] }),
      alert({ id: 3, system_wide_flag: true })
    ];
    expect(getAlertsForStop(alerts, 123).map(item => item.id)).toEqual([1, 3]);
  });
});
