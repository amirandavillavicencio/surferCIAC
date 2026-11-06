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
  'const cars = r.int(1, Math.min(4, maxCars + 1));',
  'longitud variable de trenes estacionados');
replaceOnce('const cars = r.int(1, Math.min(3, maxCars));',
  'const cars = r.int(1, Math.min(4, maxCars + 2));',
  'longitud variable de trenes móviles');
replaceOnce('const rampP = 0.25 + 0.35 * L;',
  'const rampP = 0.52 + 0.18 * L;',
  'accesos a techos');

// Commit the ramp and its destination together, only after checking the fit.
replaceOnce(`      let t0 = at;
      if (withRamp) {
        specs.push({ kind: 'ramp', lane: l, d0: at, d1: at + OB.ramp.depth });
        t0 = at + OB.ramp.depth;
      }
      const t1 = t0 + trainLength(cars);
      if (t1 > end - 6) return false;`,
  `      const t0 = at + (withRamp ? OB.ramp.depth : 0);
      const t1 = t0 + trainLength(cars);
      if (t1 > end - v * 0.8) return false;
      if (withRamp) specs.push({ kind: 'ramp', lane: l, d0: at, d1: t0 });`,
  'rampa y techo se generan juntos');
replaceOnce('      specs.push({ kind: \'mtrain\', lane: l, d0: at, d1: at + len / (1 + MOVER.ratio), cars, variant: r.int(0, 2) });',
  `      const tailMeet = at + len / (1 + MOVER.ratio);
      if (tailMeet > end - v * 0.8) return false;
      specs.push({ kind: 'mtrain', lane: l, d0: at, d1: tailMeet, cars, variant: r.int(0, 2) });`,
  'el encuentro completo pertenece al tramo comprobado');

replaceOnce('const end = start + this.rng.range(90, 130);',
  'const end = start + Math.round(this.rng.range(90, 130) / STEP) * STEP;', 'malla compartida entre tramos');
replaceOnce('    let d = start + gap * 0.6;',
  '    let d = start + v * 0.65;', 'tempo de leitura no início do trecho');
replaceOnce('    while (d < end - 12) {',
  '    while (d < end - v * 0.8 - 16) {', 'espaço para reagir entre trechos');

// Encounters have an entry, a decision and a way out. Keep the route
// solver as the final check after each combination is assembled.
replaceOnce("type Pattern = 'none' | 'b1' | 'b2' | 'b3' | 't1' | 't2' | 't3' | 'tb' | 'mt';",
  "type Pattern = 'none' | 'b1' | 'b2' | 'b3' | 't1' | 't2' | 't3' | 'tb' | 'mt' | 'roofs' | 'relay';",
  'patrones de recorrido');
replaceOnce('tb: 0, mt: 0 }', 'tb: 0, mt: 0, roofs: 0, relay: 0 }', 'patrones de reserva');
replaceOnce('            tb: Math.max(0, L - 0.2) * 0.45,',
  `            tb: Math.max(0, L - 0.2) * 0.45,
            roofs: 0.07 + L * 0.16,
            relay: 0.04 + L * 0.12,`, 'progresión de recorridos combinados');
replaceOnce("        case 'mt': {",
  `        case 'roofs': {
          const from = shuffled.find(l => free(l, d));
          if (from === undefined || !train(from, d, true, maxCars)) break;
          const at = d + OB.ramp.depth + v * 0.3;
          const to = shuffled.find(l => Math.abs(l - from) === 1 && free(l, at));
          if (to !== undefined) train(to, at, false, maxCars);
          break;
        }
        case 'relay': {
          const from = shuffled.find(l => free(l, d - 10));
          if (from === undefined || !mover(from, d, maxCars)) break;
          const at = d + v * r.range(0.85, 1.1);
          const to = shuffled.find(l => l !== from && free(l, at));
          if (to !== undefined && at < end - v * 0.8 - 4) barrier(to, at);
          break;
        }
        case 'mt': {`, 'trenes escalonados y esquiva seguida de barrera');

// The fallback route must be runnable without assuming a jump or slide.
replaceOnce("    if (s.kind !== 'train' && s.kind !== 'ramp' && s.kind !== 'mtrain') continue;",
  '', 'incluir barreras en el solucionador');
replaceOnce('  const walkTrain = new Uint8Array(n * L);',
  '  const barrier = new Uint8Array(n * L);\n  const walkTrain = new Uint8Array(n * L);',
  'ocupación de barreras');
replaceOnce('      } else if (d >= s.d0 && d <= s.d1) ramp[i * L + s.lane] = d - s.d0;',
  `      } else if (s.kind === 'ramp') {
        if (d >= s.d0 && d <= s.d1) ramp[i * L + s.lane] = d - s.d0;
      } else if (d >= s.d0 - PLAYER.halfD && d <= s.d1 + PLAYER.halfD) {
        barrier[i * L + s.lane] = 1;
      }`, 'separar barreras de techos');
replaceOnce('Math.floor((s.d0 - start) / STEP)', 'Math.floor((s.d0 - PLAYER.halfD - start) / STEP)', 'margen frontal');
replaceOnce('Math.ceil((s.d1 - start) / STEP)', 'Math.ceil((s.d1 + PLAYER.halfD - start) / STEP)', 'margen posterior');
replaceOnce('!body[i * L + l] &&', '!body[i * L + l] && !barrier[i * L + l] &&', 'suelo transitable');
replaceOnce(`if (ramp[j * L + l] >= 0) mark(j, l, 1, k);
          else if (!body[j * L + l]) mark(j, l, 0, k);`,
  `if (ramp[j * L + l] >= 0) mark(j, l, 1, k);
          else if (groundOk(j, l)) mark(j, l, 0, k);`, 'avance en suelo');
replaceOnce('if (t <= i + lcSteps / 2 && body[t * L + l])', 'if (t <= i + lcSteps / 2 && !groundOk(t, l))', 'salida del carril');
replaceOnce('if (walkTrain[j * L + l] || body[j * L + l] || ramp[j * L + l] >= 0)',
  'if (walkTrain[j * L + l] || ramp[j * L + l] >= 0)', 'un tren móvil carece de apoyo');
replaceOnce('else if (!body[j * L + l]) mark(j, l, 0, k);',
  'else if (groundOk(j, l)) mark(j, l, 0, k);', 'salida del techo');
replaceOnce('if (walkTrain[t * L + m] || body[t * L + m] || ramp[t * L + m] >= 0)',
  'if (!groundOk(t, m) || ramp[t * L + m] >= 0)', 'descenso a vía libre');

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
