import test from 'node:test';
import assert from 'node:assert/strict';
import { bank, questionFor, questionLimit } from '../functions/api/_lib/shared.js';

const courses = ['MAT060', 'MAT061', 'MAT070', 'MAT071', 'FIS100', 'FIS110'];
const modes = [
  ['Primer semestre', 60, 12],
  ['Segundo semestre', 60, 12],
  ['Todos', 120, 24],
];

test('120 preguntas: 20 por asignatura, tres alternativas y respuestas explicadas', () => {
  const questions = bank('Todos');
  assert.equal(questions.length, 120);
  const ids = new Set(), statements = new Set();
  for (const course of courses) assert.equal(questions.filter(q => q.curso === course).length, 20, course);
  for (const q of questions) {
    assert.ok(!ids.has(q.id), 'ID duplicado ' + q.id);
    assert.ok(!statements.has(q.enunciado), 'Enunciado duplicado ' + q.id);
    ids.add(q.id);
    statements.add(q.enunciado);
    assert.equal(q.opciones.length, 3);
    assert.equal(new Set(q.opciones).size, 3);
    assert.ok([0, 1, 2].includes(q.correcta), q.id);
    assert.ok(q.explicacion.length >= 20 && q.explicacion.length <= 150, q.id);
  }
});

test('cada carrera mantiene 12 o 24 preguntas, sin repeticiones ni cambios de semestre', () => {
  for (const [semester, pool, limit] of modes) {
    assert.equal(bank(semester).length, pool);
    assert.equal(questionLimit(semester), limit);
    const seen = new Set();
    for (let offset = 0; offset < pool; offset++) {
      const run = Array.from({length: limit}, (_, n) => questionFor(semester, n, offset));
      assert.ok(run.every(Boolean), semester + ': pregunta faltante');
      assert.equal(new Set(run.map(q => q.id)).size, limit, semester + ': repetida');
      assert.equal(questionFor(semester, limit, offset), null);
      assert.equal(questionFor(semester, limit + 1, offset), null);
      for (const q of run) {
        seen.add(q.id);
        if (semester !== 'Todos') assert.equal(q.semestre, semester);
      }
    }
    assert.equal(seen.size, pool, semester + ': banco incompleto');
  }
});
