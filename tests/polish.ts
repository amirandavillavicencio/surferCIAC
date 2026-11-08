import { driveTraffic } from './traffic-controller';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FrameClock} from '../ciac/frame-clock';
import {crossingLane,occupiedLane} from '../upstream/src/ciac/physical-lane';
import {Sim} from '../upstream/src/sim/sim';
import {speedAt,laneX,trainLength} from '../upstream/src/config';
import {encounter,trafficEncounter} from '../upstream/src/ciac/encounters';

const schedules=[[1/15],[1/20],[1/30],[1/60],[.01,.08,.025,.12, .015]];
test('fixed clock: identical physics, pace, jumps and slides at 15/20/30/60 FPS and jitter',()=>{
 const outcomes=[];
 for(const schedule of schedules){
  const s=new Sim();s.noSpawn=true;s.reset(7,false);s.start();s.pace.penalize(3);
  const clock=new FrameClock();let wall=0,frame=0,steps=0,peak=0;const transitions:string[]=[];
  while(wall<8-1e-9){const elapsed=Math.min(schedule[frame++%schedule.length],8-wall);wall+=elapsed;
   clock.advance(elapsed,dt=>{if(steps===60)s.jump();if(steps===180)s.down();s.update(dt);peak=Math.max(peak,s.y);for(const e of s.drainEvents())if(['jump','land','slide'].includes(e.type))transitions.push(e.type);steps++;});
  }
  assert.equal(steps,960);assert.equal(clock.dropped,0);
  outcomes.push({d:s.d,y:s.y,vy:s.vy,penalty:s.pace.penaltyRemaining,factor:s.pace.factor,peak,transitions});
 }
 for(const result of outcomes)assert.deepEqual(result,outcomes[0]);
 const c=new FrameClock();let n=0;c.advance(10,()=>n++);assert.equal(n,24);assert.ok(c.dropped>=9.5);c.reset();assert.equal(c.advance(0,()=>n++),0);
});

test('crossing selects physical lane during changes and reversals 0–150ms before gate',()=>{
 let cases=0;
 for(const fps of [15,20,30,60])for(const speed of [12,20,27])for(const lead of [0,8,16,25,50,75,100,125,150])for(const reverse of [false,true]){
  const s=new Sim();s.noSpawn=true;s.reset(1,false);s.start();s.speedOverride=speed;
  const gate=12;const trigger=gate-speed*lead/1000;const clock=new FrameClock();let moved=false,reversed=false,answer=-1,crossX=0;
  while(s.d<gate){clock.advance(1/fps,dt=>{
   if(s.d>=gate)return;
   if(!moved&&s.d>=trigger){s.right();moved=true;}
   if(reverse&&moved&&!reversed&&s.d>=trigger+speed*.025){s.left();reversed=true;}
   const before={d:s.d,x:s.x};s.update(dt);
   if(before.d<gate&&s.d>=gate){answer=crossingLane(before,s,gate);const t=(gate-before.d)/(s.d-before.d);crossX=before.x+(s.x-before.x)*t;}
  });}
  assert.equal(answer,crossX<1.25?1:2);assert.equal(occupiedLane(crossX),answer);cases++;
 }
 console.log(JSON.stringify({physicalCrossingCases:cases}));
});

function replayEncounter(start:number,from:number,speed:number){
 const s=new Sim();s.noSpawn=true;s.reset(3,false);s.clearWorld();s.d=start;s.speedOverride=speed;s.start();
 for(const spec of encounter(start,from))s.addOb(spec);
 // The approach affords >1s at maximum speed before the ramp.
 s.x=laneX(from);s.lane=from;s.laneT=1;
 let jumped=false,slid=false,onRoof=false,transfer=false,landed=false;
 for(let n=0;s.d<start+99&&n<10000;n++){
  if(!jumped&&s.d>=start+36){s.jump();from===0?s.right():s.left();jumped=true;}
  if(!slid&&s.d>=start+82-speed*.2){s.down();slid=true;}
  s.update(1/120);
  if(s.groundY>3.3)onRoof=true;
  if(jumped&&s.grounded&&s.lane===1&&s.groundY>3.3)transfer=true;
  if(transfer&&s.grounded&&s.y===0)landed=true;
  assert.ok(s.alive,JSON.stringify({start,from,speed,snapshot:s.snapshot()}));
 }
 assert.ok(onRoof&&transfer&&landed&&slid,'ramp, roof jump, landing and slide must execute');
}
test('rapid lateral chains keep travel speed bounded and buffered jumps fire on landing',()=>{
 const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();s.lane=0;s.x=-2.5;
 s.right();let peakSpeed=0;
 for(let i=0;i<50;i++){
  if(i===2)s.right();if(i===6)s.left();if(i===8)s.right();
  const x=s.x;s.update(1/120);peakSpeed=Math.max(peakSpeed,Math.abs(s.x-x)*120);
 }
 assert.ok(peakSpeed<=50,`lateral speed ${peakSpeed}`);assert.equal(s.lane,2);assert.equal(s.x,2.5);
 s.jump();let buffered=false,secondJump=false;
 for(let i=0;i<200;i++){
  if(!buffered&&s.vy<0&&s.y<.25){s.jump();buffered=true;}
  s.update(1/120);const events=s.drainEvents();
  if(buffered&&events.some(e=>e.type==='land')&&events.some(e=>e.type==='jump')){secondJump=true;break;}
 }
 assert.ok(secondJump);assert.ok(s.vy>0&&!s.grounded);
});

test('encounters alternate recovery and challenge without losing the elevated route',()=>{
 const rest=encounter(40,0,'rest'),flow=encounter(190,2,'flow'),hard=encounter(1090,0,'challenge');
 assert.ok(rest.length<flow.length);assert.ok(!rest.some(s=>s.kind==='mtrain'));
 assert.ok(flow.some(s=>s.kind==='mtrain'));assert.ok(hard.some(s=>s.kind==='train'&&s.d0===1098));
 for(const specs of [rest,flow,hard])assert.equal(specs.filter(s=>s.kind==='ramp').length,1);
});

test('timed vehicles keep their own speed through penalties, pause and replay schedules',()=>{
 const results=[];
 for(const schedule of schedules){
  const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.invincible=true;s.speedOverride=12;s.start();
  const vehicle=s.addOb({kind:'mtrain',lane:0,d0:16,d1:85,activation:0,trainSpeed:56,cars:4});
  const clock=new FrameClock();let wall=0,i=0;
  while(wall<3-1e-9){const elapsed=Math.min(schedule[i++%schedule.length],3-wall);wall+=elapsed;clock.advance(elapsed,dt=>s.update(dt));}
  assert.ok(Math.abs(vehicle.d0-(218-56*3))<1e-8);
  const before=vehicle.d0;clock.advance(0,dt=>s.update(dt));assert.equal(vehicle.d0,before);
  results.push({front:vehicle.d0,time:vehicle.travelTime,d:s.d});
 }
 for(const x of results)assert.deepEqual(x,results[0]);
 const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();s.pace.penalize(3);
 const vehicle=s.addOb({kind:'mtrain',lane:0,d0:16,d1:85,activation:0,trainSpeed:64,cars:3});
 s.update(.05);const before=vehicle.d0;s.update(.05);
 assert.ok(Math.abs(vehicle.d0-before+64*.05)<1e-8);assert.ok(s.speed<12);
});

test('every traffic family has a physical route and a human anticipation window',()=>{
 const families=['pass','dodge','double','roof-traffic','transfer','recovery'] as const;
 for(const kind of families)for(const from of [0,2])for(const variant of [0,1,2,3,4])for(const speed of [6,12,20,27]) {
  const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.speedOverride=speed;s.start();s.d=20;
  for(const spec of trafficEncounter(40,from,kind,variant))s.addOb(spec);
  const plan=[{start:40,from,kind,variant}];let steps=0;
  while(s.d<150&&s.alive&&steps++<10000){driveTraffic(s,plan);s.update(1/120);}
  assert.ok(s.alive&&s.d>=150,JSON.stringify({kind,from,variant,speed,state:s.snapshot()}));
  for(const vehicle of trafficEncounter(40,from,kind,variant).filter(o=>o.trainSpeed)){
   assert.ok(218/(27+vehicle.trainSpeed!)>2.2,'more than two seconds from horizon to contact');
   assert.ok(27*(218+trainLength(vehicle.cars!))/(27+vehicle.trainSpeed!)<vehicle.d1-40,'tail clears its reserved collision envelope');
  }
 }
 console.log(JSON.stringify({trafficFamilies:6,physicalScenarios:240,minimumAnticipationSeconds:218/(27+68)}));
});

test('traffic rhythm varies oncoming speed and makes reverse dodges physically playable',()=>{
 for(const variant of [0,1,2,3]){
  const pass=trafficEncounter(40,0,'pass',variant).filter(s=>s.kind==='mtrain');
  assert.equal(pass.length,1,'recovery lanes must stay open between encounters');
  assert.equal(pass[0].lane,2);
  const next=trafficEncounter(40,0,'pass',variant+1).find(s=>s.kind==='mtrain')!;
  assert.notEqual(pass[0].trainSpeed,next.trainSpeed);
  const double=trafficEncounter(40,0,'double',variant).filter(s=>s.kind==='mtrain');
  assert.equal(double.length,2);
  assert.notEqual(double[0].trainSpeed,double[1].trainSpeed);
  const dodge=trafficEncounter(40,0,'dodge',variant);
  const middle=dodge.find(s=>s.d0===92)!;
  const exit=dodge.find(s=>s.d0===122)!;
  assert.equal(middle.kind,variant%2===1?'overhead':'low');
  assert.equal(exit.kind,variant%2===1?'low':'overhead');
  for(const speed of [12,20,27]){
   const sim=new Sim();sim.noSpawn=true;sim.reset(1,false);sim.clearWorld();sim.d=20;sim.speedOverride=speed;sim.start();
   for(const spec of dodge)sim.addOb(spec);
   const plan=[{start:40,from:0,kind:'dodge',variant}];
   let frames=0;
   while(sim.d<150&&sim.alive&&frames++<16000){driveTraffic(sim,plan);sim.update(1/120);}
   assert.ok(sim.alive&&sim.d>=150,JSON.stringify({variant,speed,state:sim.snapshot()}));
  }
 }
});
