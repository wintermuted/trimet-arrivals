import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getAllRoutes } from "../../../api/trimet/routeConfig";
import { TrimetRoute } from "../../../api/trimet/interfaces/routes";
import { AllLines } from "./AllLines";
import { BusLines } from "./BusLines";
import { MaxLines } from "./MaxLines";
import { StreetCarLines } from "./StreetCarLines";
import { WES } from "./WES";

vi.mock("../../../api/trimet/routeConfig");

const route = (id: number, type: string, desc: string): TrimetRoute => ({
  id,
  route: id,
  type,
  desc,
  dir: [],
  routeColor: "",
  routeSortOrder: id
});

beforeEach(() => {
  vi.mocked(getAllRoutes).mockResolvedValue({
    route: [
      route(54, "B", "Bus route"),
      route(90, "R", "MAX route"),
      route(193, "R", "Streetcar route"),
      route(203, "R", "WES route"),
      route(208, "R", "Aerial tram")
    ]
  });
});

it.each([
  { Lines: AllLines, ids: [54, 90, 193, 203] },
  { Lines: BusLines, ids: [54] },
  { Lines: MaxLines, ids: [90] },
  { Lines: StreetCarLines, ids: [193] },
  { Lines: WES, ids: [203] }
])(
  "renders fetched line links without a state provider (%#)",
  async ({ Lines, ids }) => {
    render(
      <MemoryRouter>
        <Lines />
      </MemoryRouter>
    );
    const links = await screen.findAllByRole("link");
    expect(links.map(link => link.getAttribute("href")).sort()).toEqual(
      ids.map(id => `/lines/${id}`).sort()
    );
    expect(screen.queryByText("Aerial tram")).not.toBeInTheDocument();
  }
);
