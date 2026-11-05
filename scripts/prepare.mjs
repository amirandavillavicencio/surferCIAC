import { access, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

await access('upstream/src/main.ts');
await mkdir('upstream/src/ciac', {recursive:true});
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
await writeFile(indexFile, html);
const file = 'upstream/src/main.ts';
let source = await readFile(file,'utf8');
if (!source.includes("import { CIACQuiz } from './ciac/game';")) {
  const changes = [
    ["import { load, save } from './storage';",
     "import { load, save } from './storage';\nimport { CIACQuiz } from './ciac/game';\nimport { RaceFX } from './ciac/race-fx';"],
    ["  let seed = (Date.now() % 100000) + 1;",
     "  const quiz = new CIACQuiz({\n    scene: world.scene,\n    notice: (message: string) => ui.toast(message),\n  });\n  const raceFX = new RaceFX(document.getElementById('ui')!);\n  const clearQuizCorridor = () => {\n    const until = quiz.safeCorridorUntil;\n    if (until <= sim.d) return;\n    for (let i = sim.obs.length - 1; i >= 0; i--) {\n      const ob = sim.obs[i];\n      const overlaps = ob.d0 < until && ob.d1 > sim.d - 12;\n      const movingTrain = ob.kind === 'mtrain' && ob.meet < until && ob.meet > sim.d - 12;\n      if (overlaps || movingTrain) sim.obs.splice(i, 1);\n    }\n  };\n  let seed = (Date.now() % 100000) + 1;"],
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
  await writeFile(file, source);

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

  const worldPath = 'upstream/src/view/world.ts';
  let world = await readFile(worldPath,'utf8');
  const oldFov = 'const fov = 58 + portrait * 17 + speedFactor * 10;';
  if (world.split(oldFov).length !== 2) throw new Error('Cámara original cambió');
  world = world.replace(oldFov, 'const fov = 59 + portrait * 17 + speedFactor * 15;');
  await writeFile(worldPath,world);
}
console.log('Integración CIAC preparada sobre el motor original sin reemplazar su escena 3D.');
