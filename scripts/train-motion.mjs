import { readFile, writeFile } from 'node:fs/promises';

// Correcciones de la pista original, tras preparar la integración CIAC.
// Se conservan las tres vías y el solucionador de rutas del motor.
const path = 'upstream/src/sim/track.ts';
let source = await readFile(path, 'utf8');
const replaceOnce = (before, after, name) => {
  const matches = source.split(before).length - 1;
  if (matches !== 1) throw new Error('Trenes: cambió ' + name + ' (' + matches + ')');
  source = source.replace(before, after);
};

// Dos clases de encuentro, tal como permite el motor original:
// trenes que vienen de frente y trenes estacionados con acceso por rampa.
// El corredor puede volver a subir a los techos en los tres carriles.
replaceOnce('const cars = r.int(1, maxCars);',
  'const cars = r.int(3, Math.max(3, Math.min(4, maxCars)));',
  'tres o cuatro vagones estacionados');
replaceOnce('const cars = r.int(1, Math.min(3, maxCars));',
  'const cars = r.int(3, Math.max(3, Math.min(4, maxCars)));',
  'tres o cuatro vagones móviles');
replaceOnce('busy[l] = at + MOVER.ratio * MOVER.trigger + len + 4;',
  'busy[l] = at + len / (1 + MOVER.ratio) + v * 0.95 + 9;',
  'distancia de seguridad para trenes móviles');
replaceOnce('const rampP = 0.25 + 0.35 * L;',
  'const rampP = 0.52 + 0.18 * L;',
  'accesos a techos');

// Tutorial: primero saltar y deslizarse; después de la primera pregunta,
// acceder a un tren estacionado por una rampa y recorrer su techo.
// Nada invade la franja reservada entre los metros 140 y 190.
replaceOnce("      { kind: 'train', lane: 1, d0: s + 100, d1: s + 100 + trainLength(2), cars: 2, hint: 'lane' },",
  "      { kind: 'low', lane: 1, d0: s + 79, d1: s + 79 + OB.low.depth, hint: 'lane' },",
  'mantener tutorial de cambio de carril antes de la primera pregunta');
replaceOnce("{ kind: 'ramp', lane: 0, d0: s + 150, d1: s + 157, hint: 'ramp' }",
  "{ kind: 'ramp', lane: 0, d0: s + 177, d1: s + 184, hint: 'ramp' }",
  'rampa tras primera pregunta');
replaceOnce("{ kind: 'train', lane: 0, d0: s + 157, d1: s + 157 + trainLength(3), cars: 3 }",
  "{ kind: 'train', lane: 0, d0: s + 184, d1: s + 184 + trainLength(3), cars: 3 }",
  'primer tren de techo');
replaceOnce('const end = s + 200;',
  'const end = s + 240;',
  'distancia del tutorial');
replaceOnce('this.busy = [s + 157 + trainLength(3) + 12, s + 120, s + 120];',
  'this.busy = [s + 184 + trainLength(3) + 12, s + 120, s + 120];',
  'reserva final de vías del tutorial');
await writeFile(path, source);
