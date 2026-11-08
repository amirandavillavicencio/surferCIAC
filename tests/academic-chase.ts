import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../upstream/src/sim/sim';
import {ChaseState} from '../upstream/src/ciac/chase';
import {trafficKind} from '../upstream/src/ciac/encounters';

test('academic danger responds to verified answers and resets on a new run',()=>{
 const chase=new ChaseState();
 assert.equal(chase.danger,0);
 assert.equal(chase.answer(false),1);
 assert.equal(chase.answer(false),2);
 assert.equal(chase.answer(true),1);
 for(let i=0;i<7;i++)chase.answer(false);
 assert.equal(chase.danger,4);
 chase.reset();
 assert.equal(chase.danger,0);
 assert.equal(chase.answer(true),0);
});

test('four wrong answers lead to the real simulator caught event',()=>{
 const sim=new Sim(4);
 sim.noSpawn=true;sim.reset(4,false);sim.clearWorld();sim.start();
 const chase=new ChaseState();
 for(let i=0;i<4;i++)chase.answer(false);
 for(let i=0;i<180&&chase.current.mode!=='captured';i++){
   sim.update(1/120);
   chase.observe(sim,1/120,sim.drainEvents());
 }
 assert.equal(chase.current.mode,'captured');
 sim.caughtByGuard();
 assert.equal(sim.alive,false);
 const crashes=sim.drainEvents().filter(e=>e.type==='crash');
 assert.equal(crashes.length,1);
 assert.equal((crashes[0] as any).kind,'caught');
 sim.caughtByGuard();
 assert.equal(sim.drainEvents().length,0);
});

test('stumble pressure can be reduced with a correct academic answer',()=>{
 const sim=new Sim(5);sim.noSpawn=true;sim.reset(5,false);sim.clearWorld();sim.start();
 const chase=new ChaseState();
 chase.observe(sim,1/60,[{type:'stumble',x:0,y:0}]);
 assert.equal(chase.danger,1);
 chase.answer(true);
 assert.equal(chase.danger,0);
});

test('later traffic includes more double-train encounter families and recovery',()=>{
 const earlier=Array.from({length:20},(_,i)=>trafficKind(i,500));
 const later=Array.from({length:20},(_,i)=>trafficKind(i,1600));
 assert.ok(later.filter(x=>x==='double').length>earlier.filter(x=>x==='double').length);
 assert.ok(later.includes('recovery'));
});

test('academic shield absorbs one stumble and expires after 150 metres or restart',()=>{
 const chase=new ChaseState();
 chase.grantShield(200);
 assert.equal(chase.absorbStumble(349),true);
 assert.equal(chase.absorbStumble(349),false);
 chase.grantShield(200);
 assert.equal(chase.absorbStumble(350),false);
 chase.grantShield(400);
 chase.reset();
 assert.equal(chase.hasShield(0),false);
});

import { MISSIONS, RunMissions } from '../upstream/src/ciac/missions';
import { GAMEPLAY_CUES, playGameplayCue } from '../upstream/src/ciac/gameplay-audio';

test('per-run missions track the best clean segment, verified streaks and actual recovery', () => {
  let missions = new RunMissions();
  missions.advance(125, true);
  missions.advance(324.99, false);
  assert.equal(missions.progress[3], 199);
  missions.advance(325, false);
  const changes = [0, -1, 0, -1, 0, 0];
  const rewards = changes.map((change, index) => missions.answer(true, 100 * (index + 1), change));
  assert.deepEqual(rewards.map(reward => reward.earned), changes.map(() => 100));
  assert.deepEqual(rewards.map(reward => reward.shield), [false, false, true, false, false, false]);
  assert.deepEqual(rewards.map(reward => reward.bonus), [0, 0, 0, 0, 100, 0]);
  assert.ok(MISSIONS.every((mission, index) => missions.progress[index] >= mission.goal));
  missions.answer(false, 600, 1);
  assert.equal(missions.streak, 0);
  assert.equal(missions.progress[2], 2);
  missions = new RunMissions();
  assert.deepEqual(missions.progress, [0, 0, 0, 0]);
});

test('gameplay cues only schedule audio on an unlocked and unmuted context', () => {
  const notes: number[] = [];
  const play = (frequency: number) => notes.push(frequency);
  for (const state of [undefined, 'suspended', 'interrupted', 'closed']) {
    playGameplayCue(state, false, 'correct', play);
  }
  playGameplayCue('running', true, 'correct', play);
  assert.deepEqual(notes, []);
  playGameplayCue('running', false, 'correct', play);
  assert.deepEqual(notes, [...GAMEPLAY_CUES.correct]);
  assert.equal(new Set(Object.values(GAMEPLAY_CUES).map(notes => notes.join(','))).size, 7);
});

test('guard closes progressively as danger rises and drops back after recovery', () => {
  const sim = new Sim(4);
  sim.noSpawn = true;
  sim.reset(4, false);
  sim.clearWorld();
  sim.start();
  const chase = new ChaseState();
  const advance = (frames: number) => {
    for (let i = 0; i < frames; i++) {
      const gap = chase.current.gap;
      sim.update(1 / 120);
      chase.observe(sim, 1 / 120, sim.drainEvents());
      assert.ok(Math.abs(chase.current.gap - gap) < .2);
    }
    return chase.current.gap;
  };
  let gap = advance(1800);
  for (let danger = 1; danger <= 3; danger++) {
    chase.answer(false);
    const next = advance(720);
    assert.ok(next < gap);
    gap = next;
  }
  chase.answer(true);
  assert.ok(advance(720) > gap);
});

test('guard is suppressed where a train intersects its path but remains visible on the roof', () => {
  const sim = new Sim(4);
  sim.noSpawn = true;
  sim.reset(4, false);
  sim.clearWorld();
  sim.start();
  const chase = new ChaseState();
  sim.addOb({ kind: 'train', lane: 1, d0: 0, d1: 26, cars: 2 });
  sim.d = 12;
  chase.observe(sim, 1 / 120, []);
  assert.equal(chase.current.visible, false);
  const roof = new ChaseState();
  sim.d = 4;
  sim.y = sim.groundY = 3.4;
  roof.observe(sim, 1 / 120, []);
  sim.d = 12;
  roof.observe(sim, 1 / 120, []);
  assert.equal(roof.current.visible, true);
});

import { ACADEMIC_POWERS, powerForCorrectAnswer } from '../upstream/src/ciac/academic-powerups';
import { POWER_TIME } from '../upstream/src/config';

test('cada respuesta correcta validada entrega uno de los tres poderes en rotación', () => {
  const missions = new RunMissions();
  const received: string[] = [];
  for (let n = 1; n <= 9; n++) {
    missions.answer(true, n * 100, 0);
    received.push(powerForCorrectAnswer(missions.correct));
  }
  assert.deepEqual(received, [...ACADEMIC_POWERS, ...ACADEMIC_POWERS, ...ACADEMIC_POWERS]);
  missions.answer(false, 900, 1);
  assert.equal(missions.correct, 9, 'una respuesta incorrecta no entrega un nuevo premio');
  missions.answer(true, 1000, -1);
  assert.equal(powerForCorrectAnswer(missions.correct), 'magnet');
  assert.throws(() => powerForCorrectAnswer(0), RangeError);
  for (const kind of ACADEMIC_POWERS) assert.ok(POWER_TIME[kind] > 0);
});

test('no aparecen power-ups en vías: trenes y rampas mantienen su generación', () => {
  let trains = 0, ramps = 0, moving = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const sim = new Sim(seed);
    sim.noSpawn = true;
    sim.reset(seed, false);
    while (sim.track.frontier < 3040) sim.track.ensure(3040);
    assert.equal(sim.powers.length, 0, 'no se generan power-ups sueltos');
    assert.equal(sim.created.powers, 0, 'ningún premio de la pista se crea');
    trains += sim.obs.filter(ob => ob.kind === 'train').length;
    ramps += sim.obs.filter(ob => ob.kind === 'ramp').length;
    moving += sim.obs.filter(ob => ob.kind === 'mtrain').length;
  }
  assert.ok(trains > 2000 && ramps > 200 && moving > 100,
    'las secuencias y los trenes en movimiento continúan presentes');
});

test('los poderes académicos se activan con los tiempos existentes de la simulación', () => {
  const sim = new Sim();
  sim.noSpawn = true;
  sim.reset(1, false);
  sim.clearWorld();
  sim.start();
  for (const kind of ACADEMIC_POWERS) {
    sim.power[kind] = POWER_TIME[kind];
    assert.equal(sim.power[kind], POWER_TIME[kind]);
  }
  sim.update(1 / 120);
  for (const kind of ACADEMIC_POWERS) {
    assert.ok(sim.power[kind] > 0 && sim.power[kind] < POWER_TIME[kind]);
  }
});
