import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../upstream/src/sim/sim';
import { laneX } from '../upstream/src/config';
import { decisionSection } from '../upstream/src/ciac/rhythm';
import { verifyDecisionRun } from './decision-run';

test('complete sections preserve quiz reservations and block each standing ground approach', () => {
  const sim = new Sim();
  const signatures = new Set<string>();
  for (let variant = 0; variant < 36; variant++) {
    for (const ramp of [0, 1, 2]) {
      for (const offset of [1, 2]) {
        const landing = (ramp + offset) % 3;
        const section = decisionSection(190, ramp, landing, variant);
        assert.ok(section.specs.every(spec => sim.track.course.allowsObstacle(spec)));
        signatures.add(JSON.stringify(section.specs));
        for (const lane of [0, 1, 2]) {
          sim.noSpawn = true;
          sim.reset(1, false);
          sim.clearWorld();
          sim.d = 180;
          sim.x = laneX(lane);
          sim.lane = lane;
          sim.start();
          section.specs.forEach(spec => sim.addOb(spec));
          while (sim.alive && sim.d < 210) sim.update(1 / 120);
          assert.equal(sim.alive, false, JSON.stringify({variant, ramp, landing, lane}));
        }
      }
    }
  }
  assert.ok(signatures.size > 50);
});

test('30 seeds reach 4000 m with real inputs, roof landings and quiz slowdown', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const run = verifyDecisionRun(seed, 4000, seed % 2 === 0, seed % 3 === 0);
    assert.ok(run.roofJumps >= 20, JSON.stringify({seed, run}));
  }
});

test('when reading slots are disabled the generator fills them with playable decisions', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const sim = new Sim(seed);
    sim.track.course.reset(false);
    sim.reset(seed, false);
    for (const distance of [147, 170]) {
      assert.equal(sim.obs.filter(ob => ob.d0 === distance).length, 3);
    }
    assert.ok(verifyDecisionRun(seed, 4000, false, false, false).roofJumps >= 20);
  }
});

test('oncoming trains occupy 75% of eligible sections while tutorial stays clear', () => {
  const variants = Array.from({ length: 36 }, (_, variant) => variant);
  const moving = variants.filter(variant =>
    decisionSection(300, 0, 1, variant).specs.some(spec => spec.kind === 'mtrain')
  );
  assert.equal(moving.length, 27);
  assert.ok(variants.every(variant =>
    decisionSection(150, 0, 1, variant).specs.every(spec => spec.kind !== 'mtrain')
  ));
  for (const variant of moving) {
    const specs = decisionSection(300, 0, 1, variant).specs;
    assert.equal(specs.filter(spec => spec.kind === 'mtrain').length, 1);
    assert.ok(specs.some(spec => spec.kind === 'ramp'));
    assert.ok(specs.some(spec => spec.kind === 'train' && spec.lane === 0));
    assert.ok(specs.some(spec => spec.kind === 'train' && spec.lane === 1));
  }
});
