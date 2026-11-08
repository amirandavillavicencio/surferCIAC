import { copyFile, readFile, writeFile } from 'node:fs/promises';

const patch = async (path, changes) => {
  let source = await readFile(path, 'utf8');
  for (const [before, after] of changes) {
    if (source.split(before).length !== 2) throw new Error('Integración Skater: ' + before);
    source = source.replace(before, after);
  }
  await writeFile(path, source);
};

await copyFile('third_party/kenney-skater/skater-ciac.glb', 'upstream/public/assets/skater-ciac.glb');

await patch('upstream/src/main.ts', [
  ['  const coreBuf = await boot.core;', `  const [coreBuf, skaterBuf] = await Promise.all([
    boot.core, fetchBuffer('assets/skater-ciac.glb')
  ]);`],
  ['  const [core, trainArt, cityModels] = await Promise.all([parseGLB(coreBuf), loadTrainArt(), loadCityArt()]);', `  const [core, trainArt, cityModels, skater] = await Promise.all([
    parseGLB(coreBuf), loadTrainArt(), loadCityArt(), parseGLB(skaterBuf)
  ]);
  skater.scene.name = 'kenney-skater';
  core.scene.add(skater.scene);`],
]);

await patch('upstream/src/view/player.ts', [
  ['applyCampusRunner, correctCampusContact', 'CampusRunner'],
  ['  private menuT = 0;', '  private menuT = 0;\n  private readonly skater: CampusRunner;'],
  ['    applyCampusRunner(model);', "    this.skater = new CampusRunner(holder, model, gltf.scene.getObjectByName('kenney-skater')!);"],
  ['    correctCampusContact(this.model, .008);', '    this.skater.update(.008);'],
  ['    correctCampusContact(this.model, sim.groundY + .008);', '    this.skater.update(sim.groundY + .008);'],
]);
