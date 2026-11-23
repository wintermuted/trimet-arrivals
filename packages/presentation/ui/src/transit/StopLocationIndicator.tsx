import { Badge } from "@wintermuted/ui-react";

export default function StopLocationIndicator({ locationId }: { locationId: number }) {
  return <Badge>{locationId}</Badge>;
}
