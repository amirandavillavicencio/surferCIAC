import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../upstream/src/sim/sim';
import {ChaseState} from '../upstream/src/ciac/chase';
import {FrameClock} from '../ciac/frame-clock';
import {fitTrainModel} from '../upstream/src/ciac/rail-art';
import {CAR_LEN, OB} from '../upstream/src/config';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from '../upstream/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {GuardView, guardVisualScale} from '../upstream/src/ciac/guard-view';
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

test('Kenney train meshes fit the collision envelope and have a walkable coach roof', async () => {
 for (const suffix of ['a', 'b'] as const) {
  const name = `train-electric-subway-${suffix}` as const;
  const original = readFileSync(`third_party/kenney-train-kit/${name}.glb`);
  const jsonEnd = 20 + original.readUInt32LE(12);
  const document = JSON.parse(original.toString('utf8', 20, jsonEnd));
  // Node has no image decoder. Chromium checks the original textured files.
  for (const material of document.materials) delete material.pbrMetallicRoughness.baseColorTexture;
  const json = Buffer.from(JSON.stringify(document));
  const aligned = (json.length + 3) & ~3;
  const bytes = Buffer.alloc(20 + aligned + original.length - jsonEnd, 32);
  original.copy(bytes, 0, 0, 20);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(aligned, 12);
  json.copy(bytes, 20);
  original.copy(bytes, 20 + aligned, jsonEnd);
  const {scene} = await new GLTFLoader().parseAsync(bytes.buffer, '');
  const mesh = fitTrainModel(scene, name);
  const box = new THREE.Box3().setFromObject(mesh);
  const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-5, `${actual} vs ${expected}`);
  near(box.min.x, -OB.train.halfW);
  near(box.max.x, OB.train.halfW);
  near(box.min.y, 0);
  near(box.max.y, OB.train.yt);
  near(box.min.z, -CAR_LEN / 2);
  near(box.max.z, CAR_LEN / 2);
  if (suffix === 'b') {
   for (const z of [-3, -2, -1, 0, 1, 2, 3]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 5, z), new THREE.Vector3(0, -1, 0));
    near(ray.intersectObject(mesh)[0].point.y, OB.train.yt);
   }
  }
 }
});


test('guard rendering stays small near the camera without changing pursuit state',()=>{
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(76,390/844,.3,260);
  camera.position.set(0,4.25,7.8);
  const guard=new GuardView(scene);
  const sim=new Sim();sim.noSpawn=true;sim.reset(1,false);sim.clearWorld();sim.start();
  const chase=new ChaseState();sim.update(1/120);chase.observe(sim,1/120,sim.drainEvents());
  const before={mode:chase.current.mode,gap:chase.current.gap,danger:chase.danger};
  // In the iPhone video the guard walked into the camera around a 6.4 m gap.
  guard.update({...chase.current,mode:'distant',visible:true,d:sim.d-6.4},sim.d,camera);
  assert.ok(guard.root.scale.x<.1,'the near-lens guard must not fill the viewport');
  guard.update({...chase.current,mode:'intro',visible:true,d:sim.d-2.4},sim.d,camera);
  assert.equal(guard.root.scale.x,1,'the normal runner chase remains legible');
  guard.update({...chase.current,mode:'distant',visible:true,d:sim.d-7.8},sim.d,camera);
  assert.equal(guard.root.visible,false,'a guard at the camera lens is hidden');
  for(let depth=1.25;depth<=10;depth+=.1)
    assert.ok(guardVisualScale(depth)/depth<=.25,'projected guard size must be bounded');
  assert.deepEqual({mode:chase.current.mode,gap:chase.current.gap,danger:chase.danger},before);
});
