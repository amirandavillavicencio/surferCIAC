import { SEMESTRES, json } from './_lib/shared.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({error:'Falta configurar DB'},503);
  const semestre = new URL(request.url).searchParams.get('semestre') || 'Todos';
  if (!SEMESTRES.includes(semestre)) return json({error:'Semestre inválido'},400);
  const sql = semestre === 'Todos'
    ? 'SELECT display_name AS name, semestre, score FROM scores ORDER BY score DESC, created_at ASC LIMIT 10'
    : 'SELECT display_name AS name, semestre, score FROM scores WHERE semestre=? ORDER BY score DESC, created_at ASC LIMIT 10';
  const r = semestre === 'Todos' ? await env.DB.prepare(sql).all() : await env.DB.prepare(sql).bind(semestre).all();
  return json({ranking:r.results||[]});
}
