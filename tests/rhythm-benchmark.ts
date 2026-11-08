import { Sim } from '../upstream/src/sim/sim';
import { driveTraffic, plansOf } from './traffic-controller';

const seeds = 30;
const finish = 4000;
const actions = { lane: 0, jump: 0, slide: 0 };
const gaps: number[] = [];
const reading: number[] = [];
const obstacleKinds: Record<string, number> = {};
const signatures = new Set<string>();
let consecutiveRepeats = 0, successful = 0, meters = 0, completedEncounters = 0, encounters = 0;

for (let seed = 1; seed <= seeds; seed++) {
  const sim = new Sim(seed);
  sim.noSpawn = true;
  sim.reset(seed, false);
  while (sim.track.frontier < finish + 200) sim.track.ensure(finish + 200);
  const plans = plansOf(sim);
  const fullPlans = plans.filter(plan => plan.start + 110 < finish);
  for (const o of sim.obs) {
    const spec = Sim.specOf(o);
    if (spec.d0 < finish) obstacleKinds[spec.kind] = (obstacleKinds[spec.kind] ?? 0) + 1;
  }
  let previous = '';
  for (const plan of fullPlans) {
    const signature = sim.obs.filter(o => {
      const d = Sim.specOf(o).d0;
      return d >= plan.start && d < plan.start + 100;
    }).map(o => o.kind + ':' + o.lane).sort().join(',');
    signatures.add(signature);
    if (signature === previous) consecutiveRepeats++;
    previous = signature;
  }
  sim.start();
  let gate = 180, lastAction = 0, readStart = -1;
  while (sim.d < finish && sim.alive) {
    const lane = sim.lane, slide = sim.slideT, wasGrounded = sim.grounded;
    driveTraffic(sim, plans);
    sim.questionGate = gate;
    if (sim.d >= gate - 40 && readStart < 0) readStart = sim.time;
    sim.update(1 / 120);
    const changed = sim.lane !== lane;
    const jumped = wasGrounded && sim.vy > 0 && !sim.grounded;
    const slid = sim.slideT > slide;
    if (changed || jumped || slid) {
      actions.lane += Number(changed);
      actions.jump += Number(jumped);
      actions.slide += Number(slid);
      gaps.push(sim.time - lastAction);
      lastAction = sim.time;
    }
    if (sim.d >= gate) {
      reading.push(sim.time - readStart);
      gaps.push(sim.time - lastAction);
      lastAction = sim.time;
      gate += 150;
      readStart = -1;
    }
  }
  gaps.push(sim.time - lastAction);
  meters += sim.d;
  encounters += fullPlans.length;
  completedEncounters += fullPlans.filter(plan => sim.d >= plan.start + 110).length;
  successful += Number(sim.alive && sim.d >= finish);
}
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
console.log(JSON.stringify({
  seeds, successful, meters, encounters, completedEncounters, actions, obstacleKinds,
  distinctSignatures: signatures.size, consecutiveRepeats,
  meanActionGap: mean(gaps), longestActionGap: Math.max(...gaps),
  meanReading: mean(reading), shortestReading: Math.min(...reading),
}, null, 2));
