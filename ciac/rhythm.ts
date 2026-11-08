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

  // In half of the eligible sections, an oncoming train replaces the parked train
  // that formerly blocked the third lane. Both playable roof routes, ramps,
  // mandatory action rows and the protected academic corridor stay intact.
  const roofs = roofSection(ramp, rampLane, landingLane, variant, roofFirst);
  if (start >= 190 && variant % 2 === 0) {
    const thirdLane = 3 - rampLane - landingLane;
    const index = roofs.findIndex(spec => spec.kind === 'train' && spec.lane === thirdLane);
    if (index < 0) throw new Error('Missing third-lane blocking train');
    // The old timed-train system uses an activation distance and train speed;
    // the meeting envelope is wholly before the next quiz reservation.
    roofs[index] = {
      kind: 'mtrain', lane: thirdLane,
      d0: start + 16, d1: start + 85,
      activation: start, trainSpeed: 56 + (variant % 4) * 4, cars: 2,
    };
  }

  return {
    entry, middle, ramp, exit, entryLane, rampLane, landingLane,
    specs: [
      ...decisionRow(entry, entryLane, variant),
      ...decisionRow(middle, roofFirst ? landingLane : rampLane, variant + 1),
      ...roofs,
      ...decisionRow(exit, landingLane, variant + 2, false),
    ],
  };
}
