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
await copyFile('ciac/action-section.ts','upstream/src/ciac/action-section.ts');
await copyFile('ciac/rhythm.ts','upstream/src/ciac/rhythm.ts');
let track=await readFile('upstream/src/sim/track.ts','utf8');
track="import { decisionSection } from '../ciac/rhythm';\nimport { decisionRow } from '../ciac/action-section';\n"+track;
track=track.replace(/type Pattern = [^\n]+\n/, '');
track=track.replace('  lastPreferLane = 1;', '  lastPreferLane = 1;\n  private teach = false;');
track=patch(track,'    if (tutorial) this.tutorialChunk();',`    this.teach = tutorial;
    for (const row of [
      decisionRow(17, 1, seed % 2 === 0 ? 2 : 0),
      decisionRow(30, 1, seed % 2 === 0 ? 3 : 1),
    ]) for (const spec of row) {
      if (tutorial && spec.lane === 1) spec.hint = spec.kind === 'low' ? 'jump' : 'slide';
      this.sink.ob(spec);
    }`);
const begin=track.indexOf('  private tutorialChunk() {');
const end=track.indexOf('  private layCoins(',begin);
if(begin<0||end<0)throw Error('Missing track anchors');
track=track.slice(0,begin)+`  private genChunk() {
    const start = this.frontier;
    const end = start + 150;
    const rampLane = this.rng.int(0, 2);
    const landingLane = (rampLane + this.rng.int(1, 2)) % 3;
    const variant = this.rng.int(0, 35);
    const section = decisionSection(start, rampLane, landingLane, variant);
    const specs = section.specs;
    // A run that has exhausted the question bank no longer needs a reading
    // break. Only fill a slot before its track has been generated.
    for (const offset of [107, 130]) {
      const row = decisionRow(start + offset, landingLane, variant + offset, false);
      if (row.every(spec => this.course.allowsObstacle(spec))) specs.push(...row);
    }
    if (specs.some(spec => !this.course.allowsObstacle(spec))) {
      throw new Error('Decision section overlaps the question at ' + start);
    }
    for (const spec of specs) {
      if (this.teach && this.chunks === 0 && spec.kind === 'ramp') spec.hint = 'ramp';
      this.sink.ob(spec);
    }
    // Coins show the approach and roof landing. Keep the transfer gap clear.
    const roofStart = section.ramp + OB.ramp.depth;
    const landingRoof = specs.find(spec => spec.kind === 'train' && spec.lane === landingLane &&
      spec.d0 >= roofStart && spec.d0 <= roofStart + 2)!;
    for (let d = start; d < section.exit; d += 2.1) {
      if (!this.course.allowsPickup(d) || [section.entry, section.middle].some(row => Math.abs(d - row) <= 3)) continue;
      if (d < section.ramp - 6) {
        const lane = d < section.entry + 5 ? section.entryLane : rampLane;
        this.sink.coin(lane, d, .85);
      } else if (d < roofStart + 2) {
        const rise = Math.max(0, Math.min(1, (d - section.ramp) / OB.ramp.depth));
        this.sink.coin(rampLane, d, rise * OB.train.yt + .85);
      } else if (d >= roofStart + 11 && d < landingRoof.d1) {
        this.sink.coin(landingLane, d, OB.train.yt + .85);
      }
    }
    if (this.nextPower >= start && this.nextPower < end) {
      const path = Array.from({length: Math.ceil((end - start) / STEP) + 1}, (_, i) => {
        const d = start + i * STEP;
        return {lane: d < roofStart ? rampLane : landingLane, top: d >= roofStart && d < landingRoof.d1};
      });
      this.placePower(path, specs, start, end);
    } else if (this.nextPower < start) this.nextPower = start + 200;
    this.frontier = end;
    this.chunks++;
  }

`+track.slice(end);
track=patch(track,'PLAYER, levelAt, speedAt, trainLength,','PLAYER,');
await writeFile('upstream/src/sim/track.ts',track);
let player=await readFile('upstream/src/view/player.ts','utf8');
player=patch(player,"import { applyCampusRunner } from '../ciac/campus-runner';","import { applyCampusRunner, correctCampusContact } from '../ciac/campus-runner';");
// Both menu and game need the actual pose evaluated before fitting the sole.
player=patch(player,'    this.mixer.update(dt);\n  }\n}', '    this.mixer.update(dt);\n    correctCampusContact(this.model, sim.groundY + .008);\n  }\n}');
player=patch(player,'    this.mixer.update(dt);\n  }\n\n  update(', '    this.mixer.update(dt);\n    correctCampusContact(this.model, .008);\n  }\n\n  update(');
await writeFile('upstream/src/view/player.ts',player);

// Keep lateral travel speed bounded when another command retargets an unfinished
// transition. A two-lane gesture chain must not cover twice the distance in .15s.
let sim=await readFile('upstream/src/sim/sim.ts','utf8');
sim=patch(sim,'  laneT = 1;', '  laneT = 1;\n  private laneDuration = PLAYER.laneTime;');
sim=patch(sim,'    this.lane = target;',`    this.laneDuration = Math.max(.06, PLAYER.laneTime * Math.abs(laneX(target) - this.x) / (laneX(1)-laneX(0)));
    this.lane = target;`);
sim=patch(sim,'dt / PLAYER.laneTime', 'dt / this.laneDuration');
sim=patch(sim,'    this.lane = back;',`    this.laneDuration = Math.max(.06, PLAYER.laneTime * Math.abs(laneX(back) - this.x) / (laneX(1)-laneX(0)));
    this.lane = back;`);
await writeFile('upstream/src/sim/sim.ts',sim);

player=await readFile('upstream/src/view/player.ts','utf8');
player=patch(player,"      if (e.type === 'jump') {", "      if (e.type === 'jump') {\n        this.squash = 0;");
player=patch(player,"(this.current === 'roll' && sim.sliding)","(this.current === 'roll' && sim.sliding && sim.grounded)");
// A roll held at the edge resumes its remaining animation on landing, rather
// than showing a standing/falling pose with the short physical body.
player=patch(player,"else if (sim.grounded && !sim.sliding) this.play('run', 0.12, this.runRate);",`else if (sim.grounded && sim.sliding) {
          this.play('roll', .06, this.actions.roll.getClip().duration / (PLAYER.slideTime * 1.05));
          this.actions.roll.time = this.actions.roll.getClip().duration * (1 - sim.slideT / PLAYER.slideTime);
        } else if (sim.grounded) this.play('run', 0.12, this.runRate);`);
await writeFile('upstream/src/view/player.ts',player);

world=await readFile('upstream/src/view/world.ts','utf8');
world=patch(world,'  private camY = 0;', '  private camY = 0;\n  private camSupport = 0;');
world=world.replaceAll('    this.camY = 0;', '    this.camY = 0;\n    this.camSupport = 0;');
world=patch(world,'    const target = sim.y - Math.min(0.9, Math.max(0, sim.y - sim.groundY) * 0.55);',`    // Filtering support separately removes the discontinuous 0.9m target
    // change when feet leave a roof, while preserving a view of the landing.
    this.camSupport += (sim.groundY - this.camSupport) * (1 - Math.exp(-dt * 6));
    const target = this.camSupport + (sim.y - this.camSupport) * .45;`);
world=patch(world,'(sim.speed - 12) / 15', '(speedAt(sim.d) - 12) / 15');
world=patch(world,'speedFactor * 14', 'speedFactor * 8');
// The original import has no speedAt; extend it without a second module binding.
world=patch(world,'import { LANE_W,', 'import { speedAt, LANE_W,');
await writeFile('upstream/src/view/world.ts',world);
