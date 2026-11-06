import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';

test('existing API and local D1: 24 answers, physical lane contract, penalty, final score and ranking',async()=>{
 const dir=await mkdtemp(join(process.cwd(),'.sprint-d1-'));let mf;
 try{
  const bundle=join(dir,'worker.mjs');
  await build({entryPoints:['src/worker.js'],outfile:bundle,bundle:true,format:'esm',platform:'browser',target:'es2022'});
  mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:bundle,compatibilityDate:'2026-11-05',d1Databases:{DB:'sprint-local-test'},bindings:{COMPETITION_LIVE:'true'}}));
  const db=await mf.getD1Database('DB');
  const migration=await readFile('migrations/0001_init.sql','utf8');
  await db.batch(migration.split(';').filter(x=>x.trim()).map(x=>db.prepare(x)));
  const bank=JSON.parse(await readFile('data/questions.json','utf8'));
  const call=async(path,body)=>{const r=await mf.dispatchFetch('http://local/api/'+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});return {status:r.status,body:await r.json()};};
  const started=await call('start',{semestre:'Todos'});assert.equal(started.status,200);const token=started.body.token;
  assert.equal((await call('answer',{token,lane:1})).status,429,'retain server answer timing');
  let question=started.body.question;const seen=new Set();
  for(let i=0;i<24;i++){
   assert.ok(question);assert.equal(seen.has(question.id),false);seen.add(question.id);
   assert.equal('correcta' in question,false,'never disclose correct lane');
   const original=bank.find(q=>q.id===question.id);assert.ok(original);
   assert.equal(question.enunciado,original.enunciado);assert.deepEqual(question.opciones,original.opciones);
   await db.prepare('UPDATE runs SET next_answer_at=0 WHERE token=?').bind(token).run();
   const lane=i===0?(original.correcta+1)%3:original.correcta;
   const answered=await call('answer',{token,lane});assert.equal(answered.status,200);
   assert.equal(answered.body.correct,i!==0);assert.equal(answered.body.penaltySeconds,i===0?3:0);
   question=answered.body.question;
  }
  assert.equal(seen.size,24);assert.equal(question,null);
  assert.equal((await call('answer',{token,lane:1})).status,409);
  const saved=await call('finish',{token,name:'Corredor CIAC'});assert.equal(saved.status,200);assert.equal(saved.body.points,2300);
  const again=await call('finish',{token,name:'Corredor CIAC'});assert.equal(again.body.alreadySaved,true);
  const ranking=await call('leaderboard?periodo=semana');assert.equal(ranking.status,200);assert.equal(ranking.body.ranking[0].score,2300);assert.equal(ranking.body.ranking[0].name,'Corredor CIAC');
 }finally{if(mf)await mf.dispose();await rm(dir,{recursive:true,force:true});}
});
