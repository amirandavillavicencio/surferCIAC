import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../upstream/src/sim/sim';
import {actionEncounter,actionShift} from '../upstream/src/ciac/action-section';
import {plansOf,driveTraffic} from './traffic-controller';

test('A/B/C variants are physically playable with real two-gesture roof transfers',()=>{
 let cases=0;
 for(const beat of ['A','B','C'] as const)for(const variant of [0,1,2,3,4,5])for(const from of [0,2])for(const speed of [12,15,27]) {
  const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();s.d=20;s.speedOverride=speed;
  for(const spec of actionEncounter(40,from,beat,variant))s.addOb(spec);
  const plans=[{start:40,from,kind:beat==='A'?'dodge':beat==='B'?'transfer':'double',beat,variant}];
  let roofTransfer=false;
  while(s.d<150&&s.alive){driveTraffic(s,plans);s.update(1/120);if(beat==='B'&&s.grounded&&s.groundY>3&&s.lane===2-from)roofTransfer=true;}
  assert.ok(s.alive&&s.d>=150,JSON.stringify({beat,variant,from,speed,state:s.snapshot()}));
  if(beat==='B')assert.ok(roofTransfer,'a real landing on the other outer roof must occur');
  cases++;
 }
 console.log(JSON.stringify({actionVariants:cases}));
});

test('normal generation varies connected roof and ground sequences after either start', () => {
 const signatures = new Set<string>();
 for (let seed = 1; seed <= 12; seed++) for (const tutorial of [false, true]) {
  const sim = new Sim(seed);
  sim.noSpawn = true;
  sim.reset(seed, tutorial);
  sim.track.ensure(1300);
  const plans = plansOf(sim);
  assert.ok(plans.some(p => p.kind === 'railway'));
  assert.ok(plans.some(p => p.kind === 'evasion'));
  signatures.add(plans.map(p => p.from).join(''));
 }
 assert.ok(signatures.size > 8);
});

test('wrong decisions collide and alternative routes remain controllable',()=>{
 // Ignoring the oncoming train must fail; no automatic dodge is permitted.
 const wrong=new Sim();wrong.noSpawn=true;wrong.reset(1,false);wrong.clearWorld();wrong.start();wrong.d=20;wrong.speedOverride=12;
 for(const spec of actionEncounter(40,0,'A',1))wrong.addOb(spec);
 while(wrong.alive&&wrong.d<140)wrong.update(1/120);
 assert.equal(wrong.alive,false);assert.ok(wrong.drainEvents().some(e=>e.type==='crash'&&e.kind==='mtrain'));
 // B can be completed by staying on the source roof and taking its natural drop.
 const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();s.d=20;s.speedOverride=15;
 for(const spec of actionEncounter(40,0,'B',2))s.addOb(spec);
 let roof=false,groundAfter=false;
 while(s.d<150&&s.alive){if(s.d>=52&&s.lane!==0)s.left();s.update(1/120);if(s.groundY>3)roof=true;if(roof&&s.y===0)groundAfter=true;}
 assert.ok(s.alive&&roof&&groundAfter);
 // A's alternative outer lane sacrifices the intended coin route, without a forced action.
 const alt=new Sim();alt.noSpawn=true;alt.reset(1,false);alt.clearWorld();alt.start();alt.d=20;alt.speedOverride=15;
 for(const spec of actionEncounter(40,0,'A',3))alt.addOb(spec);
 while(alt.d<150&&alt.alive){if(alt.d>=52&&alt.lane!==2)alt.right();alt.update(1/120);}
 assert.ok(alt.alive);
 assert.notEqual(actionShift(0),actionShift(2));
});
