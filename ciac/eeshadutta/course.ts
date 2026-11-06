const VIEW_AHEAD = 270;
type Spec = { kind:string;d0:number;d1:number;lane:number };

export const FIRST_GATE = 180;
export const GATE_SPACING = 150;
export const QUESTION_VISIBLE_DISTANCE = 40;
export const STRIP_LENGTH = 36;
export const SAFE_AFTER = 10;
export const RETIRE_BEHIND = 14;

// Reservations exist before Track.reset generates even the tutorial. Network
// latency can skip a slot, but can never move a reservation into built track.
export class QuizCourse {
  enabled = true;
  private lastGate = Infinity;

  reset(enabled = true) { this.enabled = enabled; this.lastGate = Infinity; }

  gateAtOrAfter(distance: number) {
    return FIRST_GATE + Math.max(0, Math.ceil((distance - FIRST_GATE) / GATE_SPACING)) * GATE_SPACING;
  }

  stop(frontier: number) {
    // Finish any reservation touching generated track. Never fill a visible gap.
    this.lastGate = this.gateAtOrAfter(frontier + QUESTION_VISIBLE_DISTANCE);
  }

  intersects(from: number, until: number) {
    if (!this.enabled) return false;
    const gate = this.gateAtOrAfter(from - SAFE_AFTER);
    return gate <= this.lastGate && gate - QUESTION_VISIBLE_DISTANCE <= until;
  }

  allowsObstacle(spec: Spec) {
    // A moving train has two distances: its physical position (far ahead
    // while approaching) and the runner distance where collision is possible.
    // Reserve only the meeting interval. Reserving its entire travel path
    // removed nearly every moving train between consecutive questions.
    const anticipation = spec.kind === 'mtrain' ? 6 : 0;
    return !this.intersects(spec.d0 - anticipation, spec.d1 + RETIRE_BEHIND);
  }

  allowsPickup(distance: number) { return !this.intersects(distance - 1, distance + 1); }

  prepareSpecs(specs: Spec[]) {
    const admitted = specs.filter(spec => this.allowsObstacle(spec));
    // A rejected train must take its access ramp with it, before path solving.
    return admitted.filter(spec => spec.kind !== 'ramp' || admitted.some(train =>
      train.kind === 'train' && train.lane === spec.lane && Math.abs(train.d0 - spec.d1) < 0.01));
  }

  canShow(gate: number, distance: number) {
    return gate <= this.lastGate && gate - distance <= VIEW_AHEAD && gate - distance > -RETIRE_BEHIND;
  }
}
