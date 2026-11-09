import test from 'node:test';
import assert from 'node:assert/strict';
import { validateName } from '../functions/api/_lib/moderation.js';
import { onRequestGet } from '../functions/api/leaderboard.js';

test('nombres visibles sin filtro de palabras, signos ni longitud fija', async () => {
  for (const entry of ['!', '🙂', 'x', 'palabra con signos !?%#', 'x'.repeat(50)]) {
    assert.deepEqual(await validateName(entry), { ok: true, name: entry });
  }
  assert.deepEqual(await validateName(' \u200b  '), { ok: false, error: 'Escribe un nombre' });
});

test('la API del ranking general y semanal lee solamente puntajes publicados', async () => {
  const statements = [];
  const env = {
    DB: {
      prepare(sql) {
        statements.push(sql);
        return {
          bind() { return this; },
          async all() { return { results: [] }; },
        };
      },
    },
  };
  for (const period of ['general', 'semana']) {
    for (const semestre of ['Todos', 'Primer semestre']) {
      const url = new URL('https://surferciac.pages.dev/api/leaderboard');
      url.searchParams.set('periodo', period);
      url.searchParams.set('semestre', semestre);
      const result = await onRequestGet({ request: new Request(url), env });
      assert.equal(result.status, 200);
      assert.deepEqual((await result.json()).ranking, []);
    }
  }
  assert.equal(statements.length, 4);
  for (const sql of statements) assert.match(sql, /WHERE published_at IS NOT NULL/);
});
