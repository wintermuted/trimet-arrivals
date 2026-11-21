export type VehicleBounds = [number, number, number, number];

export interface VehiclePosition {
  id: string;
  type: "bus" | "rail";
  longitude: number;
  latitude: number;
  time: number;
  expires: number;
  bearing?: number;
  routeNumber?: number;
  direction?: number;
  tripId?: string;
  blockId?: string;
  destination?: string;
  color?: string;
}

export interface VehicleSnapshot {
  queryTime: number;
  vehicles: VehiclePosition[];
  rejected: number;
}
