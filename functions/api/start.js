import { SEMESTRES, bank, questionFor, publicQuestion, json, bodyOf } from './_lib/shared.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({error:'Falta configurar la base D1 (DB)'},503);
  let input;
  try { input = await bodyOf(request); } catch { return json({error:'JSON inválido'},400); }
  const semestre = input?.semestre;
  if (!SEMESTRES.includes(semestre)) return json({error:'Semestre inválido'},400);
  const offset = crypto.getRandomValues(new Uint32Array(1))[0] % bank(semestre).length;
  const question = questionFor(semestre,0,offset);
  const token = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO runs (token,semestre,question_offset,current_id,next_answer_at,created_at) VALUES (?,?,?,?,?,?)')
    .bind(token,semestre,offset,question.id,now+3000,now).run();
  return json({token,question:publicQuestion(question),points:0});
}
