import { questionFor, publicQuestion, json, bodyOf } from './_lib/shared.js';
import { correctionFor } from './_lib/corrections.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({error:'Falta configurar DB'},503);
  let input;
  try {input = await bodyOf(request);} catch {return json({error:'JSON inválido'},400);}
  if (typeof input?.token !== 'string' || !Number.isInteger(input?.lane) || input.lane < 0 || input.lane > 2)
    return json({error:'Respuesta inválida'},400);
  const run = await env.DB.prepare('SELECT * FROM runs WHERE token=?').bind(input.token).first();
  if (!run || run.status !== 'active' || !run.current_id) return json({error:'Partida no activa'},409);
  const now = Date.now();
  if (now < run.next_answer_at) return json({error:'Aún no corresponde responder'},429);
  const current = questionFor(run.semestre,run.asked,run.question_offset);
  if (!current || current.id !== run.current_id) return json({error:'Pregunta fuera de secuencia'},409);
  const correct = input.lane === current.correcta;
  // Una respuesta incorrecta retrasa el juego, pero no cierra la sesión.
  // La secuencia avanza; solo los aciertos suman puntos.
  const next = questionFor(run.semestre,run.asked+1,run.question_offset);
  const nextStatus = next ? 'active' : 'ended';
  const result = await env.DB.prepare(
    'UPDATE runs SET asked=?, correct=?, current_id=?, next_answer_at=?, status=? WHERE token=? AND status=? AND current_id=? AND asked=?'
  ).bind(run.asked+1,run.correct+(correct?1:0),next?.id??null,now+3500,nextStatus,run.token,'active',run.current_id,run.asked).run();
  if (result.meta?.changes !== 1) return json({error:'Respuesta duplicada'},409);
  return json({correct,points:(run.correct+(correct?1:0))*100,question:publicQuestion(next),penaltySeconds:correct?0:3,
    correction: correct ? null : correctionFor(current)});
}
