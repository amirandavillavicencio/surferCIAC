import { Sim } from '../upstream/src/sim/sim';
import { decisionPilot } from './decision-pilot';

export function verifyDecisionRun(seed: number, finish: number, tutorial = false, penalized = false) {
  const sim = new Sim(seed);
  sim.reset(seed, tutorial);
  sim.start();
  let gate = 180;
  let roofTime = 0;
  let roofJumps = 0;
  let jumpFrom = -1;
  for (let step = 0; sim.alive && sim.d < finish && step < 150000; step++) {
    sim.questionGate = gate;
    decisionPilot(sim, input => {
      if (input === 'jump' && sim.groundY > 3) jumpFrom = sim.lane;
      sim[input]();
    });
    sim.update(1 / 120);
    const events = sim.drainEvents();
    if (events.some(event => event.type === 'stumble')) throw new Error(JSON.stringify({seed, tutorial, penalized, stumble: sim.snapshot()}));
    if (sim.groundY > 3 && sim.grounded) {
      roofTime += 1 / 120;
      if (jumpFrom >= 0 && jumpFrom !== sim.lane) {
        roofJumps++;
        jumpFrom = -1;
      }
    }
    if (sim.d >= gate) {
      gate += 150;
      if (penalized) sim.pace.penalize(3);
    }
  }
  if (!sim.alive || sim.d < finish) throw new Error(JSON.stringify({seed, tutorial, penalized, crash: sim.snapshot(), obs: sim.obs.filter(o => Math.abs(o.d0-sim.d)<3)}));
  return {roofJumps, roofTime, time: sim.time};
}
