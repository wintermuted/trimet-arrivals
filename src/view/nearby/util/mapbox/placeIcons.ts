import { faBook, faLeaf, faBasketShopping, faRestroom, faSeedling, faTree, faUsers, faUtensils,
  faCartShopping, faRecycle, faCarrot, faBicycle } from "@fortawesome/free-solid-svg-icons";
import { PlaceCategory } from "../../../../api/places/places";

const definitions = { park: faTree, "food-cart-pod": faUtensils, "community-center": faUsers, library: faBook,
  "community-garden": faLeaf, "farmers-market": faBasketShopping, "public-restroom": faRestroom, "heritage-tree": faSeedling,
  "grocery-store": faCartShopping, "reuse-repair": faRecycle, "csa-pickup": faCarrot, "bicycle-parking": faBicycle };
export const placeIconDefinition = (category: PlaceCategory) => definitions[category];

export function createPlaceIconImage(category: PlaceCategory): ImageData {
  const [width, height, , , paths] = placeIconDefinition(category).icon;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 48;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Place marker icons require canvas rendering");
  const scale = 36 / Math.max(width, height);
  context.translate((48 - width * scale) / 2, (48 - height * scale) / 2);
  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  for (const path of Array.isArray(paths) ? paths : [paths]) context.fill(new Path2D(path));
  return context.getImageData(0, 0, 48, 48);
}

export function createPlaceIconElement(category: PlaceCategory): SVGSVGElement {
  const [width, height, , , paths] = placeIconDefinition(category).icon;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("fill", "currentColor");
  for (const data of Array.isArray(paths) ? paths : [paths]) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", data);
    svg.appendChild(path);
  }
  return svg;
}
