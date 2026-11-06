import {readFile,writeFile,copyFile} from 'node:fs/promises';
for (const name of ['frame-clock','physical-lane']) await copyFile(`ciac/${name}.ts`,`upstream/src/ciac/${name}.ts`);
const patch = (source,before,after) => {
 if(source.split(before).length!==2) throw new Error('Polish anchor changed: '+before.slice(0,90));
 return source.replace(before,after);
};
let main=await readFile('upstream/src/main.ts','utf8');
main="import { FrameClock } from './ciac/frame-clock';\nimport { occupiedLane, crossingLane } from './ciac/physical-lane';\n"+main;
main=main.replaceAll('quiz.tick(sim.d, sim.lane)', 'quiz.tick(sim.d, occupiedLane(sim.x))');
main=patch(main,"  function tick(dt: number, draw = true) {", "  function tick(dt: number, draw = true) {\n    const before = {d:sim.d,x:sim.x};\n    const crossingGate = quiz.activeGate;");
main=patch(main,'if (state === \'play\' && !TEST && sim.alive) quiz.tick(sim.d, occupiedLane(sim.x));',`if (state === 'play' && !TEST && sim.alive) {
      const lane = before.d < crossingGate && sim.d >= crossingGate
        ? crossingLane(before, sim, crossingGate) : occupiedLane(sim.x);
      quiz.tick(sim.d, lane);
    }`);
const from=main.indexOf('  let last = performance.now();');
const to=main.indexOf('  if (!TEST) requestAnimationFrame(loop);',from);
if(from<0||to<0)throw Error('Missing frame loop');
main=main.slice(0,from)+`  const clock = new FrameClock();
  let last = performance.now();
  let previousState: Screen = state;
  const previousPosition = new THREE.Vector3();
  const currentPosition = new THREE.Vector3();
  const resetClock = () => { clock.reset(); last = performance.now(); };
  document.addEventListener('visibilitychange', resetClock);
  window.addEventListener('blur', resetClock);
  const loop = (now: number) => {
    const elapsed = Math.max(0, (now - last) / 1000);
    last = now;
    if (previousState !== state || document.hidden || state === 'pause') {
      clock.reset();
      previousPosition.copy(world.player.root.position);
      previousState = state;
    }
    if (!document.hidden && state !== 'pause') {
      const alpha = clock.advance(elapsed, dt => {
        previousPosition.copy(world.player.root.position);
        tick(dt, false);
      });
      // Interpolate presentation only; physics, collisions and quiz stay exact.
      currentPosition.copy(world.player.root.position);
      if (state === 'play') {
        world.player.root.position.lerpVectors(previousPosition, currentPosition, alpha);
        if (sim.grounded) world.player.root.position.y = currentPosition.y;
        quiz.presentLane(occupiedLane(world.player.root.position.x));
      }
      renderer.render(world.scene, world.camera);
      world.player.root.position.copy(currentPosition);
      if (elapsed < 0.25) watchPerf(elapsed);
    } else renderer.render(world.scene, world.camera);
    requestAnimationFrame(loop);
  };
`+main.slice(to);
// Opt-in deterministic browser harness exercises the same quiz and frame clock.
main=patch(main,"const TEST = new URLSearchParams(location.search).has('test');", "const TEST = new URLSearchParams(location.search).has('test');\nconst QUIZ = !TEST || new URLSearchParams(location.search).has('quiz');");
main=main.replaceAll('if (!TEST) void quiz.start()', 'if (QUIZ) void quiz.start()')
 .replaceAll('if (!TEST) quiz.endRun()', 'if (QUIZ) quiz.endRun()')
 .replaceAll('!TEST && quiz.handleAction', 'QUIZ && quiz.handleAction')
 .replaceAll("state === 'play' && !TEST", "state === 'play' && QUIZ")
 .replaceAll("if (!TEST && state !== 'start'", "if (QUIZ && state !== 'start'")
 .replaceAll('sim.track.course.reset(!TEST)', 'sim.track.course.reset(QUIZ)');
main=patch(main,'      sim, world, renderer,', '      sim, world, renderer, quiz, clock,\n      frame(elapsed: number) { return clock.advance(elapsed, dt=>tick(dt, false)); },');
await writeFile('upstream/src/main.ts',main);
let world=await readFile('upstream/src/view/world.ts','utf8');
world=patch(world,"      const w = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, GROUND_LEN), wireMat);",`      // Preserve distant overhead lines, but leave the camera/runner corridor
      // clear. Only the nearby occluding segment is omitted.
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, GROUND_LEN - 60), wireMat);
      w.name = 'distant-wire';`);
world=patch(world,'w.position.set(laneX(l), 6.45, z);','w.position.set(laneX(l), 6.45, z - 30);');
await writeFile('upstream/src/view/world.ts',world);
await copyFile('ciac/encounters.ts','upstream/src/ciac/encounters.ts');
let track=await readFile('upstream/src/sim/track.ts','utf8');
track="import { encounter, encounterRoute } from '../ciac/encounters';\n"+track;
const a=track.indexOf('  private genChunk() {');
const b=track.indexOf('  private buildRows(',a);
if(a<0||b<0)throw Error('Missing generator');
track=track.replace(/type Pattern = [^\n]+\n/, '');
const generatorStart=track.indexOf('  private genChunk() {');
const generatorEnd=track.indexOf('  private buildRows(',generatorStart);
track=track.slice(0,generatorStart)+`  private genChunk() {
    const start = this.frontier;
    const end = 190 + Math.floor((start - 40) / 150) * 150;
    const from = this.rng.chance(.5) ? 0 : 2;
    // Assemble before filtering, so rejected destinations take their ramps.
    let specs = this.course.prepareSpecs(encounter(start, from)
      .filter(s => s.d1 < end - 5 && s.d0 >= this.busy[s.lane]));
    let res = solve(specs, start, end, this.reach, speedAt, true, from);
    if (!res.ok) {
      this.failures++;
      // Keep a guaranteed escape lane; don't replace the entire encounter with air.
      specs = specs.filter(s => s.lane !== from);
      res = solve(specs, start, end, this.reach, speedAt, true, from);
      if (!res.ok) throw new Error('Encounter has no escape at '+start);
    }
    for (const s of specs) this.sink.ob(s);
    // Coins describe the intended physical action sequence. Do not draw a roof
    // trajectory when a short/tutorial chunk could not retain both roofs.
    const complete = specs.filter(s => s.kind === 'train').length === 2 && specs.some(s=>s.kind==='ramp');
    if (complete) {
      for (let d=start+3; d<end-4; d+=2.1) {
        if (!this.course.allowsPickup(d)) continue;
        const pt=encounterRoute(start,from,d,speedAt(start+36));
        // Slide rewards stay below the bar; above-roof coins track the jump.
        const y=d>start+78 && d<start+86 ? .45 : pt.y+.85;
        this.sink.coin(pt.lane,d,y);
      }
    } else if (res.path) this.coinsAlong(res.path,specs,start,end,levelAt(start));
    if (res.path && this.nextPower >= start && this.nextPower < end) this.placePower(res.path,specs,start,end);
    else if (this.nextPower < start) this.nextPower=start+200;
    this.busy=[end,end,end];
    this.reach=res.endLanes;
    this.frontier=end;
    this.chunks++;
  }

`+track.slice(track.indexOf('  /** Coins along',generatorEnd));
await writeFile('upstream/src/sim/track.ts',track);
let player=await readFile('upstream/src/view/player.ts','utf8');
player=patch(player,"import { applyCampusRunner } from '../ciac/campus-runner';","import { applyCampusRunner, correctCampusContact } from '../ciac/campus-runner';");
// Both menu and game need the actual pose evaluated before fitting the sole.
player=patch(player,'    this.mixer.update(dt);\n  }\n}', '    this.mixer.update(dt);\n    correctCampusContact(this.model, sim.groundY + .008);\n  }\n}');
player=patch(player,'    this.mixer.update(dt);\n  }\n\n  update(', '    this.mixer.update(dt);\n    correctCampusContact(this.model, .008);\n  }\n\n  update(');
await writeFile('upstream/src/view/player.ts',player);
