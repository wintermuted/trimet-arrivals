type Endpoint =
  | { kind: "stop"; stop: { locid: number } }
  | { kind: "place" | "coord"; value: string };

interface StopReference {
  locid: number;
  desc: string;
  aliases: readonly string[];
}

export function endpointLabelForRequest(endpoint: Endpoint) {
  return endpoint.kind === "stop" ? String(endpoint.stop.locid) : endpoint.value;
}

export function sameEndpoint(from: Endpoint, to: Endpoint) {
  return from.kind === to.kind &&
    endpointLabelForRequest(from).toLowerCase() === endpointLabelForRequest(to).toLowerCase();
}

export function resolveStopReference<T extends StopReference>(
  stops: readonly T[],
  reference: string,
): { matches: T[]; stop?: T } {
  const query = reference.trim().toLowerCase();
  if (!query) {
    return { matches: [] };
  }
  if (/^\d+$/.test(query)) {
    const stop = stops.find((item) => item.locid === Number(query));
    return { matches: stop ? [stop] : [], stop };
  }

  const matches = stops.filter(
    (stop) =>
      stop.desc.toLowerCase() === query ||
      stop.aliases.some((alias) => alias.toLowerCase() === query),
  );
  return { matches, stop: matches.length === 1 ? matches[0] : undefined };
}
