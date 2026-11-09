import { copyFile, readFile, writeFile } from 'node:fs/promises';

await copyFile('art/certamen/certamen.glb', 'upstream/public/assets/certamen.glb');

async function patch(path, changes) {
  let source = await readFile(path, 'utf8');
  for (const [before, after] of changes) {
    if (source.split(before).length !== 2) throw new Error('Integración del Certamen: ' + before);
    source = source.replace(before, after);
  }
  await writeFile(path, source);
}

await patch('upstream/src/main.ts', [
  ['[coreBuf, runnerBuf]', '[coreBuf, runnerBuf, certamenBuf]'],
  ["fetchBuffer('assets/protagonista-ciac.glb')", "fetchBuffer('assets/protagonista-ciac.glb'), fetchBuffer('assets/certamen.glb')"],
  ['[core, trainArt, cityModels, runner]', '[core, trainArt, cityModels, runner, certamen]'],
  ['parseGLB(runnerBuf)', 'parseGLB(runnerBuf), parseGLB(certamenBuf)'],
  ['new World(core, trainArt, cityModels,', 'new World(core, trainArt, cityModels, certamen,'],
]);

await patch('upstream/src/view/world.ts', [
  ['cityModels: CityModels, quality:', 'cityModels: CityModels, certamen: GLTF, quality:'],
]);
