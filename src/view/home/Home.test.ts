import { Alert } from "../../api/trimet/interfaces/alertsData";
import { partitionAlerts } from "./Home";

const alert = (id: number, systemWide: boolean): Alert => ({
  id,
  begin: id,
  end: 0,
  desc: `Alert ${id}`,
  header_text: `Alert ${id}`,
  info_link_url: "",
  system_wide_flag: systemWide,
  route: []
});

it("keeps system alerts separate from route and stop alerts", () => {
  const feeds = partitionAlerts([
    alert(1, false),
    alert(2, true),
    alert(3, false)
  ]);
  expect(feeds.alerts.map(item => item.id)).toEqual([3, 1]);
  expect(feeds.systemAlerts.map(item => item.id)).toEqual([2]);
});
