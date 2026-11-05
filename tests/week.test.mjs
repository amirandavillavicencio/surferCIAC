import test from 'node:test';
import assert from 'node:assert/strict';
import {currentChileWeek} from '../functions/api/_lib/week.js';

test('semana de noviembre: lunes a domingo en Santiago', () => {
  const w = currentChileWeek(Date.parse('2026-11-05T18:00:00Z'));
  assert.equal(w.desde, '2026-11-02');
  assert.equal(w.hasta, '2026-11-08');
  assert.equal(w.inicio, Date.parse('2026-11-02T03:00:00Z'));
  assert.equal(w.finExclusivo, Date.parse('2026-11-09T03:00:00Z'));
});
test('cambio de hora de septiembre: semana de 167 horas', () => {
  const w = currentChileWeek(Date.parse('2026-09-06T09:00:00Z'));
  assert.equal(w.desde, '2026-08-31');
  assert.equal(w.hasta, '2026-09-06');
  assert.equal(w.inicio, Date.parse('2026-08-31T04:00:00Z'));
  assert.equal(w.finExclusivo, Date.parse('2026-09-07T03:00:00Z'));
});
test('cambio de hora de abril: semana de 169 horas', () => {
  const w = currentChileWeek(Date.parse('2026-04-05T12:00:00Z'));
  assert.equal(w.desde, '2026-03-30');
  assert.equal(w.hasta, '2026-04-05');
  assert.equal(w.inicio, Date.parse('2026-03-30T03:00:00Z'));
  assert.equal(w.finExclusivo, Date.parse('2026-04-06T04:00:00Z'));
});
