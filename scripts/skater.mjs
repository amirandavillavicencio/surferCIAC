import { copyFile, readFile, writeFile } from 'node:fs/promises';

const patch = async (path, changes) => {
  let source = await readFile(path, 'utf8');
  for (const [before, after] of changes) {
    if (source.split(before).length !== 2) throw new Error('Integración del protagonista: ' + before);
    source = source.replace(before, after);
  }
  await writeFile(path, source);
};

const runnerFile = process.env.CIAC_RUNNER === 'stable'
  ? 'third_party/kenney-skater/skater-ciac.glb'
  : 'art/protagonista/protagonista-ciac.glb';
await copyFile(runnerFile, 'upstream/public/assets/protagonista-ciac.glb');

await patch('upstream/src/main.ts', [
  ['  const coreBuf = await boot.core;', `  const [coreBuf, runnerBuf] = await Promise.all([
    boot.core, fetchBuffer('assets/protagonista-ciac.glb')
  ]);`],
  ['  const [core, trainArt, cityModels] = await Promise.all([parseGLB(coreBuf), loadTrainArt(), loadCityArt()]);', `  const [core, trainArt, cityModels, runner] = await Promise.all([
    parseGLB(coreBuf), loadTrainArt(), loadCityArt(), parseGLB(runnerBuf)
  ]);
  runner.scene.name = 'ciac-protagonist';
  core.scene.add(runner.scene);`],
]);

await patch('upstream/src/view/player.ts', [
  ['applyCampusRunner, correctCampusContact', 'CampusRunner'],
  ['  private menuT = 0;', '  private menuT = 0;\n  private readonly runner: CampusRunner;'],
  ['    applyCampusRunner(model);', "    this.runner = new CampusRunner(holder, model, gltf.scene.getObjectByName('ciac-protagonist')!);"],
  ['    correctCampusContact(this.model, .008);', '    this.runner.update(.008);'],
  ['    correctCampusContact(this.model, sim.groundY + .008);', '    this.runner.update(sim.groundY + .008);'],
]);
