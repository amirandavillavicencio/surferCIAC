import { SEMESTRES, json } from './_lib/shared.js';
import { currentChileWeek } from './_lib/week.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({error:'Falta configurar DB'},503);
  const url = new URL(request.url);
  const semestre = url.searchParams.get('semestre') || 'Todos';
  if (!SEMESTRES.includes(semestre)) return json({error:'Semestre inválido'},400);
  const periodo = url.searchParams.get('periodo') || 'general';
  if (!['general','semana'].includes(periodo)) return json({error:'Período inválido'},400);

  if (periodo === 'semana') {
    const semana = currentChileWeek();
    const sql = semestre === 'Todos'
      ? 'SELECT display_name AS name, semestre, score FROM scores WHERE published_at IS NOT NULL AND created_at >= ? AND created_at < ? ORDER BY score DESC, created_at ASC, run_token ASC LIMIT 10'
      : 'SELECT display_name AS name, semestre, score FROM scores WHERE published_at IS NOT NULL AND created_at >= ? AND created_at < ? AND semestre=? ORDER BY score DESC, created_at ASC, run_token ASC LIMIT 10';
    const query = env.DB.prepare(sql);
    const r = semestre === 'Todos'
      ? await query.bind(semana.inicio, semana.finExclusivo).all()
      : await query.bind(semana.inicio, semana.finExclusivo, semestre).all();
    return json({ranking:r.results||[], semana:{
      desde:semana.desde, hasta:semana.hasta, zonaHoraria:semana.zonaHoraria
    }, premio:'Kit de premio', ganadorConfirmado:false});
  }

  const sql = semestre === 'Todos'
    ? 'SELECT display_name AS name, semestre, score FROM scores WHERE published_at IS NOT NULL ORDER BY score DESC, created_at ASC LIMIT 10'
    : 'SELECT display_name AS name, semestre, score FROM scores WHERE published_at IS NOT NULL AND semestre=? ORDER BY score DESC, created_at ASC LIMIT 10';
  const r = semestre === 'Todos' ? await env.DB.prepare(sql).all() : await env.DB.prepare(sql).bind(semestre).all();
  return json({ranking:r.results||[]});
}
