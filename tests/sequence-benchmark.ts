import { Sim } from '../upstream/src/sim/sim';
import { plansOf, driveTraffic } from './traffic-controller';
import { searchEncounter } from './minimum-effort';

const seeds = [1, 2, 3, 4, 5, 6];
const finish = 640;
const search: ReturnType<typeof searchEncounter>[] = [];
const selected = { inputs: 0, ground: 0, roof: 0, transfers: 0, vertical: 0, meters: 0, successful: 0 };
const gaps: number[] = [];
const reading: number[] = [];
const signatures = new Set<string>();
let repeats = 0;
const mean = (a: number[]) => a.length ? a.reduce((total, x) => total + x, 0) / a.length : null;

for (const seed of seeds) {
  const sim = new Sim(seed);
  sim.noSpawn = true;
  sim.reset(seed, false);
  sim.track.ensure(finish + 150);
  const plans = plansOf(sim);
  let previous = '';
  for (let start = 40; start + 150 <= finish; start += 150) {
    const specs = sim.obs.map(Sim.specOf).filter(o => o.d0 >= start && o.d0 < start + 150);
    const signature = specs.map(o => [o.kind, o.lane, o.d0 - start, o.cars]).join('|');
    if (signature === previous) repeats++;
    signatures.add(signature);
    previous = signature;
    search.push(searchEncounter(specs, start, start + 150, start + 140));
  }
  sim.start();
  let gate = 180, last = 0, read = -1, surface = -1, jumpSource = -1;
  while (sim.d < finish && sim.alive) {
    sim.questionGate = gate;
    const before = sim.d;
    const lane = sim.lane, slide = sim.slideT, grounded = sim.grounded;
    driveTraffic(sim, plans);
    sim.update(1 / 120);
    const events = sim.drainEvents();
    const jump = grounded && sim.vy > 0 && !sim.grounded;
    const count = Number(lane !== sim.lane) + Number(jump) + Number(slide < sim.slideT);
    if (count) {
      selected.inputs += count;
      gaps.push(sim.time - last);
      last = sim.time;
    }
    if (jump) jumpSource = surface;
    if (sim.grounded) {
      const id = sim.obs.find(o => o.kind === 'train' && o.lane === sim.lane &&
        sim.d >= o.d0 - .15 && sim.d <= o.d1 + .15 && sim.groundY > 3.3)?.id ?? -1;
      if (id >= 0) selected.roof += sim.d - before;
      else if (sim.y < .05) selected.ground += sim.d - before;
      if ((id < 0) !== (surface < 0)) selected.vertical++;
      if (events.some(e => e.type === 'land')) {
        if (id >= 0 && jumpSource >= 0 && jumpSource !== id) selected.transfers++;
        jumpSource = -1;
      }
      surface = id;
    }
    if (read < 0 && sim.d >= gate - 40) read = sim.time;
    if (sim.d >= gate) {
      reading.push(sim.time - read);
      read = -1;
      gate += 150;
    }
  }
  gaps.push(sim.time - last);
  selected.meters += sim.d;
  selected.successful += Number(sim.alive && sim.d >= finish);
}
const valid = search.flatMap(r => r.best ? [r.best] : []);
const searchedGaps = valid.flatMap(r => {
  const times = [0, ...r.inputs.map(a => a.time), r.state.time];
  return times.slice(1).map((time, i) => time - times[i]);
});
const distance = valid.reduce((sum, r) => sum + r.state.d, 0) - valid.reduce((sum, r) => {
  // Encounter ends are aligned to the next encounter start.
  return sum + Math.floor((r.state.d - 40) / 150) * 150 + 40 - 150;
}, 0);
console.log(JSON.stringify({
  seeds, finish, windows: search.length, distinctSequences: signatures.size, consecutiveRepeats: repeats,
  reading: { mean: mean(reading), shortest: Math.min(...reading) },
  selected: { ...selected, longestGap: Math.max(...gaps), meanGap: mean(gaps),
    groundPct: selected.ground / selected.meters * 100, roofPct: selected.roof / selected.meters * 100 },
  leastEffortFound: {
    windowsSolved: valid.length, retainedTerminalStates: search.reduce((sum, r) => sum + r.endStates, 0),
    totalInputs: valid.reduce((sum, r) => sum + r.inputs.length, 0),
    windowsRequiringMultipleInSearch: valid.filter(r => r.inputs.length > 1).length,
    zeroInputWindows: valid.filter(r => r.inputs.length === 0).length,
    longestGap: Math.max(...searchedGaps), meanGap: mean(searchedGaps),
    groundPct: valid.reduce((sum, r) => sum + r.ground, 0) / distance * 100,
    roofPct: valid.reduce((sum, r) => sum + r.roof, 0) / distance * 100,
    vertical: valid.reduce((sum, r) => sum + r.vertical, 0),
    transfers: valid.reduce((sum, r) => sum + r.transfers, 0),
  },
}, null, 2));
