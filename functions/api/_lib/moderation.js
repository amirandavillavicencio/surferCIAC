// El texto del nombre se revisa antes de publicarse en el ranking.
// Solo se eliminan caracteres de control/invisibles para guardar un nombre legible.
export async function validateName(value) {
  if (typeof value !== 'string') return { ok: false, error: 'Escribe un nombre' };
  const name = value.normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) return { ok: false, error: 'Escribe un nombre' };
  return { ok: true, name };
}
