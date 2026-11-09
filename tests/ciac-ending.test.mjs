import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const game = readFileSync(new URL('../ciac/game.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../ciac/game.css', import.meta.url), 'utf8');

test('la invitación aparece únicamente en la pantalla de cierre', () => {
  assert.match(game, /querySelector<HTMLElement>\('#s-over \.panel'\)/);
  assert.match(game, /invitationTitle\.textContent = '¿Quieres mejorar tus conocimientos\?';/);
  assert.match(game, /overPanel\.insertBefore\(invitation, replayButton\);/);
  assert.doesNotMatch(game, /startPanel\.append\(invitation\)/);
});

test('el botón de horarios tiene la URL real y respeta la partida en iPhone', () => {
  assert.match(game, /schedules\.href = 'https:\/\/dispositivos-ciac\.pages\.dev\/';/);
  assert.match(game, /schedules\.target = '_blank';/);
  assert.match(game, /schedules\.rel = 'noopener noreferrer';/);
  assert.match(game, /schedules\.addEventListener\('pointerdown', \(event\) => event\.stopPropagation\(\)\);/);
  assert.match(css, /#s-over \.ciac-schedules-link/);
  assert.match(css, /min-height: 46px/);
  assert.match(css, /touch-action: manipulation/);
});

test('los resultados y el guardado del ranking siguen en la pantalla final', () => {
  assert.match(game, /overPanel\.insertBefore\(this\.summary, replayButton\);/);
  assert.match(game, /overPanel\.append\(this\.resultForm\);/);
  assert.match(game, /this\.resultForm\.hidden = !this\.token;/);
});
