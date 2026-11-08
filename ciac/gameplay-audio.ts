// Original sequences synthesized by the engine's Web Audio oscillator.
export const GAMEPLAY_CUES = {
  correct: [660, 880],
  wrong: [310, 220],
  shield: [523, 784, 1175],
  absorbed: [440, 330, 660],
  urgent: [146, 146, 196],
  caught: [196, 131, 65],
  bonus: [659, 831, 988, 1319]
} as const;

export type GameplayCue = keyof typeof GAMEPLAY_CUES;

export function playGameplayCue(
  state: string | undefined, muted: boolean, cue: GameplayCue,
  play: (frequency: number, delay: number) => void, delay = 0
) {
  if (state !== 'running' || muted) return;
  GAMEPLAY_CUES[cue].forEach((frequency, index) => play(frequency, delay + index * .075));
}
