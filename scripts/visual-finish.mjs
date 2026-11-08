import {readFile,writeFile,copyFile,cp} from 'node:fs/promises';
await copyFile('ciac/city-art.ts','upstream/src/ciac/city-art.ts');
await cp('third_party/kenney-city','upstream/public/assets/kenney-city', {
  recursive: true, filter: path => !path.endsWith('README.md')
});
const patch=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Visual finish anchor: '+a);return s.replace(a,b);};
let world=await readFile('upstream/src/view/world.ts','utf8');
world="import {CityArt,type CityModels,isStationAt,ballastTexture,rewardCoin,obstacleFinish,rampDeck} from '../ciac/city-art';\n"+world;
world=patch(world,'  private railBed:RailBed;','  private railBed:RailBed;\n  private city:CityArt;');
world=patch(world,'constructor(core: GLTF, trainArt: TrainArt, quality:',
  'constructor(core: GLTF, trainArt: TrainArt, cityModels: CityModels, quality:');
world=patch(world,'    this.buildGround();','    this.buildGround();\n    this.city=new CityArt(s, cityModels);');
world=patch(world,`      m4.makeTranslation(SIDEWALK_IN + 0.3, 0.25, zOf(d));
      this.poles.add(m4);
      m4.makeRotationY(Math.PI).setPosition(-SIDEWALK_IN - 0.3, 0.25, zOf(d + 8));
      this.poles.add(m4);`,`      if (!isStationAt(d)) {
        m4.makeTranslation(SIDEWALK_IN + 0.3, 0.25, zOf(d));
        this.poles.add(m4);
      }
      if (!isStationAt(d + 8)) {
        m4.makeRotationY(Math.PI).setPosition(-SIDEWALK_IN - 0.3, 0.25, zOf(d + 8));
        this.poles.add(m4);
      }`);
world=patch(world,'    this.railBed.update(pd);','    this.railBed.update(pd);\n    this.city.update(pd);');
world=patch(world,'g.position.set(0, -0.02, z);','g.position.set(0, -0.12, z);');
world=world.replaceAll('= trackTexture();','= ballastTexture();');
world=world.replace('trackTexture, pavingTexture','pavingTexture');
world=patch(world,"    const coin = node('coin');",'    const coin = rewardCoin();');
world=patch(world,'s.fog = new THREE.Fog(HORIZON, 40, 180);','s.fog = new THREE.Fog(HORIZON, 55, 200);');
world=patch(world,'0x8a7a62, 1.35','0x68788a, 1.05');
world=patch(world,'0xfff1dc, 2.1','0xffe8cb, 2.35');
world=patch(world,'this.sun.position.set(9, 22, 4);','this.sun.position.set(-12, 22, 8);');
world=patch(world,'const height = 2.75 + portrait * 1.5;','const height = 2.9 + portrait * 1.5;');
world=patch(world,'const fov = 59 + portrait * 17 + speedFactor * 8;','const fov = 59 + portrait * 14 + speedFactor * 8;');
world=patch(world,'multiplyScalar(0.55)','multiplyScalar(0.26)');
world=patch(world,'sc.set(1.5, 1.5, 1.5)','sc.set(1.05, 1.05, 1.05)');
world=world.replace('powerTexture, rampTexture, HORIZON','powerTexture, HORIZON');
world=patch(world,'map: rampTexture()','map: rampDeck()');
for(const kind of ['low','hurdle','overhead'])world=patch(world,`new Instanced(node('${kind}'),`, `new Instanced(obstacleFinish(node('${kind}'),'${kind}'),`);
await writeFile('upstream/src/view/world.ts',world);

const mainPath='upstream/src/main.ts';
let main=await readFile(mainPath,'utf8');
main="import {loadCityArt} from './ciac/city-art';\n"+main;
main=patch(main,'const [core, trainArt] = await Promise.all([parseGLB(coreBuf), loadTrainArt()]);',
  'const [core, trainArt, cityModels] = await Promise.all([parseGLB(coreBuf), loadTrainArt(), loadCityArt()]);');
main=patch(main,'new World(core, trainArt, {','new World(core, trainArt, cityModels, {');
await writeFile(mainPath,main);
