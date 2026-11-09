import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { correctionFor, EXPLANATIONS } from '../functions/api/_lib/corrections.js';

const questions = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url), 'utf8'));

test('las 120 preguntas tienen una explicación breve', () => {
  assert.equal(questions.length, 120);
  assert.equal(Object.keys(EXPLANATIONS).length, questions.length);
  for (const q of questions) {
    const correction = correctionFor(q);
    assert.ok(correction, 'Sin explicación: ' + q.id);
    assert.equal(correction.letra, ['A', 'B', 'C'][q.correcta]);
    assert.equal(correction.texto, q.opciones[q.correcta]);
    assert.ok(correction.explicacion.length >= 20, 'Explicación demasiado corta: ' + q.id);
    assert.ok(correction.explicacion.length <= 150, 'Explicación demasiado larga: ' + q.id);
  }
});

test('no se revela la respuesta correcta al iniciar una pregunta', () => {
  const source = readFileSync(new URL('../functions/api/_lib/shared.js', import.meta.url), 'utf8');
  const result = source.match(/export function publicQuestion\(q\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(result);
  assert.doesNotMatch(result, /correcta|correctionFor|explicacion/);
});

test('la API entrega corrección únicamente después de validar una respuesta incorrecta', () => {
  const source = readFileSync(new URL('../functions/api/answer.js', import.meta.url), 'utf8');
  assert.match(source, /result\.meta\?\.changes !== 1/);
  assert.match(source, /correction: correct \? null : correctionFor\(current\)/);
});

test('la carrera mantiene la penalización y presenta el motivo sin bloquear controles', () => {
  const game = readFileSync(new URL('../ciac/game.ts', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../ciac/game.css', import.meta.url), 'utf8');
  assert.match(game, /this\.hooks\.penalize\(Number\(response\.penaltySeconds\) \|\| 3\)/);
  assert.match(game, /Correcta: \$\{correction\.letra\}/);
  assert.match(game, /¿Por qué\? \$\{correction\.explicacion\}/);
  assert.match(css, /\.ciac-feedback\[data-correct='false'\][\s\S]*?pointer-events: none;/);
});
