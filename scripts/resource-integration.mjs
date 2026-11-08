import {readFile,writeFile,copyFile,mkdir,cp} from 'node:fs/promises';
const patch=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Resources anchor: '+a);return s.replace(a,b);};
for(const name of ['officer-model','chase','guard-view'])await copyFile(`ciac/${name}.ts`,`upstream/src/ciac/${name}.ts`);
await mkdir('upstream/public/licenses',{recursive:true});
await copyFile('third_party/saurabh-sprint/LICENSE','upstream/public/licenses/saurabh-sprint-LICENSE.txt');
let config=await readFile('upstream/src/config.ts','utf8');
config=patch(config,'start: 12, max: 27, ramp: 2600','start: 12, max: 27, ramp: 1400');
await writeFile('upstream/src/config.ts',config);
let player=await readFile('upstream/src/view/player.ts','utf8');
player=patch(player,'GRAVITY, speedAt','GRAVITY, SPEED, speedAt');
player=patch(player,'const u=Math.max(0,sim.d)/2600;', 'const u=Math.max(0,sim.d)/SPEED.ramp;');
player=patch(player,'const gait=.9*2600/27*(u+Math.log(27-15*Math.exp(-u))-Math.log(12))+sim.d/22;', 'const gait=.9*SPEED.ramp/SPEED.max*(u+Math.log(SPEED.max-(SPEED.max-SPEED.start)*Math.exp(-u))-Math.log(SPEED.start))+sim.d/22;');
await writeFile('upstream/src/view/player.ts',player);
let presentation=await readFile('upstream/src/ciac/presentation.ts','utf8');
presentation="import {ChaseState} from './chase';\n"+presentation;
presentation=patch(presentation,'export class Presentation {','export class Presentation {\n  readonly chase=new ChaseState();');
presentation=patch(presentation,'reset(sim:Sim){','reset(sim:Sim){this.chase.reset();');
presentation=patch(presentation,'    const old=this.previous;', '    this.chase.observe(sim,dt,events);\n    const old=this.previous;');
presentation=patch(presentation,'return {sim:v,dt,time,events};','return {sim:v,dt,time,events,guard:this.chase.sample(t)};');
await writeFile('upstream/src/ciac/presentation.ts',presentation);
let world=await readFile('upstream/src/view/world.ts','utf8');
world="import {GuardView} from '../ciac/guard-view';\n"+world;
world=patch(world,'export class World {','export class World {\n  readonly guard:GuardView;');
world=patch(world,'    this.player = new PlayerView(core, s);','    this.player = new PlayerView(core, s);\n    this.guard = new GuardView(s);');
world=patch(world,'  resetScenery() {','  resetScenery() {\n    this.guard.reset();');
await writeFile('upstream/src/view/world.ts',world);
let main=await readFile('upstream/src/main.ts','utf8');
main=patch(main,"    world.sync(frame.sim,frame.dt,state==='start');", "    world.sync(frame.sim,frame.dt,state==='start');\n    world.guard.update(frame.guard,frame.sim.d);\n    if(QUIZ)quiz.setDanger(presentation.chase.danger);");
main=patch(main,'    penalize: (seconds: number) => sim.pace.penalize(seconds),',
  '    penalize: (seconds: number) => sim.pace.penalize(seconds),\n    threat: (correct: boolean) => presentation.chase.answer(correct),');
main=patch(main,'    presentation.capture(sim, dt, events);',
  "    presentation.capture(sim, dt, events);\n    if(QUIZ && state==='play' && sim.alive && presentation.chase.current.mode==='captured')sim.caughtByGuard();");
await writeFile('upstream/src/main.ts',main);
let sim=await readFile('upstream/src/sim/sim.ts','utf8');
sim=patch(sim,"  private crash(kind: ObKind | 'caught', o?: Ob) {",
  "  caughtByGuard() { if(this.alive) this.crash('caught'); }\n\n  private crash(kind: ObKind | 'caught', o?: Ob) {");
await writeFile('upstream/src/sim/sim.ts',sim);
await cp('third_party/kenney-train-kit', 'upstream/public/assets/kenney-train-kit', {
  recursive: true, filter: path => !path.endsWith('README.md')
});
main="import {loadTrainArt} from './ciac/rail-art';\n"+main;
main=patch(main,'const core = await parseGLB(coreBuf);',
  'const [core, trainArt] = await Promise.all([parseGLB(coreBuf), loadTrainArt()]);');
main=patch(main,'new World(core, {','new World(core, trainArt, {');
await writeFile('upstream/src/main.ts',main);
await copyFile('ciac/rail-art.ts','upstream/src/ciac/rail-art.ts');
world=await readFile('upstream/src/view/world.ts','utf8');
world="import {RailBed,type TrainArt} from '../ciac/rail-art';\n"+world;
world=patch(world,'  readonly guard:GuardView;', '  readonly guard:GuardView;\n  private railBed:RailBed;');
world=patch(world,'constructor(core: GLTF, quality:', 'constructor(core: GLTF, trainArt: TrainArt, quality:');
const trainStart=world.indexOf("    const trainProto = node('train');");
const trainEnd=world.indexOf('    const coupler =', trainStart);
if(trainStart<0 || trainEnd<0)throw Error('Resources anchor: train pools');
world=world.slice(0,trainStart)+`    this.railBed = new RailBed(s);
    const trainOptions = { cast: true, receive: true, colors: true };
    this.pools.train = new Instanced(trainArt.coach, 72, s, trainOptions);
    this.pools.trainCab = new Instanced(trainArt.cab, 72, s, trainOptions);
`+world.slice(trainEnd);
world=patch(world,'    this.trainLinks.begin();','    this.trainLinks.begin();\n    this.railBed.update(pd);');
world=patch(world,'          this.pools.train.add(m4, TRAIN_TINTS[o.variant % 3]);', `          const leadingCab = o.kind === 'mtrain' && c === 0;
          const pool = leadingCab ? this.pools.trainCab : this.pools.train;
          pool.add(m4, o.kind === 'mtrain' ? MOVING_TINT : TRAIN_TINTS[o.variant % 3]);`);
world=patch(world,'const COIN_GLOW =', 'const MOVING_TINT = new THREE.Color(0x95b7d0);\nconst COIN_GLOW =');
world=patch(world,'    trackMesh.position.set(0, 0, z);','    trackMesh.position.set(0, -.03, z);');
await writeFile('upstream/src/view/world.ts',world);
world=await readFile('upstream/src/view/world.ts','utf8');
world=patch(world,'    renderer.compile(this.scene, this.camera);', '    this.guard.root.visible=true;\n    renderer.compile(this.scene, this.camera);\n    this.guard.reset();');
await writeFile('upstream/src/view/world.ts',world);
