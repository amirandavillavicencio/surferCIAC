import { Profanity } from '@2toad/profanity';

const filter = new Profanity({ languages: ['es', 'en'], unicodeWordBoundaries: true });
export async function validateName(value, env) {
  if (typeof value !== 'string') return { ok: false, error: 'Escribe un nombre' };
  const name = value.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 24 || !/^[\p{L}\p{M}\p{N} _-]+$/u.test(name)) {
    return { ok: false, error: 'El nombre debe tener entre 2 y 24 caracteres: letras, números, espacios, guion o guion bajo' };
  }
  if (filter.exists(name)) return { ok: false, error: 'El nombre contiene lenguaje no permitido' };
  if (env.AI) {
    try {
      const result = await env.AI.run('@cf/meta/llama-guard-3-8b', {
        messages: [{ role: 'user', content: 'Revisa este nombre público de jugador: ' + name }]
      });
      const verdict = String(result?.response || '').trim().toLowerCase();
      if (!verdict.startsWith('safe')) {
        return { ok: false, error: 'El nombre no fue aprobado por la moderación' };
      }
    } catch {
      return { ok: false, error: 'La moderación no está disponible. No se publicó el nombre' };
    }
  }
  return {ok:true,name};
}
