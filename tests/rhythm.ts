import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../upstream/src/sim/sim';
import { searchEncounter } from './minimum-effort';

test('the opening barrier requires action and leaves two real ways through', () => {
  for (const seed of [1, 2]) {
    for (const action of ['none', 'jump', 'lane'] as const) {
      const sim = new Sim(seed);
      sim.noSpawn = true;
      sim.reset(seed, false);
      sim.start();
      let acted = false;
      while (sim.alive && sim.d < 34) {
        if (action !== 'none' && !acted && sim.d >= 24 - sim.speed * .23) {
          if (action === 'jump') sim.jump();
          else if (seed % 2 === 0) sim.right();
          else sim.left();
          acted = true;
        }
        sim.update(1 / 120);
      }
      assert.equal(sim.alive, action !== 'none', `${seed}: ${action}`);
    }
  }
});

test('bounded search finds a clean route and detects passive bypasses', () => {
  for (const start of [40, 190, 340]) {
    const sim = new Sim(1);
    sim.noSpawn = true;
    sim.reset(1, false);
    sim.track.ensure(start + 150);
    const specs = sim.obs.map(Sim.specOf).filter(s => s.d0 >= start && s.d0 < start + 150);
    const result = searchEncounter(specs, start, start + 150, start + 140);
    assert.ok(result.best, 'the simulated route must survive the encounter');
    assert.ok(result.best.inputs.length >= 2);
    const times = [0, ...result.best.inputs.map(input => input.time), result.best.state.time];
    assert.ok(Math.max(...times.slice(1).map((time, i) => time - times[i])) <= 6);
  }
  const empty = searchEncounter([], 40, 190, 180);
  assert.equal(empty.best?.inputs.length, 0);
});
