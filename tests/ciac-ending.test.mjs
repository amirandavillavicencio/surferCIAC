import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const game = readFileSync(new URL('../ciac/game.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../ciac/game.css', import.meta.url), 'utf8');

test('la invitación queda en el cierre, bajo la revancha', () => {
  assert.match(game, /querySelector<HTMLElement>\('#s-over \.panel'\)/);
  assert.match(game, /invitationTitle\.textContent = '¿Te gustaría reforzar algún ramo\?';/);
  assert.match(game, /overPanel\.append\(invitation\);/);
  assert.match(game, /secondaryActions\.append\(schedules, homeButton\);/);
  assert.doesNotMatch(game, /startPanel\.append\(invitation\)/);
});

test('el enlace de horarios es accesible y no pierde la partida', () => {
  assert.match(game, /schedules\.href = 'https:\/\/dispositivos-ciac\.pages\.dev\/';/);
  assert.match(game, /schedules\.target = '_blank';/);
  assert.match(game, /schedules\.rel = 'noopener noreferrer';/);
  assert.match(game, /schedules\.addEventListener\('pointerdown', \(event\) => event\.stopPropagation\(\)\);/);
  assert.match(css, /#s-over \.ciac-schedules-link/);
  assert.match(css, /min-height: 43px/);
  assert.match(css, /touch-action: manipulation/);
});

test('los datos no se repiten y el formulario queda antes de la revancha', () => {
  assert.match(game, /this\.summary\.textContent = victory/);
  assert.match(game, /: `\$\{this\.missions\.correct\} aciertos/);
  assert.match(game, /preguntas completadas/);
  assert.doesNotMatch(game, /this\.summary\.textContent=\x60\$\{Math\.floor\(distance\)\}/);
  assert.match(game, /overPanel\.insertBefore\(this\.summary, replayButton\);/);
  assert.match(game, /overPanel\.insertBefore\(this\.resultForm, replayButton\);/);
  assert.match(game, /this\.resultForm\.hidden = !this\.token;/);
  assert.match(css, /#s-over \.ciac-result \{/);
  assert.match(css, /#s-over \.ciac-over-secondary \{/);
});
