import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../upstream/src/sim/sim';

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
