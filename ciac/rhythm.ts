import { decisionRow, roofSection } from './action-section';

// The playable interval ends before the next reading zone, including the
// obstacle retirement margin. Every row is committed as a unit.
export function decisionSection(start: number, rampLane: number, landingLane: number, variant: number) {
  const roofFirst = Math.floor(variant / 6) % 2 === 0;
  const entry = start + (roofFirst ? 7 : 3) + variant % 3;
  const middle = start + (roofFirst ? 61 + variant % 2 : 23 + Math.floor(variant / 3) % 3);
  const ramp = start + (roofFirst ? 17 : 35) + variant % 2;
  const exit = start + 85;
  const entryLane = roofFirst ? rampLane : (rampLane + 1 + variant % 2) % 3;
  return {
    entry, middle, ramp, exit, entryLane, rampLane, landingLane,
    specs: [
      ...decisionRow(entry, entryLane, variant),
      ...decisionRow(middle, roofFirst ? landingLane : rampLane, variant + 1),
      ...roofSection(ramp, rampLane, landingLane, variant, roofFirst),
      ...decisionRow(exit, landingLane, variant + 2, false),
    ],
  };
}
