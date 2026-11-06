import test from 'node:test';
import assert from 'node:assert/strict';
import {FrameClock} from '../ciac/frame-clock';
import {crossingLane,occupiedLane} from '../upstream/src/ciac/physical-lane';
import {Sim} from '../upstream/src/sim/sim';
import {speedAt,laneX,trainLength} from '../upstream/src/config';
import {encounter} from '../upstream/src/ciac/encounters';

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
test('30 seeded maps: bounded gaps and physical encounter replays including roofs and slide',()=>{
 let over80=0,maxGap=0,encounters=0;
 for(let seed=1;seed<=30;seed++){
  const s=new Sim(seed);s.noSpawn=true;s.reset(seed,false);while(s.track.frontier<4000)s.track.ensure(4000);
  const specs=s.obs.map(o=>Sim.specOf(o)).filter(o=>o.d0<4000).sort((a,b)=>a.d0-b.d0);
  let end=40;for(const o of specs){const gap=o.d0-end;if(gap>80)over80++;maxGap=Math.max(maxGap,gap);end=Math.max(end,o.d1);assert.ok(s.track.course.allowsObstacle(o));}
  for(const ramp of specs.filter(o=>o.kind==='ramp')){
   const start=ramp.d0-24;
   for(const speed of [12,speedAt(start),27])replayEncounter(start,ramp.lane,speed);
   encounters++;
  }
 }
 console.log(JSON.stringify({seeds:30,meters:4000,previousOver80:688,over80,previousMaxGap:327.8027544445,maxGap,physicalEncounters:encounters}));
 assert.equal(over80,0);assert.ok(maxGap<80);assert.ok(encounters>700);
});

test('continuous seeded runs connect encounters through questions without teleports or invincibility',()=>{
 for(let seed=1;seed<=30;seed++){
  const s=new Sim(seed);s.noSpawn=true;s.reset(seed,false);while(s.track.frontier<4200)s.track.ensure(4200);
  const ramps=s.obs.filter(o=>o.kind==='ramp').map(o=>({start:o.d0-24,from:o.lane}));
  let jumpStart=-1,slideStart=-1;const clock=new FrameClock();let frames=0;s.start();
  while(s.d<4000&&s.alive&&frames++<100000){clock.advance(schedules[seed%schedules.length][frames%schedules[seed%schedules.length].length],dt=>{
   const block=ramps.find(r=>s.d<r.start+100&&s.d>=r.start-1) || (s.d<40?ramps[0]:null);
   if(block){const local=s.d-block.start;
    if(local<24&&s.lane!==block.from){s.lane<block.from?s.right():s.left();}
    if(local>=36&&jumpStart!==block.start){s.jump();block.from===0?s.right():s.left();jumpStart=block.start;}
    if(local>=82-s.speed*.2&&slideStart!==block.start){s.down();slideStart=block.start;}
   }
   s.questionGate=180+Math.max(0,Math.ceil((s.d-180)/150))*150;
   s.update(dt);
  });}
  assert.ok(s.alive&&s.d>=4000,JSON.stringify({seed,snapshot:s.snapshot()}));
 }
});

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
