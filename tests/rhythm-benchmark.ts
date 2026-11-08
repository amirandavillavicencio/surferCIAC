import { Sim } from '../upstream/src/sim/sim';
import { laneX } from '../upstream/src/config';
import type { Spec } from '../upstream/src/sim/track';
import type { Input } from './decision-pilot';

const dt = 1 / 120;
const stride = 12;
const beamWidth = 24;
const seeds = Number(process.argv[2] ?? 30);
const length = Number(process.argv[3] ?? 4000);
const baseline = process.argv[4] === 'base';
const reading = (d: number) => d >= 140 && (d - 140) % 150 < 50;

function fork(sim: Sim): Sim {
  return Object.assign(Object.create(Sim.prototype), sim, {
    pace: Object.assign(Object.create(Object.getPrototypeOf(sim.pace)), sim.pace),
    obs: sim.obs.map(ob => ({...ob})),
    power: {...sim.power}, events: [], freeObs: [], freeCoins: [], freePowers: [],
  });
}

interface Step { inputs: Input[]; time: number }
interface Candidate { sim: Sim; steps: Step[]; cost: number }

function advance(sim: Sim, ticks: number, end: number) {
  for (let i = 0; i < ticks && sim.alive && sim.d < end; i++) {
    sim.questionGate = 180 + 150 * Math.max(0, Math.ceil((sim.d - 180) / 150));
    sim.update(dt);
  }
  return sim.alive && sim.sinceStumble > 10;
}

function initial(specs: Spec[], start: number, lane: number) {
  const sim = new Sim();
  sim.noSpawn = true;
  sim.reset(1, false);
  sim.clearWorld();
  sim.d = start;
  sim.lane = lane;
  sim.x = laneX(lane);
  for (const spec of specs) sim.addOb(spec);
  sim.start();
  return sim;
}

function options(sim: Sim): Input[][] {
  const sp = Math.max(sim.speed, 12);
  const nearby = sim.obs.some(ob => ob.d1 >= sim.d - 1 && ob.d0 < sim.d + sp * .7 + 6);
  if (!nearby) return [[]];
  const moves: Input[][] = [[]];
  if (sim.lane > 0) moves.push(['left']);
  if (sim.lane < 2) moves.push(['right']);
  if (sim.lane === 0) moves.push(['right', 'right']);
  if (sim.lane === 2) moves.push(['left', 'left']);
  const result = moves.slice();
  if (sim.grounded || sim.coyoteT > 0) result.push(...moves.map(move => ['jump', ...move] as Input[]));
  if (!sim.sliding && !sim.fastFall) result.push(...moves.map(move => ['down', ...move] as Input[]));
  return result;
}

function search(first: Sim, end: number) {
  let beam: Candidate[] = [{sim: fork(first), steps: [], cost: 0}];
  while (beam.length && beam[0].sim.d < end) {
    const states = new Map<string, Candidate>();
    for (const candidate of beam) for (const inputs of options(candidate.sim)) {
      const cost = candidate.cost + inputs.length;
      const sim = fork(candidate.sim);
      for (const input of inputs) sim[input]();
      if (!advance(sim, stride, end)) continue;
      const key = [sim.lane, Math.round(sim.x * 3), Math.round(sim.y * 5),
        Math.round(sim.vy / 2), Math.round(sim.slideT * 10), sim.grounded].join('/');
      const old = states.get(key);
      if (old && old.cost <= cost) continue;
      states.set(key, {sim, cost, steps: inputs.length
        ? [...candidate.steps, {time: candidate.sim.time, inputs}] : candidate.steps});
    }
    const ordered = [...states.values()].sort((a, b) => a.cost - b.cost);
    // Retain distinct approaches so cheaper candidates cannot erase every
    // runner in the lane that is needed at the next ramp.
    const laneCount = [0, 0, 0];
    beam = ordered.filter(candidate => laneCount[candidate.sim.lane]++ < beamWidth / 3);
  }
  return beam[0];
}

const gaps: number[] = [];
const signatures = new Set<string>();
const minimum: number[] = [];
let windows = 0, passive = 0, noWitness = 0, shortest = Infinity;
let roofFrames = 0, frames = 0, roofTransfers = 0, rises = 0;
const byLane = [0, 0, 0];

for (let seed = 1; seed <= seeds; seed++) {
  const generated = new Sim(seed);
  generated.noSpawn = true;
  generated.reset(seed, false);
  while (generated.track.frontier < length + 150) generated.track.ensure(length + 150);
  let carriedLane = 1;
  for (let start = 0; start < length; start = start === 0 ? 190 : start + 150) {
    const end = Math.min(length, start === 0 ? 190 : start + 150);
    const specs = generated.obs.map(Sim.specOf).filter(ob => ob.d1 >= start && ob.d0 < end);
    windows++;
    signatures.add(specs.map(ob => [ob.kind, ob.lane, +(ob.d0 - start).toFixed(1), ob.cars].join(':')).join(','));
    const first = initial(specs, start, carriedLane);
    let pass = false;
    for (let lane = 0; lane < 3; lane++) {
      const sim = initial(specs, start, lane);
      if (advance(sim, 4000, end) && sim.d >= end) {
        byLane[lane]++;
        pass = true;
      }
    }
    passive += Number(pass);
    const found = search(first, end);
    if (!found) {
      noWitness++;
      carriedLane = 1;
      continue;
    }
    carriedLane = found.sim.lane;
    shortest = Math.min(shortest, found.cost);
    minimum.push(found.cost);
    const sim = fork(first);
    let next = 0, gap = 0, leftRoof = -1;
    while (sim.d < end && sim.alive) {
      const step = found.steps[next];
      if (step && sim.time >= step.time - 1e-6) {
        for (const input of step.inputs) sim[input]();
        next++;
        if (gap) gaps.push(gap);
        gap = 0;
      }
      if (reading(sim.d)) {
        if (gap) gaps.push(gap);
        gap = 0;
      } else gap += dt;
      const supported = sim.grounded && sim.groundY > 3;
      const lane = sim.lane;
      advance(sim, 1, end);
      const onRoof = sim.grounded && sim.groundY > 3;
      frames++;
      roofFrames += Number(onRoof);
      if (supported && !onRoof) leftRoof = lane;
      if (!supported && onRoof) {
        rises++;
        if (leftRoof >= 0 && leftRoof !== sim.lane && sim.airTime < 1) roofTransfers++;
        leftRoof = -1;
      }
    }
    if (gap) gaps.push(gap);
  }
}
const mean = (samples: number[]) => samples.reduce((a, b) => a + b, 0) / samples.length;
console.log(JSON.stringify({
  baseline, seeds, length, windows, passive, byLane, percentPassive: 100 * passive / windows,
  noWitness, minimumActions: shortest, meanMinimumActions: mean(minimum), totalMinimumActions: minimum.reduce((a,b) => a+b,0),
  longestGap: Math.max(...gaps), meanGap: mean(gaps), roofPercent: 100 * roofFrames / frames,
  roofTransfers, rises, signatures: signatures.size, strideSeconds: stride * dt, beamWidth,
}, null, 2));
