import { json } from './_lib/shared.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ api: 'surferCIAC', data: 'sin conexión' }, 503);
  try {
    await env.DB.prepare('SELECT 1').first();
    return json({api: 'surferCIAC', data: 'conectada', juego: 'pendiente de publicación'});
  } catch {
    return json({api: 'surferCIAC', data: 'error'}, 503);
  }
}
