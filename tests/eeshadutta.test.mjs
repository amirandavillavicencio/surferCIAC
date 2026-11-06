import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=JSON.parse(await readFile('eeshadutta-source.json','utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
test('complete original WebGL source and resources retain exact bytes and provenance',async()=>{
 assert.equal(source.commit,'3dba9ff4844cf34e3137cdf667a6577243eacf21');assert.equal(Object.keys(source.files).length,55);
 for(const [name,sha]of Object.entries(source.files))assert.equal(hash(await readFile('eeshadutta/'+name)),sha,name);
 assert.equal(source.license,'No license declared in original repository');
});
test('published game retains every original entity, shader library, image and sound',async()=>{
 for(const [name,sha]of Object.entries(source.files)){
  const bytes=await readFile('dist/'+name);
  if(!['main.js','index.html'].includes(name))assert.equal(hash(bytes),sha,name);
 }
 const entry=await readFile('dist/main.js','utf8');assert.doesNotMatch(entry,/THREE|three\.js/);assert.match(entry,/ciac\.factor/);
 // No source kinematics, collision predicates, train movement or input logic changed.
 const original=await readFile('eeshadutta/main.js','utf8');
 const code=entry.slice(entry.indexOf('    if (player.pos[0] > 6)'),entry.indexOf('    ciac.afterStep();'));
 assert.equal(code,original.slice(original.indexOf('    if (player.pos[0] > 6)'),original.indexOf('    if (player.pos[2] <= -800) {')).replaceAll('alert("YOU LOST\\nScore: " + score + "\\nCoins: " + coins_collected);','ciac.finish("lost", score, coins_collected);'));
 assert.equal(JSON.parse(await readFile('dist/_routes.json','utf8')).include[0],'/api/*');
});
