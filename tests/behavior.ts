import {RailBed} from '../upstream/src/ciac/rail-art';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Sim } from '../upstream/src/sim/sim';
import { decisionSection } from '../upstream/src/ciac/rhythm';
import { solve } from '../upstream/src/sim/track';
import { speedAt, moverFront, trainLength, CAR_LEN, CAR_GAP, laneX, MOVER, VIEW_AHEAD, OB } from '../upstream/src/config';
import { QuizCourse, QUESTION_VISIBLE_DISTANCE } from '../upstream/src/ciac/course';
import { RacePace } from '../upstream/src/ciac/pace';
import { QuizAnswerTrack } from '../upstream/src/ciac/answer-track';
import { CIACQuiz, STATIC_RANKING } from '../upstream/src/ciac/game';
import { decisionPilot } from './decision-pilot';
import { bindSwipe } from '../upstream/src/ciac/swipe';
import { PlayerView } from '../upstream/src/view/player';
import { World } from '../upstream/src/view/world';
import { Instanced } from '../upstream/src/view/pools';
import * as THREE from '../upstream/node_modules/three';
import { GLTFLoader } from '../upstream/node_modules/three/examples/jsm/loaders/GLTFLoader.js';

const h = 1 / 120;
const near = (a: number, b: number, tolerance = 1e-8) => assert.ok(Math.abs(a-b) < tolerance, `${a} != ${b}`);

test('reservations cover the full train sweep; ramps cannot survive without trains', () => {
  const course = new QuizCourse();
  const crossing = {kind:'mtrain' as const,lane:1,d0:100,d1:104,cars:1};
  assert.equal(course.allowsObstacle(crossing), true); // already passes before gate 180
  assert.equal(course.allowsObstacle({...crossing,d0:145,d1:149}), false); // intersects question
  assert.equal(course.allowsObstacle({...crossing,d0:205,d1:209}), true); // next train is visible beyond answer
  assert.equal(course.allowsObstacle({...crossing,d0:275,d1:279}), false); // enters next protected gate
  assert.equal(course.allowsObstacle({...crossing,d0:40,d1:44}), true);
  assert.deepEqual(course.prepareSpecs([
    {kind:'ramp',lane:0,d0:120,d1:127},
    {kind:'train',lane:0,d0:127,d1:147,cars:3}
  ]), []);
  for (let d=140; d<=190; d+=0.5) assert.equal(course.allowsPickup(d),false);
});

test('route solver rejects simultaneous barriers on every ground lane', () => {
  const specs = [0, 1, 2].map(lane => ({
    kind: 'overhead' as const, lane, d0: 25, d1: 27,
  }));
  assert.equal(solve(specs, 0, 50, [1], speedAt).ok, false);
  assert.equal(solve(specs.slice(0, 2), 0, 50, [1], speedAt).ok, true);
});

test('100 seeds, tutorial and normal: generated sections and pickups stay outside protected zones', () => {
  let trains = 0, ramps = 0;
  for (let seed=1; seed<=100; seed++) for (const tutorial of [true,false]) {
    const s = new Sim(seed);
    s.noSpawn = true;
    s.reset(seed,tutorial);
    while (s.track.frontier < 4000) s.track.ensure(4000);
    for (const o of s.obs) {
      assert.ok(o.lane>=0 && o.lane<=2);
      assert.ok(s.track.course.allowsObstacle(Sim.specOf(o)));
      if (o.kind==='train') {
        trains++;
        assert.ok(o.cars>=1 && o.cars<=4, 'parked train length');
      }
      if (o.kind==='ramp') {
        ramps++;
        assert.ok(s.obs.some(train => train.kind==='train' && train.lane===o.lane &&
          Math.abs(train.d0-o.d1)<0.01), 'every access ramp must lead to a train roof');
      }
    }
    assert.ok(s.coinList.every(c=>s.track.course.allowsPickup(c.d)));
    assert.ok(s.powers.every(p=>s.track.course.allowsPickup(p.d)));
  }
  assert.ok(trains > 100, 'rooftop routes return in normal gameplay');
  assert.ok(ramps > 50, 'ramps provide playable access to parked train roofs');
  console.log(JSON.stringify({generatedParkedTrains:trains,generatedRamps:ramps}));
});

test('tutorial teaches jump, slide and ramp before the first protected question', () => {
  const sim = new Sim(19);
  sim.reset(19, true);
  for (const hint of ['jump', 'slide', 'ramp']) {
    assert.ok(sim.obs.some(ob => ob.hint === hint && ob.d0 < 140));
  }
});

test('oncoming train moves before it becomes visible and keeps moving as the runner approaches', () => {
  // With a stationary waiting phase still visible on camera, trains appear frozen.
  assert.ok((1 + MOVER.ratio) * MOVER.trigger > VIEW_AHEAD,
    'a moving train must start moving before entering the visible track');

  const sim = new Sim(17);
  sim.noSpawn = true;
  sim.reset(17, false);
  sim.clearWorld();
  const train = sim.addOb({kind: 'mtrain', lane: 0, d0: 216, d1: 278, cars: 2, activation: 200, trainSpeed: 60});
  sim.d = train.activation !== undefined ? train.activation+6 : Math.max(0, train.meet - MOVER.trigger + 6);
  sim.invincible = true;
  sim.start();
  sim.update(1 / 60);
  const front = train.d0;
  sim.update(1 / 60);
  assert.ok(train.d0 < front, 'oncoming train front moves toward runner each step');
  near(train.d0, train.trainSpeed ? train.activation!+218-train.trainSpeed*train.travelTime : moverFront(train.meet, sim.d), 1e-5);
});

test('continuous runs: nothing retires in front of the camera; roofs and pickups return after gates', () => {
  let observedRoofs = 0, crossed = 0;
  for (let seed=1; seed<=12; seed++) {
    const s = new Sim(seed); s.reset(seed,false); s.start();
    let gate=180;
    while(s.alive && s.d<2000) {
      s.questionGate=gate;
      const previous = s.obs.map(o=>({id:o.id,d1:o.d1,meet:o.meet,len:o.len,kind:o.kind,activation:o.activation,trainSpeed:o.trainSpeed,travelTime:o.travelTime}));
      const coins = s.coinList.map(c=>({id:c.id,d:c.d,pulled:c.pulled}));
      const before=s.d;
      decisionPilot(s);
      s.update(1/60);
      if (s.groundY > 3) observedRoofs++;
      const picked = s.drainEvents().filter(e=>e.type==='coin');
      for(const o of previous) if(!s.obs.some(n=>n.id===o.id)) {
        const end = o.kind==='mtrain'?(o.trainSpeed ? o.activation!+218-o.trainSpeed*(o.travelTime+1/60) : moverFront(o.meet,s.d))+o.len:o.d1;
        assert.ok(end < s.d-14+1e-6, `premature obstacle removal at ${s.d}`);
      }
      const removedCoins=coins.filter(c=>!s.coinList.some(n=>n.id===c.id));
      assert.equal(removedCoins.filter(c=>c.d>=s.d-14).length,picked.length);
      for(const c of removedCoins) {
        assert.ok(c.d < s.d-14 || c.d-before<1.5 || c.pulled || picked.length>0);
      }
      for(const o of s.obs) if(o.kind==='mtrain') {
        near(o.d0,o.trainSpeed ? o.activation!+218-o.trainSpeed*o.travelTime : moverFront(o.meet,s.d)); near(o.d1-o.d0,trainLength(o.cars));
      }
      const zone = gate > 180 && gate - s.d > 140 ? gate - 150 : gate;
      if(s.d>=zone-40 && s.d<=zone+10) {
        assert.ok(s.obs.every(o=>o.d1 < s.d-12 || o.d0>zone+10));
        assert.ok(s.coinList.every(c=>c.d<zone-40 || c.d>zone+10), JSON.stringify({seed,d:s.d,gate,power:s.power,coins:s.coinList.filter(c=>c.d>=gate-40 && c.d<=gate+10)}));
      }
      if(s.d>=gate) { crossed++; gate+=150; }
    }
    assert.ok(s.alive, JSON.stringify({seed, state: s.snapshot()}));
  }
  assert.ok(observedRoofs>0 && crossed>100);
});

test('Question transition and recovery are continuous and independent of frame rate', () => {
  const samples:number[]=[];
  for(const dt of [1/120,1/60,1/30,1/20]) {
    const p=new RacePace();
    near(p.step(dt,139,180),1);
    let previous=1;
    for(let t=0;t<1;t+=dt) { const f=p.step(dt,145,180); assert.ok(f<=previous+1e-12); previous=f; }
    const readingFactor = Math.min(.88, 6 / speedAt(180));
    near(p.factor,readingFactor);
    assert.ok(p.step(dt,180,180)>readingFactor && p.factor<1);
    for(let t=0;t<1;t+=dt) p.step(dt,181,180);
    samples.push(p.factor);
  }
  for(const value of samples) near(value,1);
});

test('question approach gives about six seconds to read and choose a lane', () => {
  for (const gate of [180, 780, 2580, 5000]) {
    const pace = new RacePace();
    let distance = gate - QUESTION_VISIBLE_DISTANCE;
    let seconds = 0;
    while (distance < gate && seconds < 10) {
      const dt = 1 / 120;
      distance += speedAt(distance) * pace.step(dt, distance, gate) * dt;
      seconds += dt;
    }
    assert.ok(seconds >= 5.5 && seconds <= 7, `Puerta ${gate}: ${seconds.toFixed(2)} s`);
  }
});

test('wrong answers retain 3 seconds at 55%, including a strip and pause, then recover', () => {
  const p=new RacePace(); p.penalize(3);
  for(let i=0;i<360;i++) near(p.step(h,150,180),.55);
  assert.ok(p.penaltyRemaining<1e-10);
  const remaining=p.penaltyRemaining;
  // A paused game never calls Sim.update: no wall-clock penalty timer.
  near(p.penaltyRemaining,remaining);
  for(let i=0;i<121;i++) p.step(h,200,180);
  near(p.factor,1);
  const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();s.pace.penalize(3);
  for(let i=0;i<360;i++) {const d=s.d;s.update(h);near(s.speed/speedAt(d),.55);}
});

test('answer strips use the same distance as world transforms and survive the crossing', () => {
  const scene=new THREE.Scene(), course=new QuizCourse(), track=new QuizAnswerTrack(scene);
  const count=scene.children.length;
  for(const d of [0,100,139,140,144,179.9,180,185,193.9,194.1,290,330,344.1]) {
    track.update(d,course);
    assert.equal(scene.children.length,count);
    if(d>=140 && d<=193.9) {
      const strip=scene.children.find(o=>o.visible && Math.abs(o.position.z-(d-180+18))<1e-8);
      assert.ok(strip,`strip removed at ${d}`);
    }
  }
  assert.equal(new Set(scene.children.map((o:any)=>o.geometry)).size,2);
});

// Minimal DOM adapter for the production quiz and swipe handlers. No browser,
// rendered pixels, Safari gestures or native touch dispatch are claimed here.
class ElementAdapter {
  children:any[]=[]; hidden=false; disabled=false; value=''; textContent=''; clientWidth=390;
  listeners=new Map<string,Function[]>();
  className=''; attrs:any={}; dataset: Record<string, string>={}; parent:any;
  classList={add(){},remove(){},toggle(){}};
  append(...nodes:any[]) { for(const node of nodes) {this.children.push(node);node.parent=this;} }
  insertBefore(node:any,_ref:any) {this.append(node);}
  replaceChildren(...nodes:any[]) {this.children=[];this.append(...nodes);}
  setAttribute(name:string,value:any) {this.attrs[name]=value;}
  querySelector(_selector:string) {return this.children.find(c=>c.type==='submit')||new ElementAdapter();}
  closest(_selector:string) {return null;}
  setPointerCapture(_id:number) {}
  addEventListener(type:string,cb:Function) {this.listeners.set(type,[...(this.listeners.get(type)||[]),cb]);}
  emit(type:string,data:any) {for(const cb of this.listeners.get(type)||[]) cb(data);}
}
function dom() {
  const elements=new Map<string,ElementAdapter>();
  const get=(key:string)=>{if(!elements.has(key))elements.set(key,new ElementAdapter());return elements.get(key)!;};
  (globalThis as any).Element=ElementAdapter;
  (globalThis as any).document={querySelector:get,getElementById:get,createElement:()=>new ElementAdapter(),createDocumentFragment:()=>new ElementAdapter(),addEventListener(){}};
  (globalThis as any).window={addEventListener(){}};
}

test('static exhibition ranking distinguishes three real scores and seven examples without touching D1', () => {
  assert.deepEqual(STATIC_RANKING.map(row => [row.name, row.score, row.source]), [
    ['John', 900, 'real'],
    ['Daniela Torres', 700, 'muestra'],
    ['Matías Fuentes', 600, 'muestra'],
    ['Sofía Muñoz', 500, 'muestra'],
    ['Vicente Araya', 400, 'muestra'],
    ['Catalina Soto', 300, 'muestra'],
    ['Benjamín Rojas', 200, 'muestra'],
    ['framburguerss', 100, 'real'],
    ['Andy', 100, 'real'],
    ['Emilia Silva', 100, 'muestra'],
  ]);
  assert.equal(new Set(STATIC_RANKING.map(row => row.name)).size, 10);
  assert.equal(STATIC_RANKING.filter(row => row.source === 'real').length, 3);
  assert.equal(STATIC_RANKING.filter(row => row.source === 'muestra').length, 7);
  dom();
  (globalThis as any).fetch=async()=>{throw new Error('No ranking API should be requested');};
  const quiz = new CIACQuiz({
    scene:new THREE.Scene(), course:new QuizCourse(), frontier:()=>0, notice(){},
    penalize(){}, threat(){return 0;}, sound(){}, grantPower(){}
  });
  const content = (quiz as any).rankingContent.children[0];
  assert.match(content.children[0].textContent, /3 reales y 7 de muestra/);
  const list = content.children[1];
  assert.equal(list.children.length, 10);
  assert.equal(list.children[0].children[1].textContent, 'John');
  assert.equal(list.children[1].children[1].textContent, 'Daniela Torres *');
  assert.equal(list.children[7].children[1].textContent, 'framburguerss');
  assert.equal(list.children[8].children[1].textContent, 'Andy');
  assert.equal(list.children[9].children[2].textContent, '100');
  assert.match(content.children[2].textContent, /fuera de competencia/);
});

test('short iPhone-width swipes: four directions, one action per gesture, diagonals and rapid reversals', () => {
  dom(); const target=new ElementAdapter(), actions:string[]=[]; let prevented=0;
  bindSwipe(target as any,a=>actions.push(a),()=>true);
  const touch=(type:string,x:number,y:number)=>target.emit(type,{target,cancelable:true,
    preventDefault(){prevented++;},touches:type==='touchend'?[]:[{identifier:1}],
    changedTouches:[{identifier:1,clientX:x,clientY:y}]});
  for(const [dx,dy] of [[-15,0],[15,0],[0,-15],[0,15],[-15,0],[15,0]]) {
    touch('touchstart',195,500);touch('touchmove',195+dx,500+dy);
    touch('touchmove',195+dx*3,500+dy*3);touch('touchend',195+dx*3,500+dy*3);
  }
  assert.deepEqual(actions,['left','right','up','down','left','right']);
  touch('touchstart',195,500);touch('touchmove',210,515);touch('touchend',210,515);
  assert.equal(actions.length,6); assert.ok(prevented>=24);
  target.emit('pointerdown',{pointerType:'touch',isPrimary:true,button:0,pointerId:1,target});
  target.emit('pointermove',{pointerId:1,clientX:100,clientY:500});
  assert.equal(actions.length,6);
});

test('real quiz: full 120 question marathon, one request per crossing and victory after the last one', async () => {
  dom();
  const bank=JSON.parse(readFileSync('data/questions.json','utf8'));
  const allQuestions=Array.isArray(bank)?bank:bank.questions;
  assert.equal(allQuestions.length,120);
  const questions=allQuestions.slice(0,120);
  assert.equal(questions.length,120);
  const course=new QuizCourse(), scene=new THREE.Scene(); let index=0, answers=0, penalty=0;
  const awarded: string[] = [];
  let resolveAnswer:any; let delay=false;
  const response=(data:any)=>({ok:true,json:async()=>data});
  (globalThis as any).fetch=async(path:string,options:any)=>{
    if(path.includes('leaderboard'))return response({ranking:[]});
    if(path.endsWith('start'))return response({token:'',question:questions[0]});
    assert.equal(path,'/api/answer'); assert.ok([0,1,2].includes(JSON.parse(options.body).lane));
    answers++; index++;
    const data={correct:index%2===0,points:100*Math.floor(index/2),penaltySeconds:index%2?3:0,question:questions[index]||null};
    if(delay) return new Promise(resolve=>{resolveAnswer=()=>resolve(response(data));});
    return response(data);
  };
  const quiz=new CIACQuiz({scene,course,frontier:()=>5000,notice(){},penalize(n){penalty+=n;},threat(){return 0;},sound(){},
    grantPower(kind){awarded.push(kind);}
  });
  (quiz as any).select.value = 'Todos';
  await quiz.start();
  for(let n=0;n<120;n++) {
    const gate=quiz.activeGate; assert.ok(Number.isFinite(gate));
    quiz.tick(gate-40.1,1); assert.equal((quiz as any).dialog.hidden,true);
    quiz.tick(gate-40,1); assert.equal((quiz as any).dialog.hidden,false);
    quiz.tick(gate-36,1); assert.equal(quiz.questionSlow,true);
    delay=n===2;
    quiz.tick(gate,n%3);quiz.tick(gate+.1,n%3);
    assert.equal(answers,n+1);
    if(delay) {quiz.tick(gate+220,1);resolveAnswer();}
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(awarded.length, Math.floor((n+1)/2), 'solo los aciertos verificados conceden poderes');
    if(n<119) assert.ok(quiz.activeGate>=gate+150);
  }
  assert.equal(answers,120);assert.equal(penalty,180);assert.equal(quiz.activeGate,Infinity);
  assert.equal(quiz.completedAll,true);
  quiz.endRun(18030,12000,false,true);
  assert.match((quiz as any).summary.textContent,/120\/120 preguntas completadas.*60 aciertos/);
  assert.equal((quiz as any).endTitle.textContent,'¡Llegaste hasta el final!');
  assert.deepEqual(awarded, Array.from({length:60},(_,i)=>['magnet','double','shoes'][i%3]));
  assert.equal(course.intersects(5500,5600),false);
  const existing = new Sim(); existing.reset(4,false);
  const ids = existing.obs.map(o=>o.id);
  existing.track.course.stop(existing.track.frontier);
  assert.deepEqual(existing.obs.map(o=>o.id),ids);
  assert.equal(typeof (existing as any).clearObstaclesUntil,'undefined');
  // Reset while a response is outstanding must not resurrect the previous run.
  index=0;delay=true;course.reset();quiz.reset();await quiz.start();quiz.tick(180,1);quiz.reset();resolveAnswer();
  await new Promise(resolve=>setImmediate(resolve));assert.equal(quiz.activeGate,Infinity);
  (globalThis as any).fetch=async()=>{throw new Error('network unavailable');};
  course.reset();quiz.reset();await quiz.start();assert.equal(quiz.activeGate,Infinity);
  assert.equal(course.intersects(5500,5600),false);
});

test('quiz awards a shield and career bonus once per streak and reports the run', async () => {
  dom();
  const question={id:'q',curso:'MAT',enunciado:'Pregunta',opciones:['A','B','C']};
  const results=[true,true,true,true,true,true,false,true,true,true];
  const rewards: [boolean,number][]=[];
  const granted: string[] = [];
  const danger:boolean[]=[];
  const sounds:string[]=[];
  let index=0;
  (globalThis as any).fetch=async(path:string)=>({ok:true,json:async()=>{
    if(path.endsWith('start'))return {token:'',question};
    if(path.includes('leaderboard'))return {ranking:[]};
    const correct=results[index++];
    return {correct,points:100*results.slice(0,index).filter(Boolean).length,question};
  }});
  const quiz=new CIACQuiz({
    scene:new THREE.Scene(),course:new QuizCourse(),frontier:()=>0,notice(){},penalize(){},
    reward(shield,bonus){if(shield||bonus)rewards.push([shield,bonus]);},
    grantPower(kind){granted.push(kind);},
    threat(correct){danger.push(correct);return correct ? -1 : 1;},
    sound(cue){sounds.push(cue);}
  });
  await quiz.start();
  for(const _ of results) {
    const gate=quiz.activeGate;
    quiz.tick(gate,1);
    quiz.tick(gate+1,1);
    await new Promise(resolve=>setImmediate(resolve));
    const feedback=(quiz as any).feedback;
    assert.match(feedback.textContent, _ ? /\+100 académicos · Certamen −1/ : /Incorrecto · Certamen \+1/);
  }
  assert.equal(sounds.filter(cue=>cue==='correct').length,9);
  assert.equal(sounds.filter(cue=>cue==='wrong').length,1);
  assert.equal(sounds.filter(cue=>cue==='bonus').length,1);
  assert.deepEqual(danger,results);
  assert.deepEqual(granted, Array.from({length:9},(_,i)=>['magnet','double','shoes'][i%3]));
  assert.deepEqual(rewards,[[true,0],[false,100],[true,0]]);
  quiz.endRun(1700.5,1200,true);
  const summary=(quiz as any).summary;
  assert.match(summary.textContent,/9 aciertos.*Mejor racha: 6.*Certamen/);
  assert.doesNotMatch(summary.textContent,/1700 m|1200 puntos/);
  quiz.reset();
  assert.equal(summary.textContent,'');
});

test('physical movement: rapid lanes, jump landing, slide, and original collision outcomes', () => {
  const s=new Sim();s.noSpawn=true;s.reset(1,false);s.clearWorld();s.start();
  s.left();s.update(.04);const x=s.x;s.right();near(s.x,x);s.update(.04);s.right();
  for(let i=0;i<30;i++)s.update(h);near(s.x,laneX(2));
  s.jump();let peak=0;
  for(let i=0;i<120;i++){s.update(h);peak=Math.max(peak,s.y);}
  assert.ok(peak>1.5 && peak<1.9);assert.ok(s.grounded);near(s.y,0);
  s.down();assert.ok(s.sliding);for(let i=0;i<80;i++)s.update(h);assert.equal(s.sliding,false);
  for(const kind of ['train','mtrain','low','hurdle','overhead'] as const) {
    s.reset(1,false);s.clearWorld();s.start();
    s.addOb({kind,lane:1,d0:14,d1:14+(kind==='train'?trainLength(2):1),cars:2});
    for(let i=0;i<360&&s.alive;i++)s.update(h);
    assert.equal(s.alive,false,kind);
  }
});

test('runner can take a ramp, jump between roofs and return to ground', () => {
  const sim = new Sim();
  sim.noSpawn = true;
  sim.reset(1, false);
  sim.clearWorld();
  sim.addOb({ kind: 'ramp', lane: 1, d0: 8, d1: 15 });
  sim.addOb({ kind: 'train', lane: 1, d0: 15, d1: 15 + trainLength(2), cars: 2 });
  sim.addOb({ kind: 'train', lane: 2, d0: 20, d1: 20 + trainLength(2), cars: 2 });
  sim.start();
  const runTo = (distance: number) => {
    while (sim.d < distance && sim.alive) sim.update(h);
    assert.ok(sim.alive);
  };
  runTo(21);
  near(sim.y, 3.4);
  sim.jump();
  sim.right();
  runTo(31);
  near(sim.x, laneX(2));
  near(sim.y, 3.4);
  assert.ok(sim.grounded);
  runTo(42);
  near(sim.y, 0);
  assert.ok(sim.grounded);
});

async function parseUntexturedGLB(path: string) {
  const file=readFileSync(path);
  const jsonLength=file.readUInt32LE(12), data=JSON.parse(file.subarray(20,20+jsonLength).toString());
  // Textures are irrelevant to bounds and clip evaluation and need browser decoders.
  for(const material of data.materials||[]) {
    delete material.pbrMetallicRoughness?.baseColorTexture;
    delete material.pbrMetallicRoughness?.metallicRoughnessTexture;
    delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;
  }
  delete data.images;delete data.textures;
  const json=Buffer.from(JSON.stringify(data));const padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
  const rest=file.subarray(20+jsonLength), header=Buffer.alloc(20);
  file.copy(header,0,0,12);header.writeUInt32LE(20+padded.length+rest.length,8);
  header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const bytes=Buffer.concat([header,padded,rest]);
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
}

test('complete train instances and retargeted protagonist animation clips', async () => {
  const gltf=await parseUntexturedGLB('upstream/public/assets/core.glb');
  const protagonist = await parseUntexturedGLB('upstream/public/assets/protagonista-ciac.glb');
  protagonist.scene.name = 'ciac-protagonist';
  gltf.scene.add(protagonist.scene);
  const train=gltf.scene.getObjectByName('train')!;
  const scene=new THREE.Scene();
  const cabPool=new Instanced(train,60,scene,{colors:true});
  const coachPool=new Instanced(train,60,scene,{colors:true});
  const sim=new Sim();sim.noSpawn=true;sim.reset(1,false);sim.clearWorld();sim.start();
  const mover=sim.addOb({kind:'mtrain',lane:0,d0:80,d1:95,cars:3});
  const emptyPool=()=>new Instanced(train,60,scene);
  const couplers=new Instanced(new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.64, CAR_GAP + 0.18)), 60, scene);
  const world=Object.create(World.prototype) as World;
  Object.assign(world, {scene,camera:new THREE.PerspectiveCamera(76,390/844,.3,260),
    pools:{train:coachPool,trainCab:cabPool},trainLinks:couplers,railBed:new RailBed(scene),city:{update(){}},coins:emptyPool(),halos:new Instanced(train,340,scene,{colors:true}),
    poles:emptyPool(),powerCards:{magnet:emptyPool(),shoes:emptyPool(),double:emptyPool()},
    scrollTex:[],movers:[],camX:0,camY:0,camSupport:0,shake:0,flash:0,aspect:390/844,time:0,
    fx:{update(){},burst(){}},player:{menu(){}}
  });
  const matrix=new THREE.Matrix4(), expected=new THREE.Matrix4();
  for(let frame=0;frame<1400;frame++) {
    sim.invincible=true;sim.update(h);world.sync(sim,h,false);
    const drawn:number[]=[];
    if(sim.obs.includes(mover) && mover.d1>=sim.d-26) {
      for(let car=0;car<mover.cars;car++) {
        const center=mover.d0+car*(CAR_LEN+CAR_GAP)+CAR_LEN/2;
        if(center+CAR_LEN/2>=sim.d-26 && center-CAR_LEN/2<=sim.d+210+CAR_LEN) drawn.push(car);
      }
    }
    assert.ok(world.camera.position.toArray().every(Number.isFinite));
    assert.ok(couplers.count<=Math.max(0,drawn.length));
    for (const [pool, cars] of [[cabPool, drawn.filter(car => car === 0)], [coachPool, drawn.filter(car => car > 0)]] as const) {
      assert.equal(pool.count, cars.length);
      for (const part of pool.parts) {
        assert.equal(part.mesh.count, cars.length);
        for (const [index, car] of cars.entries()) {
          const center = mover.d0 + car * (CAR_LEN + CAR_GAP) + CAR_LEN / 2;
          expected.makeTranslation(laneX(mover.lane), 0, sim.d - center).multiply(part.local);
          part.mesh.getMatrixAt(index, matrix);
          for (let k = 0; k < 16; k++) near(matrix.elements[k], expected.elements[k], 1e-5);
        }
      }
    }
  }
  const actorScene=new THREE.Scene();
  const player=new PlayerView(gltf,actorScene);
  const shadow=actorScene.children.find(o=>o.type==='Mesh' && (o as THREE.Mesh).geometry.type==='CircleGeometry');
  assert.ok(shadow,'ground contact shadow remains attached to the player renderer');
  const oldCostume=player.model.getObjectByName('Boy01_Body_Geo') as THREE.Mesh;
  assert.ok(oldCostume && !oldCostume.visible,'original character geometry is hidden');
  const replacement=protagonist.scene.getObjectByProperty('isSkinnedMesh',true) as THREE.SkinnedMesh;
  assert.ok(replacement?.visible && replacement.skeleton.bones.length >= 22);
  const knee=protagonist.scene.getObjectByName('LeftLeg')!;
  const rest=knee.quaternion.clone();
  const oldMeshCount=player.model.children.length;
  const nodes=actorScene.children.length;
  const runner=new Sim();runner.noSpawn=true;runner.reset(2,false);runner.clearWorld();runner.start();
  for(let frame=0;frame<120;frame++){
    runner.update(h);player.update(runner,h,[]);
    assert.equal(actorScene.children.length,nodes,'no new scene nodes per frame');
    assert.equal(player.model.children.length,oldMeshCount,'rig keeps its character structure');
  }
  assert.ok(knee.quaternion.angleTo(rest) > 0.01, 'the Mixamo pose drives the protagonist knee');
  player.play('jump',0,1,true);player.mixer.update(10);
  const time=player.actions.jump.time;player.play('jump',0,1);near(player.actions.jump.time,time);
  player.play('jump',0,1,true);near(player.actions.jump.time,0);
});


test('oncoming trains replace only the third parked roof and stay outside academic gates', () => {
  const course = new QuizCourse();
  course.stop(4000);
  for (const start of [40, 190, 340, 490, 640]) for (let variant = 0; variant < 36; variant++) {
    const rampLane = variant % 3;
    const landingLane = (rampLane + 1 + (variant % 2)) % 3;
    const thirdLane = 3 - rampLane - landingLane;
    const section = decisionSection(start, rampLane, landingLane, variant);
    const movers = section.specs.filter(spec => spec.kind === 'mtrain');
    const enabled = start >= 190 && variant % 6 !== 5;
    assert.equal(movers.length, Number(enabled));
    assert.ok(section.specs.every(spec => course.allowsObstacle(spec)), 'nothing enters a quiz reserve');
    assert.ok(section.specs.some(spec => spec.kind === 'ramp' && spec.lane === rampLane));
    assert.ok(section.specs.some(spec => spec.kind === 'train' && spec.lane === rampLane));
    assert.ok(section.specs.some(spec => spec.kind === 'train' && spec.lane === landingLane));
    if (enabled) {
      const mover = movers[0];
      assert.equal(mover.lane, thirdLane);
      assert.equal(mover.activation, start);
      assert.equal(mover.cars, 2);
      assert.ok(mover.trainSpeed! >= 56 && mover.trainSpeed! <= 68);
      assert.ok(!section.specs.some(spec => spec.kind === 'train' && spec.lane === thirdLane &&
        Math.abs(spec.d0 - (section.ramp + OB.ramp.depth)) < 0.01),
        'the specific third roof was replaced; other timed barriers remain');
    } else {
      assert.ok(section.specs.some(spec => spec.kind === 'train' && spec.lane === thirdLane &&
        Math.abs(spec.d0 - (section.ramp + OB.ramp.depth)) < 0.01));
    }
  }
});

test('five sixths of the 36 eligible encounter variants contain an oncoming train', () => {
  for (const start of [190, 340, 490, 640]) {
    const count = Array.from({length:36}, (_, variant) =>
      decisionSection(start, 0, 1, variant).specs.some(spec => spec.kind === 'mtrain')
    ).filter(Boolean).length;
    assert.equal(count, 30, 'five of every six eligible variants should carry a moving train');
  }
});

test('seeded generated races have genuine timed oncoming trains without changing protected routes', () => {
  let oncoming = 0;
  for (let seed = 1; seed <= 25; seed++) {
    const sim = new Sim(seed);
    sim.noSpawn = true;
    sim.reset(seed, false);
    while (sim.track.frontier < 3040) sim.track.ensure(3040);
    const movers = sim.obs.filter(ob => ob.kind === 'mtrain');
    assert.ok(movers.length >= 2, 'each seeded run should contain moving encounters');
    oncoming += movers.length;
    for (const ob of movers) {
      assert.ok(ob.activation !== undefined && ob.trainSpeed! > 0);
      assert.ok(sim.track.course.allowsObstacle(Sim.specOf(ob)));
      assert.ok(sim.obs.some(roof => roof.kind === 'train' && roof.lane !== ob.lane
        && Math.abs(roof.d0 - (ob.activation! + 24)) < 45),
        'the encounter still includes a separate roof route');
    }
  }
  assert.ok(oncoming >= 100);
});
