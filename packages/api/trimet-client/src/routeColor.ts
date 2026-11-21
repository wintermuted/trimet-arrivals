export function normalizeRouteColor(value: unknown): string | undefined {
  const hex = typeof value === "string" ? value.replace(/^#/, "") : "";
  return /^[\da-f]{6}$/i.test(hex) ? `#${hex}` : undefined;
}
