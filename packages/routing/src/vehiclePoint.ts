type Point = [number, number];

interface TimedMovement {
  from: Point;
  to: Point;
  started: number;
}

export const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

export function vehiclePoint(moving: TimedMovement, now: number, durationMs: number): Point {
  const progress = Math.max(0, Math.min(1, (now - moving.started) / durationMs));
  const eased = easeOutCubic(progress);
  return [
    moving.from[0] + (moving.to[0] - moving.from[0]) * eased,
    moving.from[1] + (moving.to[1] - moving.from[1]) * eased,
  ];
}
