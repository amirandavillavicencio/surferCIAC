import { access, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

await access('upstream/src/main.ts');
await mkdir('upstream/src/ciac', {recursive:true});
await copyFile('ciac/swipe.ts','upstream/src/ciac/swipe.ts');
await copyFile('ciac/game.ts','upstream/src/ciac/game.ts');
await copyFile('ciac/game.css','upstream/src/ciac/game.css');
await copyFile('ciac/answer-track.ts','upstream/src/ciac/answer-track.ts');
await copyFile('ciac/race-fx.ts','upstream/src/ciac/race-fx.ts');
await copyFile('ciac/race-fx.css','upstream/src/ciac/race-fx.css');
await copyFile('ciac/i18n.ts','upstream/src/i18n.ts');
// El cargador HTML se muestra antes de ejecutar el motor.
const indexFile = 'upstream/index.html';
let html = await readFile(indexFile, 'utf8');
html = html.replace('<html lang="en">', '<html lang="es">');
html = html.replace('<title>Subway Run</title>', '<title>Surfer CIAC</title>');
html = html.replace('<h1 id="ld-title">Subway Run</h1>', '<h1 id="ld-title">Surfer CIAC</h1>');
html = html.replace(/var T = \{ 'zh-TW': [^\n]+\}\[lang\];/, "var T = ['Surfer CIAC', 'Descargando', 'Preparando…'];");
html = html.replace('#ui{position:fixed;inset:0;touch-action:none}', '#ui{position:fixed;inset:0;touch-action:none;overscroll-behavior:none}');
await writeFile(indexFile, html);
const file = 'upstream/src/main.ts';
let source = await readFile(file,'utf8');
if (!source.includes("import { CIACQuiz } from './ciac/game';")) {
  const changes = [
    ["import { load, save } from './storage';",
     "import { load, save } from './storage';\nimport { CIACQuiz } from './ciac/game';\nimport { RaceFX } from './ciac/race-fx';"],
    ["  let seed = (Date.now() % 100000) + 1;",
     "  const quiz = new CIACQuiz({\n    scene: world.scene,\n    notice: (message: string) => ui.toast(message),\n  });\n  const raceFX = new RaceFX(document.getElementById('ui')!);\n  const clearQuizCorridor = () => {\n    const until = quiz.safeCorridorUntil;\n    if (until <= sim.d) return;\n    sim.clearObstaclesUntil(until);\n  };\n  let seed = (Date.now() % 100000) + 1;"],
    ["    overTimer = 0;\n    state = 'start';",
     "    overTimer = 0;\n    if (!TEST) { quiz.reset(); raceFX.reset(); }\n    state = 'start';"],
    ["    ui.show('play');\n  }\n  function pause() {",
     "    ui.show('play');\n    if (!TEST) void quiz.start();\n  }\n  function pause() {"],
    ["    audio.unlock();\n    if (a === 'pause') pause();",
     "    audio.unlock();\n    if (!TEST && quiz.handleAction(a)) return;\n    if (a === 'pause') pause();"],
    ["        overTimer = 0;\n        break;",
     "        overTimer = 0;\n        if (!TEST) quiz.endRun();\n        break;"],
    ["    if (state === 'play') sim.update(dt);",
     "    if (state === 'play' && !TEST) {\n      quiz.tick(sim.d, dt, sim.lane);\n      sim.speedOverride = quiz.slowed ? speedAt(sim.d) * 0.55 : 0;\n      clearQuizCorridor();\n    }\n    if (state === 'play') sim.update(dt);\n    if (state === 'play' && !TEST) clearQuizCorridor();"],
    ["    world.sync(sim, state === 'pause' ? 0 : dt, state === 'start');",
     "    world.sync(sim, state === 'pause' ? 0 : dt, state === 'start');\n    if (!TEST) raceFX.update(sim, world, dt, state === 'play', quiz.safeCorridorUntil > sim.d);"],
  ];
  for (const [before, after] of changes) {
    if (source.split(before).length !== 2) throw new Error('La versión original cambió: no se encontró un único punto de integración: ' + before);
    source = source.replace(before, after);
  }
  const scenery = source.indexOf('  // houses load after');
  const testEntry = source.indexOf('  if (TEST) {', scenery);
  if (scenery < 0 || testEntry < 0) throw new Error('Carga original del escenario cambió');
  source = (source.slice(0, scenery) + source.slice(testEntry)).replace('      sceneryReady,\n', '');

  // Mantener el generador y su comprobación de rutas esquivables.
  const trackPath = 'upstream/src/sim/track.ts';
  let track = await readFile(trackPath,'utf8');
  const oldWeight = 'mt: L < 0.12 ? 0 : 0.06 + 0.22 * L,';
  if (track.split(oldWeight).length !== 2) throw new Error('Patrón original de trenes cambió');
  track = track.replace(oldWeight, 'mt: 0.17 + 0.10 * L,');
  await writeFile(trackPath, track);

  const configPath = 'upstream/src/config.ts';
  let config = await readFile(configPath,'utf8');
  const oldMover = 'export const MOVER = { ratio: 0.6, trigger: 70 };';
  if (config.split(oldMover).length !== 2) throw new Error('Parámetros originales del tren cambiaron');
  config = config.replace(oldMover, 'export const MOVER = { ratio: 0.70, trigger: 85 };');
  await writeFile(configPath,config);

  const simPath = 'upstream/src/sim/sim.ts';
  const simSource = await readFile(simPath, 'utf8');
  const clearWorld = '  clearWorld() {';
  if (simSource.split(clearWorld).length !== 2) throw new Error('Reciclaje original cambió');
  await writeFile(simPath, simSource.replace(clearWorld, `  clearObstaclesUntil(until: number) {
    for (let i = this.obs.length - 1; i >= 0; i--) {
      const obstacle = this.obs[i];
      const start = obstacle.kind === 'mtrain' ? obstacle.meet : obstacle.d0;
      const end = obstacle.kind === 'mtrain' ? obstacle.meet + moverSpan(obstacle.len) : obstacle.d1;
      if (Math.min(start, obstacle.d0) >= until || Math.max(end, obstacle.d1) <= this.d - 12) continue;
      this.freeObs.push(obstacle);
      this.obs.splice(i, 1);
    }
  }

` + clearWorld));

  const inputPath = 'upstream/src/input.ts';
  const input = await readFile(inputPath, 'utf8');
  const swipe = input.indexOf('  // A swipe is read');
  if (swipe < 0) throw new Error('Controles originales cambiaron');
  await writeFile(inputPath, "import { bindSwipe } from './ciac/swipe';\n" + input.slice(0, swipe) + '  bindSwipe(target, on, canSwipe);\n}\n');

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
  replaceWorld('this.shake * 0.5', 'this.shake * 0.25');
  replaceWorld('cam.position.set(sx + ox, this.camY + height + oy, dist);', 'cam.position.set(this.camX + ox, this.camY + height + oy, dist);');
  replaceWorld('const fov = 58 + portrait * 17 + speedFactor * 10;', 'const fov = 59 + portrait * 17 + speedFactor * 12;');
  replaceWorld('cam.lookAt(sim.x * 0.85, this.camY + 1.25, -8);', 'cam.lookAt(this.camX, this.camY + 1.25, -8);');
  replaceWorld('    const target = sim.grounded ? sim.y : Math.max(sim.groundY, Math.min(sim.y, this.camY + 1.0));', '    const target = sim.groundY + (sim.y - sim.groundY) * 0.36 - (sim.sliding ? 0.14 : 0);');
  await writeFile(worldPath, world);

  const playerPath = 'upstream/src/view/player.ts';
  let player = await readFile(playerPath, 'utf8');
  const landing = 'this.squash = Math.min(0.22, 0.08 + e.fall * 0.04);';
  if (player.split(landing).length !== 2) throw new Error('Animación de aterrizaje original cambió');
  player = player.replace(landing, 'this.squash = Math.min(0.15, 0.04 + e.fall * 0.035);');
  await writeFile(playerPath, player);
  await writeFile(file, source);
}
console.log('Integración CIAC preparada sobre el motor original.');
