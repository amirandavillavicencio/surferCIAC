import { QUESTION_VISIBLE_DISTANCE } from './course';

export class RacePace {
  factor = 1;
  penaltyRemaining = 0;
  private from = 1;
  private target = 1;
  private elapsed = 0;
  private readonly duration = 0.65;

  reset() {
    this.factor = this.from = this.target = 1;
    this.elapsed = this.penaltyRemaining = 0;
  }

  penalize(seconds: number) {
    this.penaltyRemaining = Math.max(this.penaltyRemaining, seconds);
  }

  step(dt: number, distance: number, gate: number) {
    if (this.penaltyRemaining > 0) {
      this.penaltyRemaining = Math.max(0, this.penaltyRemaining - dt);
      // Preserve the existing full three seconds at 55%, including overlapping strips.
      this.factor = this.from = this.target = 0.55;
      this.elapsed = 0;
      return this.factor;
    }
    const target = distance >= gate - QUESTION_VISIBLE_DISTANCE && distance < gate ? 0.60 : 1;
    if (target !== this.target) {
      this.from = this.factor;
      this.target = target;
      this.elapsed = 0;
    }
    this.elapsed = Math.min(this.duration, this.elapsed + dt);
    const t = this.elapsed / this.duration;
    this.factor = this.from + (this.target - this.from) * t * t * (3 - 2 * t);
    return this.factor;
  }
}
