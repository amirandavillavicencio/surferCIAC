import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateName } from '../functions/api/_lib/moderation.js';

test('nombres visibles sin filtro de palabras, signos ni longitud fija', async () => {
  for (const entry of ['!', '🙂', 'x', 'palabra con signos !?%#', 'x'.repeat(50)]) {
    assert.deepEqual(await validateName(entry), { ok: true, name: entry });
  }
  assert.deepEqual(await validateName(' \u200b  '), { ok: false, error: 'Escribe un nombre' });
});

test('las cuatro consultas del ranking exigen publicación manual', () => {
  const source = readFileSync(new URL('../functions/api/leaderboard.js', import.meta.url), 'utf8');
  const queries = [...source.matchAll(/'SELECT display_name AS name, semestre, score FROM scores ([^']+)'/g)];
  assert.equal(queries.length, 4, 'general y semanal, con y sin filtro de semestre');
  for (const [, sql] of queries) {
    assert.match(sql, /^WHERE published_at IS NOT NULL(?: AND | ORDER BY )/);
    assert.match(sql, /ORDER BY score DESC, created_at ASC/);
    assert.match(sql, /LIMIT 10$/);
  }
});
