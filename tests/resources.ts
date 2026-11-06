import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../upstream/src/sim/sim';
import {ChaseState} from '../upstream/src/ciac/chase';
import {FrameClock} from '../ciac/frame-clock';
import {trainDetailPrototype} from '../upstream/src/ciac/rail-art';
import * as THREE from '../upstream/node_modules/three';

test('chase observes real stumbles/capture and never turns an academic slowdown into defeat',()=>{
 const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();const c=new ChaseState();
 const step=(n:number)=>{for(let i=0;i<n;i++){s.update(1/120);c.observe(s,1/120,s.drainEvents());}};
 step(300);assert.equal(c.current.mode,'intro');assert.ok(c.current.gap<2.5);
 step(700);assert.equal(c.current.mode,'distant');const oldGap=c.current.gap;
 s.pace.penalize(3);step(360);assert.ok(s.alive);assert.equal(c.current.mode,'distant');assert.ok(c.current.gap>=oldGap);
 s.addOb({kind:'train',lane:2,d0:s.d-2,d1:s.d+30,cars:4});
 s.right();step(40);assert.ok(s.alive);assert.equal(c.current.mode,'stumble');
 s.right();step(40);assert.equal(s.alive,false);assert.ok(['catching','captured'].includes(c.current.mode));
 step(180);assert.equal(c.current.mode,'captured');assert.ok(c.current.gap<.76);
 c.reset();s.reset(2,false);assert.equal(c.current.mode,'hidden');assert.equal(c.current.phase,0);
});

test('guard cadence and pursuit state are deterministic across regular and irregular frame intervals',()=>{
 const results=[];
 for(const schedule of [[1/15],[1/30],[1/60],[.002,.012,.044,.08,.005]]){
  const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();const c=new ChaseState(),clock=new FrameClock();let wall=0,i=0;
  while(wall<10-1e-9){const dt=Math.min(schedule[i++%schedule.length],10-wall);wall+=dt;const alpha=clock.advance(dt,h=>{s.update(h);c.observe(s,h,s.drainEvents());});c.sample(alpha);}
  results.push({...c.current});
 }
 for(const result of results)assert.deepEqual(result,results[0]);
});

test('speed progression changes actual motion smoothly while retaining the verified 27-unit limit',()=>{
 const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();const values=[];
 let previous=0;
 for(let step=0;step<180*120;step++){
  s.update(1/120);assert.ok(s.speed>=previous&&s.speed<=27);assert.ok(s.speed-previous<.01||step===0);previous=s.speed;
  if([30*120-1,60*120-1,120*120-1,180*120-1].includes(step))values.push({seconds:(step+1)/120,speed:s.speed,distance:s.d});
 }
 const old=(t:number)=>27/(1+1.25*Math.exp(-27*t/2600));
 assert.ok(values[1].speed>old(60)+2);assert.ok(values[2].speed>old(120)+3);
 console.log(JSON.stringify({effectiveSpeedProgression:values}));
});

test('new train details have real doors/windows/roof geometry within the existing collision envelope',()=>{
 const root=trainDetailPrototype();const box=new THREE.Box3().setFromObject(root);
 assert.ok(box.min.x>=-1.18&&box.max.x<=1.18);assert.ok(box.min.z>=-3.37&&box.max.z<=3.37);assert.ok(box.max.y<=3.405);
 assert.equal(root.children.length,3);assert.ok(root.getObjectByName('windows'));assert.ok(root.getObjectByName('roof-door-frames'));
});
