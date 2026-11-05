import { access, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

await access('upstream/src/main.ts');
await mkdir('upstream/src/ciac', {recursive:true});
await copyFile('ciac/game.ts','upstream/src/ciac/game.ts');
await copyFile('ciac/game.css','upstream/src/ciac/game.css');
const file = 'upstream/src/main.ts';
let source = await readFile(file,'utf8');
if (!source.includes("import { CIACQuiz } from './ciac/game';")) {
  const changes = [
    ["import { load, save } from './storage';",
     "import { load, save } from './storage';\nimport { CIACQuiz } from './ciac/game';"],
    ["  let seed = (Date.now() % 100000) + 1;",
     "  const quiz = new CIACQuiz({\n    fail: () => { sim.alive = false; sim.events.push({ type: 'crash', kind: 'caught', x: sim.x, y: sim.y }); },\n    lane: (lane: number) => { sim.lane = lane; sim.x = laneX(lane); sim.fromX = sim.x; sim.laneT = 1; },\n    notice: (message: string) => ui.toast(message),\n  });\n  let seed = (Date.now() % 100000) + 1;"],
    ["    overTimer = 0;\n    state = 'start';",
     "    overTimer = 0;\n    if (!TEST) quiz.reset();\n    state = 'start';"],
    ["    ui.show('play');\n  }\n  function pause() {",
     "    ui.show('play');\n    if (!TEST) void quiz.start();\n  }\n  function pause() {"],
    ["    audio.unlock();\n    if (a === 'pause') pause();",
     "    audio.unlock();\n    if (!TEST && quiz.handleAction(a)) return;\n    if (a === 'pause') pause();"],
    ["        overTimer = 0;\n        break;",
     "        overTimer = 0;\n        if (!TEST) quiz.endRun();\n        break;"],
    ["    if (state === 'play') sim.update(dt);",
     "    if (state === 'play' && !TEST) quiz.tick(sim.d);\n    if (state === 'play' && (TEST || !quiz.active)) sim.update(dt);"],
  ];
  for (const [before, after] of changes) {
    if (source.split(before).length !== 2) throw new Error('La versión original cambió: no se encontró un único punto de integración: ' + before);
    source = source.replace(before, after);
  }
  await writeFile(file, source);
}
console.log('Integración CIAC preparada sobre el motor original sin reemplazar su escena 3D.');
