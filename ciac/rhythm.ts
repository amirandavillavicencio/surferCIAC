import { OB } from '../config';
import type { Spec } from '../sim/track';
import { trafficKind, type TrafficKind } from './encounters';

export class RaceDirector {
  private last: TrafficKind | undefined;

  reset() { this.last = undefined; }

  choose(index: number, start: number, variant: number, centerBusy: boolean): TrafficKind {
    // Prefer active encounters rather than long passive recovery runs.
    // The physically verified encounter variants and quiz slots stay unchanged.
    const preferred = start > 900 && variant % 3 === 0
      ? 'dodge' : trafficKind(index + variant % 3, start);
    const active = preferred === 'pass' || preferred === 'recovery'
      ? (this.last === 'roof-traffic' || this.last === 'transfer' ? 'dodge' : 'roof-traffic')
      : preferred;
    const available = (kind: TrafficKind) =>
      kind !== this.last && (!centerBusy || (kind !== 'transfer' && kind !== 'roof-traffic'));
    const choices: TrafficKind[] = [active, 'roof-traffic', 'dodge', 'double', 'transfer'];
    return choices.find(available) ?? 'pass';
  }

  remember(kind: TrafficKind) { this.last = kind; }
}

export function rhythmBarrier(lane: number, distance: number, kind: 'low' | 'overhead'): Spec {
  return { kind, lane, d0: distance, d1: distance + OB[kind].depth };
}

export function connectEncounter(start: number, from: number, kind: TrafficKind, variant: number): Spec[] {
  // The entry leaves the opposite outer lane open. The exit reverses that
  // choice on ground encounters, or lets the runner jump or slide in place.
  const entry = rhythmBarrier(1, start + 8, variant % 2 === 0 ? 'low' : 'overhead');
  if (kind !== 'pass' && kind !== 'dodge') return [entry];
  const exit = rhythmBarrier(2 - from, start + 82, variant % 2 === 0 ? 'overhead' : 'low');
  return [entry, exit];
}
