import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../upstream/src/sim/sim';
import { RaceDirector } from '../upstream/src/ciac/rhythm';

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


test('director chooses varied active encounters instead of passive recovery', () => {
  const director = new RaceDirector();
  let previous = '';
  for (let i = 0; i < 40; i++) {
    const kind = director.choose(i, 40 + 150 * i, i % 3, i % 4 === 0);
    assert.ok(kind !== 'pass' && kind !== 'recovery', `passive encounter at ${i}: ${kind}`);
    assert.notEqual(kind, previous);
    director.remember(kind);
    previous = kind;
  }
});
