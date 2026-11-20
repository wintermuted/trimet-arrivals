export function getNearbyMapZoom(radius: number): number {
  switch (radius) {
    case 250: return 19;
    case 500: return 18;
    case 750: return 17;
    case 1500: return 15.5;
    case 2000: return 15;
    case 2500: return 14.5;
    case 5000: return 13.5;
    default: return 16;
  }
}
