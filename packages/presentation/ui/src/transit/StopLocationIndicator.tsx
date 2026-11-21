import { Badge } from "@wintermuted/ui-theme/react";

export default function StopLocationIndicator({ locationId }: { locationId: number }) {
  return <Badge>{locationId}</Badge>;
}
