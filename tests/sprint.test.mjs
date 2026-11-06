import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const manifest=JSON.parse(await readFile('sprint-source.json','utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('entire pinned source repository and all resources are preserved byte for byte',async()=>{
 assert.equal(manifest.commit,'835b8404fd3bd96afea08e91d0f4fd03e627dd1e');
 assert.equal(Object.keys(manifest.files).length,66);
 for(const [name,hash] of Object.entries(manifest.files))assert.equal(sha(await readFile('sprint/'+name)),hash,name);
 assert.match(await readFile('sprint/LICENSE','utf8'),/MIT License/);
});
test('Pages deploy preserves every original file, all core systems and all library/assets bytes',async()=>{
 for(const [name,hash] of Object.entries(manifest.files)){
  await access('dist/'+name);
  if(!['index.html','js/main.js','sw.js'].includes(name))assert.equal(sha(await readFile('dist/'+name)),hash,name);
 }
 const original=await readFile('sprint/js/main.js','utf8'),actual=await readFile('dist/js/main.js','utf8');
 // Remove the eight explicit bridge hooks; the remaining engine must be exact.
 const restored=actual.replace('    this.ciac = new SprintCIAC(this);\n','').replace('    this.ciac.startRun();\n','').replace('      this.ciac.beforeStep(delta);\n','').replace(' * this.ciac.factor','').replace('      this.ciac.afterStep();\n\n','').replace('    this.ciac.suspend();\n','').replace('    this.ciac.endRun();\n','').replace('    this.ciac.resume();\n','');
 assert.equal(restored,original);
 const routes=JSON.parse(await readFile('dist/_routes.json','utf8'));assert.deepEqual(routes.include,['/api/*']);
 assert.match(await readFile('dist/sw.js','utf8'),/pathname.startsWith\('\/api\/'\)/);
});
const directory=await mkdtemp(join(tmpdir(),'sprint-ciac-rules-'));
try{
 const outfile=join(directory,'rules.mjs');
 await build({stdin:{contents:"export * from './ciac/sprint/reservations.ts';export * from './ciac/sprint/course.ts';export * from './ciac/sprint/pace.ts';",resolveDir:process.cwd()},outfile,bundle:true,platform:'node',format:'esm'});
 const {QuizCourse,RacePace,obstacleAllowed,crossingLane}=await import(pathToFileURL(outfile));
 test('academic speed factors retain the original 0.72 strip, full 3 seconds at 0.55 and gradual recovery',()=>{
  const p=new RacePace();for(let i=0;i<100;i++)p.step(1/120,150,180);assert.equal(p.factor,.72);
  p.penalize(3);for(let i=0;i<360;i++)assert.equal(p.step(1/120,165,180),.55);
  for(let i=0;i<100;i++)p.step(1/120,195,330);assert.equal(p.factor,1);
  p.reset();assert.equal(p.factor,1);assert.equal(p.penaltyRemaining,0);
 });
 test('answers register the actual interpolated physical X, using source lane width 2.2',()=>{
  assert.equal(crossingLane({d:179,x:0},{d:181,x:1.8},180),1);
  assert.equal(crossingLane({d:179,x:2},{d:181,x:2.2},180),2);
  assert.equal(crossingLane({d:179,x:-2},{d:181,x:-2.2},180),0);
 });
 test('all original train speeds and academic slowdowns keep answer corridors free',()=>{
  const course=new QuizCourse();let admitted=0;
  for(let start=30;start<550;start+=5)for(const moving of [false,true]){
   const b={minZ:-start-9,maxZ:-start+9};if(!obstacleAllowed(course,b,0,0,moving))continue;
   admitted++;
   for(const speed of [13*.55,13*.72,13,20,27,38]){
    const runner=speed,train=moving?12+.15*speed:0;
    const begin=(start-9)*runner/(runner+train),end=(start+9)*runner/(runner+train);
    assert.equal(course.intersects(begin,end),false,JSON.stringify({start,speed,moving,begin,end}));
   }
  }
  assert.ok(admitted>30,'must retain encounters outside academic slots');
 });
 test('question course is not limited to 24 slots; bank size remains controlled by server',()=>{
  const c=new QuizCourse();assert.equal(c.gateAtOrAfter(180+150*100),15180);
  c.stop(400);assert.equal(c.canShow(780,600),false);
 });
}finally{await rm(directory,{recursive:true,force:true});}
