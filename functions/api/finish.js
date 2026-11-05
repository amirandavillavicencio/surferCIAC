import { json, bodyOf } from './_lib/shared.js';
import { validateName } from './_lib/moderation.js';

export async function onRequestPost({request,env}) {
  if (!env.DB) return json({error:'Falta configurar DB'},503);
  let input;
  try {input = await bodyOf(request);} catch {return json({error:'JSON inválido'},400);}
  if (typeof input?.token !== 'string' || input.token.length > 100) return json({error:'Partida inválida'},400);
  const run = await env.DB.prepare('SELECT * FROM runs WHERE token=?').bind(input.token).first();
  if (!run) return json({error:'No se encontró la partida'},404);
  const nameCheck = await validateName(input.name,env);
  if (!nameCheck.ok) return json({error:nameCheck.error},422);
  const existing = await env.DB.prepare('SELECT display_name, score FROM scores WHERE run_token=?').bind(run.token).first();
  if (existing) return json({name:existing.display_name,points:existing.score,alreadySaved:true});
  const points = run.correct * 100;
  await env.DB.prepare('INSERT OR IGNORE INTO scores (run_token,display_name,semestre,score,correct,created_at) VALUES (?,?,?,?,?,?)')
    .bind(run.token,nameCheck.name,run.semestre,points,run.correct,Date.now()).run();
  await env.DB.prepare('UPDATE runs SET status=? WHERE token=?').bind('finished',run.token).run();
  return json({name:nameCheck.name,points});
}
