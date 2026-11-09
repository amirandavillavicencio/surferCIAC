import { access, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const original = ['index.html', 'src/main.ts', 'src/sim/track.ts', 'src/config.ts',
  'src/sim/sim.ts', 'src/sim/types.ts', 'src/audio.ts', 'src/input.ts', 'src/ui.ts', 'src/view/world.ts', 'src/view/player.ts', 'src/view/textures.ts'];
if (execFileSync('git', ['-C', 'upstream', 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim() !==
    '79f9159d97c618bf9741b480872c87e4dab16417') throw new Error('Submódulo inesperado');
for (const path of original) {
  const content = execFileSync('git', ['-C', 'upstream', 'show', 'HEAD:' + path]);
  await writeFile('upstream/' + path, content);
}

await access('upstream/src/main.ts');
await mkdir('upstream/public/assets', {recursive:true});
await copyFile('ciac/ciac-logo.png', 'upstream/public/assets/ciac-logo.png');
await mkdir('upstream/src/ciac', {recursive:true});
await copyFile('ciac/course.ts','upstream/src/ciac/course.ts');
await copyFile('ciac/pace.ts','upstream/src/ciac/pace.ts');
await copyFile('ciac/campus-runner.ts','upstream/src/ciac/campus-runner.ts');
await copyFile('ciac/swipe.ts','upstream/src/ciac/swipe.ts');
await copyFile('ciac/game.ts','upstream/src/ciac/game.ts');
for (const name of ['missions', 'shield-view', 'gameplay-audio', 'academic-powerups']) {
  await copyFile(`ciac/${name}.ts`, `upstream/src/ciac/${name}.ts`);
}
await copyFile('ciac/game.css','upstream/src/ciac/game.css');
await copyFile('ciac/answer-track.ts','upstream/src/ciac/answer-track.ts');
await copyFile('ciac/race-fx.ts','upstream/src/ciac/race-fx.ts');
await copyFile('ciac/race-fx.css','upstream/src/ciac/race-fx.css');
await copyFile('ciac/i18n.ts','upstream/src/i18n.ts');
// El cargador HTML se muestra antes de ejecutar el motor.
const indexFile = 'upstream/index.html';
let html = await readFile(indexFile, 'utf8');
html = html.replace('<html lang="en">', '<html lang="es">');
html = html.replace('<link rel="icon" href="./favicon.ico" />',
  '<link rel="icon" type="image/png" href="/assets/ciac-logo.png" />\n<link rel="apple-touch-icon" href="/assets/ciac-logo.png" />');
html = html.replace('<meta name="description" content="A three-lane endless runner made with three.js" />',
  '<meta name="description" content="Carrera CIAC, juego académico de carreras del CIAC." />');
html = html.replace('<title>Subway Run</title>', '<title>Carrera CIAC</title>');
html = html.replace('<h1 id="ld-title">Subway Run</h1>', '<img class="ciac-brand-logo" src="/assets/ciac-logo.png" alt="CIAC" />\n  <h1 id="ld-title">Carrera CIAC</h1>');
html = html.replace(/var T = \{ 'zh-TW': [^\n]+\}\[lang\];/, "var T = ['Carrera CIAC', 'Descargando', 'Preparando…'];");
html = html.replace('#ui{position:fixed;inset:0;touch-action:none}', '#ui{position:fixed;inset:0;touch-action:none;overscroll-behavior:none}');
html = html.replace('</style>', `
.ciac-brand-logo{display:block;width:min(176px,58vw);height:auto;margin:0 auto;border-radius:10px;background:#f3f3f3}
.screen.start .ciac-brand-logo{align-self:center}
@media (orientation:landscape) and (max-height:500px){.screen.start .ciac-brand-logo{width:112px}}
</style>`);
await writeFile(indexFile, html);
const file = 'upstream/src/main.ts';
let source = await readFile(file,'utf8');
if (!source.includes("import { CIACQuiz } from './ciac/game';")) {
  const changes = [
    ["import { load, save } from './storage';",
     "import { load, save } from './storage';\nimport { CIACQuiz } from './ciac/game';\nimport { RaceFX } from './ciac/race-fx';"],
    ["    const dt = Math.min(0.05, (now - last) / 1000);",
     "    const elapsed = (now - last) / 1000;\n    const dt = Math.min(0.05, elapsed);"],
    ["    watchPerf(dt);", "    if (elapsed < 0.25) watchPerf(elapsed);"],
    ["        if (gap < 90 && !horned.has(o.id))", "        if (o.d0 > sim.d && gap < 90 && !horned.has(o.id))"],
    ["  let seed = (Date.now() % 100000) + 1;",
     "  const quiz = new CIACQuiz({\n    scene: world.scene,\n    notice: (message: string) => ui.toast(message),\n    course: sim.track.course,\n    frontier: () => sim.track.frontier,\n    penalize: (seconds: number) => sim.pace.penalize(seconds),\n  });\n  const raceFX = new RaceFX(document.getElementById('ui')!);\n  let seed = (Date.now() % 100000) + 1;"],
    ["    overTimer = 0;\n    state = 'start';",
     "    overTimer = 0;\n    quiz.reset(); raceFX.reset();\n    state = 'start';"],
    ["    ui.show('play');\n  }\n  function pause() {",
     "    ui.show('play');\n    if (!TEST) void quiz.start();\n  }\n  function pause() {"],
    ["    audio.unlock();\n    if (a === 'pause') pause();",
     "    audio.unlock();\n    if (!TEST && quiz.handleAction(a)) return;\n    if (a === 'pause') pause();"],
    ["        overTimer = 0;\n        break;",
     "        overTimer = 0;\n        if (!TEST) quiz.endRun();\n        break;"],
    ["  let seed = (Date.now() % 100000) + 1;\n",
     "  let tutorialDone = load('tutorialDone', false);\n  let seed = (Date.now() % 100000) + 1;\n"],
    ["sim.reset(seed, !load('tutorialDone', false));", "sim.track.course.reset(!TEST); sim.reset(seed, !tutorialDone);"],
    ["    if (state === 'play' && sim.d > 260 && !load('tutorialDone', false)) save('tutorialDone', true);",
     "    if (state === 'play' && sim.d > 260 && !tutorialDone) {\n      tutorialDone = true;\n      save('tutorialDone', true);\n    }"],
    ["    if (state === 'play') sim.update(dt);",
     "    if (state === 'play' && !TEST) {\n      quiz.tick(sim.d, sim.lane);\n      sim.questionGate = quiz.activeGate;\n    }\n    if (state === 'play') sim.update(dt);\n    if (state === 'play' && !TEST && sim.alive) quiz.tick(sim.d, sim.lane);"],
    ["    world.sync(sim, state === 'pause' ? 0 : dt, state === 'start');",
     "    world.sync(sim, state === 'pause' ? 0 : dt, state === 'start');\n    if (!TEST && state !== 'start' && sim.alive) quiz.render(sim.d);\n    if (!TEST) {\n      raceFX.update(sim, world, dt, state === 'play', quiz.questionSlow);\n    }"],
  ];
  for (const [before, after] of changes) {
    if (source.split(before).length !== 2) throw new Error('La versión original cambió: no se encontró un único punto de integración: ' + before);
    source = source.replace(before, after);
  }
  const scenery = source.indexOf('  // houses load after');
  const testEntry = source.indexOf('  if (TEST) {', scenery);
  if (scenery < 0 || testEntry < 0) throw new Error('Carga original del escenario cambió');
  source = (source.slice(0, scenery) + source.slice(testEntry)).replace('      sceneryReady,\n', '');

  source = source.replace('  world.warm(renderer);', '  if (!TEST) quiz.render(sim.d);\n  world.warm(renderer);');

  // Mantener el generador y su comprobación de rutas esquivables.
  const trackPath = 'upstream/src/sim/track.ts';
  let track = await readFile(trackPath,'utf8');
  const oldWeight = 'mt: L < 0.12 ? 0 : 0.06 + 0.22 * L,';
  if (track.split(oldWeight).length !== 2) throw new Error('Patrón original de trenes cambió');
  track = track.replace(oldWeight, 'mt: 0.17 + 0.10 * L,');
  track = "import { QuizCourse } from '../ciac/course';\n" + track;
  track = track.replace('  rng: Rng;', '  readonly course = new QuizCourse();\n  rng: Rng;');
  track = track.replace('    const specs: Spec[] = [', '    let specs: Spec[] = [');
  track = track.replace('    const res = solve(specs, s, end,', '    specs = this.course.prepareSpecs(specs);\n    const res = solve(specs, s, end,');
  track = track.replace('specs = this.buildRows(start, end, lvl, v, attempt > 18, busy);',
    'specs = this.course.prepareSpecs(this.buildRows(start, end, lvl, v, attempt > 18, busy));');
  track = track.replace('    this.sink.coin(lane, d, y);', '    if (this.course.allowsPickup(d)) this.sink.coin(lane, d, y);');
  track = track.replace('this.sink.coin(lane, d, 0.85);', 'if (this.course.allowsPickup(d)) this.sink.coin(lane, d, 0.85);');
  track = track.replace('      if (clear) {', '      if (clear && this.course.allowsPickup(d)) {');
  track = track.replace("      specs.push({ kind, lane: l, d0: at, d1: at + OB[kind].depth });",
    "      const spec: Spec = { kind, lane: l, d0: at, d1: at + OB[kind].depth };\n      if (!this.course.allowsObstacle(spec)) return;\n      specs.push(spec);");
  track = track.replace('      const cars = r.int(1, maxCars);',
    '      const cars = r.int(1, maxCars);\n      const far = at + (withRamp ? OB.ramp.depth : 0) + trainLength(cars);\n      if (!this.course.allowsObstacle({kind: \'train\', lane:l, d0:at, d1:far, cars})) return false;');
  track = track.replace('      const len = trainLength(cars);',
    '      const len = trainLength(cars);\n      if (!this.course.allowsObstacle({kind: \'mtrain\', lane:l, d0:at, d1:at + len / (1 + MOVER.ratio), cars})) return false;');

  await writeFile(trackPath, track);

  const configPath = 'upstream/src/config.ts';
  let config = await readFile(configPath,'utf8');
  const oldMover = 'export const MOVER = { ratio: 0.6, trigger: 70 };';
  if (config.split(oldMover).length !== 2) throw new Error('Parámetros originales del tren cambiaron');
  config = config.replace(oldMover, 'export const MOVER = { ratio: 1.0, trigger: 115 };');
  await writeFile(configPath,config);

  const simPath = 'upstream/src/sim/sim.ts';
  let simSource = await readFile(simPath, 'utf8');
  const replaceSim = (before, after) => {
    if (simSource.split(before).length !== 2) throw new Error('Simulación original cambió: ' + before);
    simSource = simSource.replace(before, after);
  };
  simSource = "import { RacePace } from '../ciac/pace';\n" + simSource;
  replaceSim('  speedOverride = 0;', '  speedOverride = 0;\n  readonly pace = new RacePace();\n  questionGate = Infinity;');
  replaceSim('    this.track.reset(seed, tutorial);', '    this.pace.reset();\n    this.questionGate = Infinity;\n    this.track.reset(seed, tutorial);');
  replaceSim('const base = this.speedOverride || speedAt(this.d);',
    'const base = this.speedOverride || speedAt(this.d) * this.pace.step(dt, this.d, this.questionGate);');
  replaceSim('if (magnet && ahead < MAGNET_RANGE && ahead > -2) c.pulled = true;',
    'if (magnet && ahead < MAGNET_RANGE && ahead > -2 && !this.track.course.intersects(Math.min(this.d, c.d), Math.max(this.d, c.d))) c.pulled = true;');
  await writeFile(simPath, simSource);

  const inputPath = 'upstream/src/input.ts';
  const input = await readFile(inputPath, 'utf8');
  const swipe = input.indexOf('  // A swipe is read');
  if (swipe < 0) throw new Error('Controles originales cambiaron');
  await writeFile(inputPath, "import { bindSwipe } from './ciac/swipe';\n" + input.slice(0, swipe) + '  bindSwipe(target, on, canSwipe);\n}\n');

  const uiPath = 'upstream/src/ui.ts';
  let ui = await readFile(uiPath, 'utf8');
const menuTitle = '          <h1 data-k="title"></h1>';
if (ui.split(menuTitle).length !== 2) throw new Error('No se encontró el título único del menú');
ui = ui.replace(menuTitle,
  '          <img class="ciac-brand-logo" src="/assets/ciac-logo.png" alt="CIAC" />\\n' + menuTitle);
  const focusPause = "    if (s === 'pause') this.el['btn-resume'].focus({ preventScroll: true });";
  if (ui.split(focusPause).length !== 2) throw new Error('Foco original de pausa cambió');
  await writeFile(uiPath, ui.replace(focusPause, focusPause + `
    if (s === 'play' && document.activeElement instanceof HTMLElement &&
        document.activeElement.closest('.screen')) document.activeElement.blur();`));

  const worldPath = 'upstream/src/view/world.ts';
  let world = await readFile(worldPath, 'utf8');
  const replaceWorld = (before, after) => {
    if (world.split(before).length !== 2) throw new Error('Escena original cambió: ' + before);
    world = world.replace(before, after);
  };
  const removeWorldSection = (start, end) => {
    const from = world.indexOf(start);
    const to = world.indexOf(end, from + 1);
    if (from < 0 || to < 0) throw new Error('Escena original cambió: ' + start);
    world = world.slice(0, from) + world.slice(to);
  };
  replaceWorld("import { Rng } from '../sim/rng';\n", '');
  removeWorldSection('interface House', 'export class World');
  removeWorldSection('  private houses:', '  private camY');
  removeWorldSection('  /** Houses arrive later', '  resize(');
  removeWorldSection('  private syncHouses(', '  resetScenery(');
  replaceWorld('    this.syncHouses(pd, zOf);\n', '');
  replaceWorld('    this.placed = [];\n    this.nextHouse = [-60, -60];', '    this.camX = 0;\n    this.camY = 0;');
  replaceWorld(', ...this.houses', '');
  replaceWorld('  private camY = 0;', '  private camY = 0;\n  private camX = 0;\n  private readonly movers: Ob[] = [];');
  replaceWorld('    const movers: Ob[] = [];', '    const movers = this.movers;\n    movers.length = 0;');
  replaceWorld('    const gold = new THREE.Color(1.0, 0.75, 0.25).multiplyScalar(0.55);', '    const gold = COIN_GLOW;');
  replaceWorld('const LIGHT =', 'const COIN_GLOW = new THREE.Color(1.0, 0.75, 0.25).multiplyScalar(0.55);\nconst LIGHT =');
  replaceWorld('const LIGHT_RED =', 'const lightTint = new THREE.Color();\nconst LIGHT_RED =');
  world = world.replaceAll('LIGHT.clone()', 'lightTint.copy(LIGHT)').replaceAll('LIGHT_RED.clone()', 'lightTint.copy(LIGHT_RED)');
  replaceWorld("{ cast: true, name: 'pole' }", "{ name: 'pole' }");
  replaceWorld('    this.buildGround();', `    this.buildGround();
    // Low foothills at the far end of the corridor, behind all playable geometry.
    const hills = new THREE.IcosahedronGeometry(1, 0);
    const hillsMat = new THREE.MeshBasicMaterial({ color: 0x728d9d, fog: false });
    const skyline = new THREE.InstancedMesh(hills, hillsMat, 8);
    for (let i = 0; i < skyline.count; i++) {
      const x = (i - 3.5) * 33;
      const height = 12 + Math.abs(i - 3.5) * 6;
      m4.makeScale(31, height, 13).setPosition(x, -3, -194 - (i % 2) * 12);
      skyline.setMatrixAt(i, m4);
    }
    s.add(skyline);`);
  replaceWorld('    const sx = sim.x * 0.72;', '    this.camX += (sim.x * 0.66 - this.camX) * (1 - Math.exp(-dt * 10));');
  replaceWorld('Math.min(1, dt * 5)', '(1 - Math.exp(-dt * 5))');
  replaceWorld('Math.min(1, dt * 3)', '(1 - Math.exp(-dt * 3))');
  replaceWorld('this.shake * 0.5', 'this.shake * 0.25');
  replaceWorld('cam.position.set(sx + ox, this.camY + height + oy, dist);', 'cam.position.set(this.camX + ox, this.camY + height + oy, dist);');
  replaceWorld('const fov = 58 + portrait * 17 + speedFactor * 10;', 'const fov = 59 + portrait * 17 + speedFactor * 14;');
  replaceWorld('cam.lookAt(sim.x * 0.85, this.camY + 1.25, -8);', 'cam.lookAt(this.camX, this.camY + 1.25, -8);');
  replaceWorld('    const target = sim.grounded ? sim.y : Math.max(sim.groundY, Math.min(sim.y, this.camY + 1.0));', '    const target = sim.groundY + (sim.y - sim.groundY) * 0.36 - (sim.sliding ? 0.14 : 0);');
  await writeFile(worldPath, world);

  const playerPath = 'upstream/src/view/player.ts';
  let player = await readFile(playerPath, 'utf8');
  const landing = 'this.squash = Math.min(0.22, 0.08 + e.fall * 0.04);';
  if (player.split(landing).length !== 2) throw new Error('Animación de aterrizaje original cambió');
  player = player.replace(landing, 'this.squash = Math.min(0.15, 0.04 + e.fall * 0.035);');
  player = player.replace('timeScale = 1) {', 'timeScale = 1, restart = false) {');
  player = player.replace("d / (air * 1.1));", "d / (air * 1.1), true);");
  player = player.replace("/ (PLAYER.slideTime * 1.05));", "/ (PLAYER.slideTime * 1.05), true);");
  player = player.replace("this.play('runlookback', 0.08, 1.8);", "this.play('runlookback', 0.08, 1.8, true);");
  player = player.replace('if (this.current === name && next.isRunning()) return;', 'if (this.current === name && !restart) return;');
  player = player.replaceAll('0.9 + sim.speed / 22', '(0.9 + speedAt(sim.d) / 22) * sim.speed / speedAt(sim.d)');
  player = player.replace('GRAVITY, laneX', 'GRAVITY, laneX, speedAt');
  player = player.replace("(this.current === 'jump' && !sim.grounded)", "(this.current === 'jump' && !sim.grounded && this.actions.jump.isRunning())");
  player = player.replace("if (!sim.grounded && sim.vy < -3 && this.current !== 'jump')", "if (!sim.grounded && sim.vy < -3 && (this.current !== 'jump' || !this.actions.jump.isRunning()))");
  await writeFile(playerPath, player);
  await writeFile(file, source);
}
await import('./train-motion.mjs');
await import('./render-actors.mjs');
await import('./polish-game.mjs');
console.log('Integración CIAC preparada sobre el motor original.');

await import("./train-dynamics.mjs");

await import("./presentation.mjs");

await import("./resource-integration.mjs");

await import('./visual-finish.mjs');

await import('./skater.mjs');

await import('./certamen.mjs');
