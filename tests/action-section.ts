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

test('integrated section has A/B/C once, varied decisions, then returns to normal generation',()=>{
 const signatures=new Set<string>();const durations:number[]=[];
 for(let seed=1;seed<=12;seed++)for(const tutorial of [false,true]) {
  const s=new Sim(seed);s.noSpawn=true;s.reset(seed,tutorial);while(s.track.frontier<1300)s.track.ensure(1300);
  const plans=plansOf(s),action=plans.filter(p=>p.beat);
  assert.deepEqual(action.map(p=>p.beat),['A','B','C']);assert.equal(action.length,3);
  assert.ok(plans.some(p=>!p.beat&&p.start>action[2].start));
  for(const p of action)if(p.beat==='A')p.lateEvade=true;
  signatures.add(JSON.stringify(action.map(p=>({from:p.from,variant:p.variant}))));
  // Tutorial remains intact; take the outer lane around its introductory obstacles.
  s.start();let entered=-1;let guard=0;
  while(s.d<action[0].start+400&&s.alive&&guard++<20000) {
   if(tutorial&&s.d<280){if(s.lane!==2)s.right();}
   else driveTraffic(s,plans);
   s.questionGate=180+Math.max(0,Math.ceil((s.d-180)/150))*150;
   s.update(1/120);if(entered<0&&s.d>=action[0].start)entered=s.time;
  }
  assert.ok(s.alive,JSON.stringify({seed,tutorial,state:s.snapshot()}));
  const duration=s.time-entered;assert.ok(duration>=23&&duration<=36,`section duration ${duration}`);durations.push(duration);
 }
 assert.ok(signatures.size>8);
 console.log(JSON.stringify({sectionReplays:24,uniqueVariants:signatures.size,durationMin:Math.min(...durations),durationMax:Math.max(...durations)}));
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
