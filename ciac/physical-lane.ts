import { LANE_W, LANE_COUNT } from '../config';
export function occupiedLane(x: number) {
  return Math.max(0, Math.min(LANE_COUNT - 1, Math.floor(x / LANE_W + LANE_COUNT / 2)));
}
export function crossingLane(before: {d: number; x: number}, after: {d: number; x: number}, gate: number) {
  const t = after.d > before.d ? Math.max(0, Math.min(1, (gate - before.d) / (after.d - before.d))) : 1;
  return occupiedLane(before.x + (after.x - before.x) * t);
}
