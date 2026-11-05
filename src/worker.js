import { onRequestPost as start } from '../functions/api/start.js';
import { onRequestPost as answer } from '../functions/api/answer.js';
import { onRequestPost as finish } from '../functions/api/finish.js';
import { onRequestGet as leaderboard } from '../functions/api/leaderboard.js';
import { json } from '../functions/api/_lib/shared.js';

const handlers = new Map([
  ['POST /api/start', start],
  ['POST /api/answer', answer],
  ['POST /api/finish', finish],
  ['GET /api/leaderboard', leaderboard],
]);

// La aplicación 3D será servida por este mismo Worker cuando exista autorización
// para publicar el motor original. Por ahora solo se implementa el servicio CIAC.
export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path === '/api/status' && request.method === 'GET') {
      if (!env.DB) return json({ api: 'surferCIAC', data: 'sin conexión' }, 503);
      try {
        await env.DB.prepare('SELECT 1').first();
        return json({ api: 'surferCIAC', data: 'conectada', juego: 'pendiente de publicación' });
      } catch (error) {
        console.error(JSON.stringify({ event: 'd1_health_failed', error: String(error) }));
        return json({ api: 'surferCIAC', data: 'error' }, 503);
      }
    }
    if (path === '/') {
      return json({ proyecto: 'surferCIAC', estado: 'API académica configurada; juego 3D pendiente de publicación' }, 503);
    }
    const handler = handlers.get(request.method + ' ' + path);
    if (!handler) {
      if (['/api/start', '/api/answer', '/api/finish', '/api/leaderboard'].includes(path))
        return json({ error: 'Método no permitido' }, 405);
      return json({ error: 'Ruta no encontrada' }, 404);
    }
    // No se abren inscripciones ni se guardan resultados hasta que el juego
    // esté publicado y el ranking tenga validación antifraude.
    if ((path === '/api/start' || path === '/api/answer' || path === '/api/finish')
        && env.COMPETITION_LIVE !== 'true') {
      return json({ error: 'La competencia aún no está habilitada' }, 503);
    }
    try {
      return await handler({ request, env, ctx });
    } catch (error) {
      console.error(JSON.stringify({ event: 'api_error', path, error: String(error) }));
      return json({ error: 'Error del servidor' }, 500);
    }
  }
};
