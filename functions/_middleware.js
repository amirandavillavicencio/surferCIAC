import { json } from './api/_lib/shared.js';

// Las API de lectura están disponibles; las partidas y los premios no se abren
// hasta estar listo el motor 3D y los controles contra puntajes manipulados.
export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (
    ['/api/start', '/api/answer', '/api/finish'].includes(path)
    && context.env.COMPETITION_LIVE !== 'true'
  ) {
    return json({ error: 'La competencia aún no está habilitada' }, 503);
  }
  return context.next();
}
