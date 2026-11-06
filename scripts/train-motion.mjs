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

// Los vagones estacionarios de un solo coche dominaban el inicio de la carrera.
// Todas las variantes de patrón ferroviario pasan ahora por el simulador móvil,
// que conserva la colisión, el movimiento y el solucionador de caminos.
const from = source.indexOf('    const train = (l: number, at: number, withRamp: boolean, maxCars: number) => {');
const until = source.indexOf('    const mover = (l: number, at: number, maxCars: number) => {', from);
if (from < 0 || until <= from) throw new Error('No se encontró el generador original de trenes');
source = source.slice(0, from) + `    const train = (l: number, at: number, _withRamp: boolean, maxCars: number) => {
      // Sin rampa: un tren que llega de frente no es una plataforma estática.
      return mover(l, at, Math.max(3, maxCars));
    };
` + source.slice(until);
replaceOnce('const cars = r.int(1, Math.min(3, maxCars));',
  'const cars = r.int(3, Math.max(3, Math.min(4, maxCars)));',
  'mínimo de tres vagones');
replaceOnce('busy[l] = at + MOVER.ratio * MOVER.trigger + len + 4;',
  'busy[l] = at + len / (1 + MOVER.ratio) + v * 0.95 + 9;',
  'distancia de seguridad para trenes móviles');

// En el tutorial se conservan las señales de salto y deslizamiento,
// pero se sustituyen los trenes quietos por trenes móviles y se retiran
// sus rampas. La reserva de preguntas se aplica antes de construir la pista.
replaceOnce('    specs = this.course.prepareSpecs(specs);',
  `    specs = this.course.prepareSpecs(specs.filter(spec => spec.kind !== 'ramp').map(spec => {
      if (spec.kind !== 'train') return spec;
      const cars = Math.max(3, spec.cars || 1);
      return {
        ...spec, kind: 'mtrain' as const, cars,
        d1: spec.d0 + trainLength(cars) / (1 + MOVER.ratio)
      };
    }));`,
  'tutorial de trenes');
await writeFile(path, source);
