import { Sim, type Spec } from '../upstream/src/sim/sim';

const DECISION_STEP = 12 / 120;
const REACTION_STEPS = 3;
const ACTIONS = ['left', 'right', 'jump', 'down'] as const;
type Action = typeof ACTIONS[number];
type Input = { action: Action; time: number };
type Snapshot = ReturnType<typeof checkpoint>;

function checkpoint(s: Sim) {
  const {
    d, time, speed, lane, laneT, x, fromX, y, vy, groundY, grounded, slideT,
    fastFall, slideQueued, coyoteT, jumpBufT, airTime, peakY, sinceStumble,
  } = s;
  return { d, time, speed, lane, laneT, x, fromX, y, vy, groundY, grounded, slideT,
    fastFall, slideQueued, coyoteT, jumpBufT, airTime, peakY, sinceStumble,
    // This private scalar belongs to the existing engine's lateral easing.
    laneDuration: (s as unknown as { laneDuration: number }).laneDuration,
  };
}

type Node = { state: Snapshot; inputs: Input[]; ground: number; roof: number; transfers: number;
  vertical: number; lastSurface: number };

const quantize = (value: number, bins: number) => Math.round(value * bins);
function signature(s: Snapshot) {
  return [
    s.lane, quantize(s.x, 20), quantize(s.fromX, 10), quantize(s.laneT, 10),
    quantize(s.laneDuration, 120), quantize(s.y, 20), quantize(s.vy, 4),
    quantize(s.slideT, 20), quantize(s.coyoteT, 20), quantize(s.jumpBufT, 20),
    Number(s.grounded), Number(s.fastFall), Number(s.slideQueued),
  ].join('/');
}

/**
 * Bounded, time-expanded search. All retained routes replay through Sim;
 * the minimum found is an upper bound on the unrestricted human minimum.
 * There is a 300ms entry reaction window and 100ms between input opportunities.
 */
export function searchEncounter(specs: Spec[], start: number, end: number, gate: number, speedOverride = 0) {
  const sim = new Sim();
  sim.noSpawn = true;
  sim.reset(1, false);
  sim.clearWorld();
  sim.speedOverride = speedOverride;
  sim.d = start;
  sim.questionGate = gate;
  sim.start();
  const staticObstacles = specs.filter(s => s.kind !== 'mtrain').map(s => sim.addOb(s));
  const movers = specs.filter(s => s.kind === 'mtrain').map(s => sim.addOb(s));
  let pace = { ...sim.pace };
  let nodes: Node[] = [0, 1, 2].map(lane => {
    Object.assign(sim, { lane, x: (lane - 1) * 2.5 });
    return { state: checkpoint(sim), inputs: [], ground: 0, roof: 0, transfers: 0, vertical: 0, lastSurface: -1 };
  });
  let step = 0;
  while (nodes.length && nodes[0].state.d < end) {
    const next = new Map<string, Node>();
    let nextPace = pace;
    let nextMovers = movers;
    for (const node of nodes) {
      const actions = step < REACTION_STEPS ? [undefined] : [undefined, ...ACTIONS];
      for (const action of actions) {
        if (action === 'left' && node.state.lane === 0 || action === 'right' && node.state.lane === 2) continue;
        Object.assign(sim, node.state, { alive: true, ignoreId: -1, ignoreT: 0, stumbleSlow: 0 });
        Object.assign(sim.pace, pace);
        sim.obs = [...staticObstacles, ...movers.map(o => ({ ...o }))];
        sim.events.length = 0;
        if (action) sim[action]();
        let ground = node.ground, roof = node.roof, transfers = node.transfers;
        let vertical = node.vertical, lastSurface = node.lastSurface;
        for (let i = 0; i < 12 && sim.alive; i++) {
          const before = sim.d;
          sim.update(1 / 120);
          if (sim.grounded) {
            const surface = sim.groundY > 3.3
              ? staticObstacles.find(o => o.kind === 'train' && o.lane === sim.lane &&
                sim.d >= o.d0 - .15 && sim.d <= o.d1 + .15)?.id ?? -1
              : -1;
            if (surface !== lastSurface) {
              if ((surface < 0) !== (lastSurface < 0)) vertical++;
              else if (surface >= 0 && sim.events.some(e => e.type === 'land')) transfers++;
              lastSurface = surface;
            }
            if (surface >= 0) roof += sim.d - before;
            else if (sim.y < .05) ground += sim.d - before;
          }
        }
        // No shield, invincibility, or accepted contact with hazards.
        if (!sim.alive || sim.sinceStumble < 99) continue;
        const state = checkpoint(sim);
        const inputs = action ? [...node.inputs, { action, time: node.state.time }] : node.inputs;
        const key = signature(state);
        const incumbent = next.get(key);
        if (incumbent && incumbent.inputs.length <= inputs.length) continue;
        next.set(key, { state, inputs, ground, roof, transfers, vertical, lastSurface });
        nextPace = { ...sim.pace };
        nextMovers = sim.obs.filter(o => o.kind === 'mtrain');
      }
    }
    nodes = [...next.values()].sort((a, b) => a.inputs.length - b.inputs.length).slice(0, 110);
    pace = nextPace;
    movers.splice(0, movers.length, ...nextMovers);
    step++;
  }
  return { best: nodes[0], endStates: nodes.length };
}

export { DECISION_STEP };
