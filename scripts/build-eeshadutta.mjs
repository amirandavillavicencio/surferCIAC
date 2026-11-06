import {readFile,writeFile,cp,mkdir,rm,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const source=JSON.parse(await readFile('eeshadutta-source.json','utf8'));
for(const [name,hash]of Object.entries(source.files))if(createHash('sha256').update(await readFile('eeshadutta/'+name)).digest('hex')!==hash)throw Error('Original file changed: '+name);
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('eeshadutta','dist',{recursive:true});
await build({entryPoints:['ciac/eeshadutta/adapter.ts'],outfile:'dist/ciac/adapter.js',bundle:true,format:'iife',target:'es2020'});
const patch=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Source hook missing/duplicated: '+a);return s.replace(a,b);};
let main=await readFile('eeshadutta/main.js','utf8');
main=patch(main,"  document.getElementById('music').play();","  // Audio starts on the play gesture for Safari/iPhone.");
main=patch(main,'  var then = 0;','  window.ciac = new EeshaduttaCIAC(gl);\n  var then = 0;');
main=patch(main,'    then = now;','    then = now;\n    if(!ciac.running){drawScene(gl,greyScale?programInfobw:programInfo,deltaTime);requestAnimationFrame(render);return;}\n    ciac.step(deltaTime);');
for(const line of ['player.pos[2] -= player.speedz;','cam_z -= player.speedz;','dog.pos[2] -= player.speedz;','police.pos[2] -= police.speedz'])main=patch(main,line,line.replace(/;$/,'').replace(/(player|police)\.speedz$/,'$1.speedz * ciac.factor')+(line.endsWith(';')?';':''));
main=patch(main,'    if (player.pos[2] <= -800) {','    ciac.afterStep();\n    if (player.pos[2] <= -800 && ciac.pending) ciac.nextLap();\n    else if (player.pos[2] <= -800) {');
main=main.replaceAll('alert("YOU LOST\\nScore: " + score + "\\nCoins: " + coins_collected);','ciac.finish("lost", score, coins_collected);').replaceAll('alert("YOU WON\\nScore: " + score + "\\nCoins: " + coins_collected);','ciac.finish("won", score, coins_collected);');
main=patch(main,'  const fieldOfView = 45 * Math.PI / 180;', '  const fieldOfView = window.ciac ? ciac.fov(gl.canvas.clientWidth/gl.canvas.clientHeight) : 45*Math.PI/180;');
main=patch(main,'function drawScene(gl, programInfo, deltaTime) {','function drawScene(gl, programInfo, deltaTime) {\n  window.ciac?.viewport();');
main=patch(main,'function initShaderProgram(gl, vsSource, fsSource) {','function initShaderProgram(gl, vsSource, fsSource) {');
main=patch(main,'\n}\n\nfunction initShaderProgram', '\n  window.ciac?.draw(viewProjectionMatrix,programInfo,deltaTime);\n}\n\nfunction initShaderProgram');
await writeFile('dist/main.js',main);
let html=await readFile('eeshadutta/index.html','utf8');
html=patch(html,'<title>Subway Surfers</title>','<title>Surfer CIAC · Eeshadutta WebGL</title>\n  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">');
html=patch(html,'<link rel="stylesheet" href="../webgl.css" type="text/css">','<link rel="stylesheet" href="ciac/adapter.css">');
html=patch(html,'</body>',`<div id="ciac-hud"><span id="ciac-stats">Surfer CIAC · WebGL</span><button id="ciac-pause" aria-label="Pausar">Pausa</button></div>
<div id="ciac-start" class="ciac-screen"><div class="panel"><h1>Surfer CIAC</h1><p>Motor original de Eeshadutta. Desliza para cambiar de carril, saltar o agacharte. En teclado, usa las flechas.</p><div id="ciac-themes"><button id="ciac-theme-1">Ciudad · 1</button><button id="ciac-theme-2">Neón · 2</button></div><button id="ciac-play">Jugar</button></div></div>
<div id="ciac-over" class="ciac-screen" hidden><div class="panel"><h1 id="ciac-result-title">Fin de la carrera</h1><p id="ciac-result-stats"></p><button id="ciac-restart">Nueva partida</button></div></div>
<div id="ciac-paused" class="ciac-screen" hidden><div class="panel"><h1>Pausa</h1><button id="ciac-resume">Continuar</button></div></div><div id="ciac-notice" hidden></div></body>`);
html=patch(html,'<script src="./main.js"></script>','<script src="./ciac/adapter.js"></script>\n<script src="./main.js"></script>');
await writeFile('dist/index.html',html);
// Replace the previous game's root-scoped PWA cache when upgrading existing clients.
await writeFile('dist/sw.js',`self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))).then(()=>self.registration.unregister()).then(()=>self.clients.claim())));`);
html=patch(html,'</head>',`<script>if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(registrations=>{for(const r of registrations)r.update().catch(()=>{});});</script></head>`);await writeFile('dist/index.html',html);
await cp('eeshadutta-source.json','dist/eeshadutta-source.json');await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]})+'\n');
await access('dist/assets/Theme.mp3');await import('./write-build-info.mjs');
console.log('Complete Eeshadutta WebGL source '+source.commit+' + separate CIAC and mobile modules.');
