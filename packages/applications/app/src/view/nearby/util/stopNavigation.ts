const DEFAULT_STOP_BACK = "/nearby/stops";
const LOCAL_ORIGIN = "https://local.invalid";

export function stopDetailUrl(stopId: number, referrer: string): string {
  const query = new URLSearchParams({ referrer });
  return `/nearby/stops/${stopId}?${query.toString()}`;
}

export function stopBackUrl(search: string): string {
  const referrers = new URLSearchParams(search).getAll("referrer");
  if (!referrers.length) return DEFAULT_STOP_BACK;
  const referrer = referrers[0];
  // oxlint-disable-next-line no-control-regex -- Reject controls before URL parsing normalizes them.
  const hasUnsafeCharacters = /[\\\u0000-\u001f\u007f]/.test(referrer);
  if (referrers.length === 1 && referrer.startsWith("/") &&
      !referrer.startsWith("//") && !hasUnsafeCharacters) {
    try {
      const url = new URL(referrer, LOCAL_ORIGIN);
      if (url.origin === LOCAL_ORIGIN &&
          (url.pathname === "/" || url.pathname === "/nearby" || url.pathname.startsWith("/nearby/"))) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      // Invalid referrers fall back to the stop list.
    }
  }
  console.warn("Invalid stop referrer; returning to nearby stops.");
  return DEFAULT_STOP_BACK;
}
