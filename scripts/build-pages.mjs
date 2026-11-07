import {access,cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

const source=JSON.parse(await readFile('sprint-source.json','utf8'));
for(const [name,hash] of Object.entries(source.files)){
  const actual=createHash('sha256').update(await readFile('sprint/'+name)).digest('hex');
  if(actual!==hash)throw Error('Original source changed: '+name);
}
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
// Ship every original file, including the standalone game, all resources,
// optional tools and Unity reference. No assets or mechanics are substituted.
await cp('sprint','dist',{recursive:true});
await build({entryPoints:['ciac/sprint/adapter.ts'],outfile:'dist/ciac/adapter.js',bundle:true,format:'iife',target:'es2020',legalComments:'eof',
  plugins:[{name:'source-three-r128',setup(b){b.onResolve({filter:/^three$/},()=>({path:resolve('ciac/sprint/three.ts')}));}}]});
const patch=(s,a,b)=>{if(s.split(a).length!==2)throw Error('CIAC source hook missing/duplicated: '+a);return s.replace(a,b);};
let main=await readFile('sprint/js/main.js','utf8');
main=patch(main,'    this.player.applySkin(savedSkin);','    this.player.applySkin(savedSkin);\n    this.ciac = new SprintCIAC(this);');
main=patch(main,'    this.player.reset();\n    this.collectibles.clear();\n    this.world.clear();','    this.player.reset();\n    this.collectibles.clear();\n    this.ciac.startRun();\n    this.world.clear();');
main=patch(main,'    if (this.currentState === this.STATE.PLAYING) {\n      // 1. Move Player','    if (this.currentState === this.STATE.PLAYING) {\n      this.ciac.beforeStep(delta);\n      // 1. Move Player');
main=patch(main,'      this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + (this.distance / 100) * this.speedAcceleration);','      this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + (this.distance / 100) * this.speedAcceleration) * this.ciac.factor;');
main=patch(main,'      // 6. VFX & HUD','      this.ciac.afterStep();\n\n      // 6. VFX & HUD');
main=patch(main,'    this.currentState = this.STATE.GAMEOVER;','    this.currentState = this.STATE.GAMEOVER;\n    this.ciac.suspend();');
main=patch(main,'  quitToMenu() {','  quitToMenu() {\n    this.ciac.endRun();');
main=patch(main,'  revivePlayer() {','  revivePlayer() {\n    this.ciac.resume();');
await writeFile('dist/js/main.js',main);
let html=await readFile('sprint/index.html','utf8');
html=patch(html,"<title>Saurabh's Sprint - 3D Endless Subway Runner</title>",'<title>Surfer CIAC · Saurabh’s Sprint</title>');
html=patch(html,'  <script src="js/main.js?v=5.9"></script>','  <script src="ciac/adapter.js"></script>\n  <script src="js/main.js?v=5.9"></script>');
html=patch(html,'  <!-- Stylesheet -->','  <link rel="stylesheet" href="ciac/adapter.css">\n  <!-- Stylesheet -->');
await writeFile('dist/index.html',html);
// API data must always come from CIAC/D1, never from an offline score cache.
let sw=await readFile('sprint/sw.js','utf8');
sw=patch(sw,"const CACHE_NAME = 'saurabhs-sprint-v5.9';", "const CACHE_NAME = 'surfer-ciac-sprint-v1';");
sw=patch(sw,"  './manifest.json',", "  './manifest.json',\n  './ciac/adapter.js',\n  './ciac/adapter.css',");
sw=patch(sw,"  if (event.request.method !== 'GET') return;", "  if (event.request.method !== 'GET' || new URL(event.request.url).pathname.startsWith('/api/')) return;");
await writeFile('dist/sw.js',sw);
await cp('sprint-source.json','dist/sprint-source.json');
// Static/academic routing for Cloudflare Pages; preserve existing API functions.
await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]})+'\n');
await access('dist/lib/three.min.js');
await import('./write-build-info.mjs');
console.log(`Surfer CIAC: complete Saurabh's Sprint ${source.commit}, ${Object.keys(source.files).length} original files + localized academic bridge.`);
