import type { PowerKind } from '../sim/types';

// Repartir los tres poderes por igual, sin depender de la semilla del nivel.
export const ACADEMIC_POWERS: readonly PowerKind[] = ['magnet', 'double', 'shoes'];
export const ACADEMIC_POWER_LABELS: Record<PowerKind, string> = {
  magnet: 'Imán de monedas',
  double: 'Puntaje ×2',
  shoes: 'Superzapatillas',
};

export function powerForCorrectAnswer(correctAnswers: number): PowerKind {
  if (!Number.isSafeInteger(correctAnswers) || correctAnswers < 1) {
    throw new RangeError('Se requiere al menos una respuesta correcta verificada');
  }
  return ACADEMIC_POWERS[(correctAnswers - 1) % ACADEMIC_POWERS.length];
}
