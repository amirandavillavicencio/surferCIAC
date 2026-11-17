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
    const publicationSql = `SELECT MAX(published_at) AS ultimaPublicacion FROM scores
      WHERE published_at IS NOT NULL AND created_at >= ? AND created_at < ?${semestre === 'Todos' ? '' : ' AND semestre=?'}`;
    const bindings = [semana.inicio, semana.finExclusivo];
    if (semestre !== 'Todos') bindings.push(semestre);
    const [ranking, publication] = await env.DB.batch([
      env.DB.prepare(sql).bind(...bindings),
      env.DB.prepare(publicationSql).bind(...bindings)
    ]);
    return json({ranking:ranking.results||[], ultimaPublicacion:publication.results[0]?.ultimaPublicacion ?? null, semana:{
      desde:semana.desde, hasta:semana.hasta, zonaHoraria:semana.zonaHoraria
    }, premio:'Kit de premio', ganadorConfirmado:false});
  }

  // El ranking general conserva únicamente la mejor partida publicada por nombre.
  // Los empates se resuelven por la fecha más antigua y luego por el token.
  const sql = `SELECT name, semestre, score FROM (
    SELECT display_name AS name, semestre, score, created_at, run_token,
      ROW_NUMBER() OVER (PARTITION BY display_name ORDER BY score DESC, created_at ASC, run_token ASC) AS position
    FROM scores WHERE published_at IS NOT NULL${semestre === 'Todos' ? '' : ' AND semestre=?'}
  ) WHERE position = 1 ORDER BY score DESC, created_at ASC, run_token ASC LIMIT 10`;
  const r = semestre === 'Todos' ? await env.DB.prepare(sql).all() : await env.DB.prepare(sql).bind(semestre).all();
  return json({ranking:r.results||[]});
}
