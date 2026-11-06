import { OB, trainLength, MOVER } from '../config';
import type { Spec } from '../sim/track';

// One encounter fits the unchanged usable interval between two quiz reserves.
// The outside lane remains an escape after the oncoming train has passed.
export function encounter(start: number, from: number): Spec[] {
  const other = 2 - from;
  const roof = trainLength(3);
  return [
    {kind:'low',lane:1,d0:start+8,d1:start+8+OB.low.depth},
    {kind:'ramp',lane:from,d0:start+24,d1:start+31},
    {kind:'train',lane:from,d0:start+31,d1:start+31+roof,cars:3},
    {kind:'train',lane:1,d0:start+40,d1:start+40+roof,cars:3},
    {kind:'mtrain',lane:other,d0:start+18,d1:start+18+trainLength(2)/(1+MOVER.ratio),cars:2},
    {kind:'low',lane:from,d0:start+82,d1:start+82+OB.low.depth},
    {kind:'overhead',lane:1,d0:start+82,d1:start+82+OB.overhead.depth},
  ];
}

// Timestamped by distance, not frame number. Used for reward placement and
// replayed through Sim in tests; it deliberately includes a real roof jump.
export function encounterRoute(start: number, from: number, d: number, speed: number) {
  const jumpAt = start + 36;
  const landAt = jumpAt + speed * 0.66;
  if (d < jumpAt) return {lane:from, y:d>=start+24 ? Math.min(3.4,(d-start-24)/7*3.4) : 0};
  if (d < landAt) {
    const t=(d-jumpAt)/speed;
    const gravity=2*1.75/(.34*.34);
    return {lane:d < jumpAt+speed*.075 ? from : 1, y:3.4+Math.max(0,gravity*.34*t-.5*gravity*t*t)};
  }
  if (d <= start+40+trainLength(3)) return {lane:1,y:3.4};
  const t=(d-start-40-trainLength(3))/speed;
  return {lane:1,y:Math.max(0,3.4-.5*30.3*1.15*t*t)};
}
