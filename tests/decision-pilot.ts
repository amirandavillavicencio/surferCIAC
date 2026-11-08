import type { Sim } from '../upstream/src/sim/sim';
import type { Ob } from '../upstream/src/sim/types';

export type Input = 'left' | 'right' | 'jump' | 'down';

export function rowsOf(obs: Ob[]) {
  return [...new Set(obs.filter(o => o.kind === 'low' || o.kind === 'overhead').map(o => o.d0))]
    .sort((a, b) => a - b)
    .map(d => ({d, barriers: obs.filter(o => o.d0 === d && (o.kind === 'low' || o.kind === 'overhead'))}));
}

export function decisionPilot(sim: Sim, input: (key: Input) => void = key => sim[key]()) {
  const speed = Math.max(6, sim.speed);
  const move = (lane: number) => {
    if (lane === sim.lane) return;
    const next = sim.lane + Math.sign(lane - sim.lane);
    if (sim.obs.some(o => o.kind === 'train' && o.lane === next &&
      o.d0 < sim.d + speed * .17 && o.d1 > sim.d - .4 && sim.y < o.yt - .4)) return;
    input(lane < sim.lane ? 'left' : 'right');
  };
  const ramps = sim.obs.filter(o => o.kind === 'ramp');
  const ramp = ramps.find(o => sim.d >= o.d0 - speed * .38 && sim.d <= o.d1 + 5);
  if (ramp) {
    if (sim.d < ramp.d0) move(ramp.lane);
    else if (sim.power.shoes > 0 && sim.lane !== ramp.lane && sim.laneT >= 1 &&
      !sim.grounded && !sim.fastFall && sim.y > 4.5) input('down');
    else if (sim.d >= ramp.d1 + 1.2 && sim.lane === ramp.lane && sim.grounded) {
      const roof = sim.obs.filter(o => o.kind === 'train' && o.lane !== ramp.lane &&
        o.d0 >= ramp.d1 && o.d0 <= ramp.d1 + 2).sort((a, b) => b.d1 - a.d1)[0];
      if (roof) {
        input('jump');
        move(roof.lane);
        move(roof.lane);
      }
    }
    return;
  }

  const rows = rowsOf(sim.obs);
  if (sim.power.shoes > 0 && !sim.grounded && !sim.fastFall && sim.y > 1.4 &&
    rows.some(row => sim.d > row.d + 1.1 && sim.d < row.d + 2.5)) input('down');
  const row = rows.find(row => row.d + 1 > sim.d);
  if (!row || row.d - sim.d > speed * .65 || sim.d >= row.d - .3) return;
  const nextRamp = ramps.find(o => o.d0 >= row.d && o.d0 <= row.d + 15);
  const barrier = row.barriers.find(o => o.lane === nextRamp?.lane) ??
    row.barriers.find(o => o.lane === sim.lane) ?? row.barriers[0];
  move(barrier.lane);
  if (sim.lane === barrier.lane && row.d - sim.d <= speed * .23) {
    if (barrier.kind === 'overhead' && sim.slideT < (row.d - sim.d) / speed + .09 && !sim.slideQueued) input('down');
    if (barrier.kind === 'low' && sim.grounded) input('jump');
  }
}
