import { OB, trainLength } from '../config';
import type { Spec } from '../sim/track';

type Barrier = 'low' | 'overhead';

export function raceSequence(start: number, from: number, target: number, railway: boolean, variant: number): Spec[] {
  const specs: Spec[] = [];
  const row = (offset: number, kind: Barrier, route: number, omit = -1) => {
    for (let lane = 0; lane < 3; lane++) {
      if (lane === omit) continue;
      const obstacle = (variant & 2) && lane !== route ? (kind === 'low' ? 'overhead' : 'low') : kind;
      const d0 = start + offset;
      specs.push({ kind: obstacle, lane, d0, d1: d0 + OB[obstacle].depth });
    }
  };
  const train = (lane: number, offset: number, cars: number) => {
    const d0 = start + offset;
    specs.push({ kind: 'train', lane, d0, d1: d0 + trainLength(cars), cars });
  };
  const first = variant % 2 ? 'overhead' : 'low';
  const second = first === 'low' ? 'overhead' : 'low';
  const shift = Math.floor(variant / 4) % 3;
  row(8, first, from);
  if (railway) {
    const ramp = start + 23 + shift;
    specs.push({ kind: 'ramp', lane: from, d0: ramp, d1: ramp + OB.ramp.depth });
    train(from, 30 + shift, 3);
    train(target, 30 + shift, 1);
    const far = 3 - from - target;
    train(far, 30 + shift, 3);
    train(target, 42 + shift, 3);
    train(from, 55 + shift, 1);
    train(far, 55 + shift, 1);
    row(84, second, target);
  } else {
    const trafficLane = target;
    specs.push({
      kind: 'mtrain', lane: trafficLane, d0: start + 25, d1: start + 48,
      activation: start + 24, approach: 44, trainSpeed: 60 + shift * 4, cars: 2,
    });
    row(29 + shift, second, from, trafficLane);
    row(49 - shift, first, from, trafficLane);
    row(68 + shift, second, from, trafficLane);
    row(84, first, from);
  }
  return specs;
}
