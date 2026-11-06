import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../upstream/src/sim/sim';
import {Presentation} from '../upstream/src/ciac/presentation';
import {FrameClock} from '../ciac/frame-clock';

test('all visual positions share an interpolated timestamp without modifying physics',()=>{
 const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();s.speedOverride=12;
 const train=s.addOb({kind:'mtrain',lane:2,d0:16,d1:85,activation:0,trainSpeed:60,cars:4});
 const p=new Presentation(s);const clock=new FrameClock();let elapsed=0;let previous=-1;let observations=0;
 for(const dt of [.002,.004,.018,.011,.035,.006,.027,.01,.045,.001]){
  elapsed+=dt;const alpha=clock.advance(dt,h=>{s.update(h);p.capture(s,h,s.drainEvents());});
  const before=JSON.stringify({snapshot:s.snapshot(),train:{...train}});
  const frame=p.sample(alpha);
  assert.ok(frame.time>=previous);previous=frame.time;
  assert.ok(Math.abs(frame.sim.d-12*frame.time)<1e-8);
  const visible=frame.sim.obs.find(o=>o.id===train.id)!;
  assert.ok(Math.abs(visible.d0-(218-60*frame.time))<1e-8);
  assert.ok(Math.abs((frame.sim.d-visible.d0)-(72*frame.time-218))<1e-8);
  assert.equal(JSON.stringify({snapshot:s.snapshot(),train:{...train}}),before);
  if(frame.time>0)observations++;
 }
 assert.ok(observations>5&&elapsed>0);
});

test('input animation events are delivered once at their physical phase, with monotonic resume',()=>{
 const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();
 const p=new Presentation(s);s.jump();s.update(1/120);p.capture(s,1/120,s.drainEvents());
 const frame=p.sample(.5);assert.equal(frame.sim.grounded,false);assert.equal(frame.events.filter(e=>e.type==='jump').length,1);
 assert.equal(p.sample(.6).events.length,0);
 const shown=p.sample(.8);const resume=p.sample(0);assert.equal(resume.time,shown.time);assert.equal(resume.dt,0);
 const physical=s.snapshot();p.reset(s);assert.deepEqual(s.snapshot(),physical);
});

test('visual support never floats between roof and ground at an interpolated edge',()=>{
 const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();s.speedOverride=12;
 s.addOb({kind:'train',lane:1,d0:0,d1:20.82,cars:3});s.d=20.95;s.y=s.groundY=3.4;
 const p=new Presentation(s);s.update(1/120);p.capture(s,1/120,s.drainEvents());
 for(const alpha of [.1,.3,.5,.7,.9])assert.ok([0,3.4].includes(p.sample(alpha).sim.groundY));
});
