// Timed vehicles start outside the render horizon. Their conservative encounter
// envelope covers every allowed runner speed (including quiz/stumble penalties).
// For v<=27, train speed>=52, length<=27.86: the tail passes before start+85.
export const TRAIN_SPAWN_AHEAD = 218;
export const TRAIN_MIN_SPEED = 52;
export const TRAIN_MAX_SPEED = 68;
export function timedFront(activation: number, speed: number, elapsed: number) {
  return activation + TRAIN_SPAWN_AHEAD - speed * elapsed;
}
