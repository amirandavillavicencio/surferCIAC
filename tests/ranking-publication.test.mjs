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

test('el ranking solo muestra puntajes publicados y un mejor resultado por nombre', () => {
  const source = readFileSync(new URL('../functions/api/leaderboard.js', import.meta.url), 'utf8');
  assert.match(source, /WHERE published_at IS NOT NULL/);
  assert.match(source, /ROW_NUMBER\(\) OVER \(PARTITION BY display_name/);
  assert.match(source, /ORDER BY score DESC, created_at ASC, run_token ASC/);
  assert.match(source, /LIMIT 10/);
});

test('la portada solicita el ranking real y las preguntas de todos los semestres', () => {
  const game = readFileSync(new URL('../ciac/game.ts', import.meta.url), 'utf8');
  assert.match(game, /leaderboard\?semestre=Todos&periodo=general/);
  assert.match(game, /Preguntas de todos los semestres/);
  assert.match(game, /semestre: 'Todos'/);
  assert.doesNotMatch(game, /STATIC_RANKING|Daniela Torres|John', score:/);
});
