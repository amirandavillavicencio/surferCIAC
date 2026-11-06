// Physics runs at 120 Hz regardless of display refresh. A temporary stall keeps
// bounded debt; tab suspension is handled explicitly by reset(), never replayed.
export class FrameClock {
  readonly step = 1 / 120;
  private debt = 0;
  dropped = 0;
  reset() { this.debt = 0; }
  advance(elapsed: number, update: (dt: number) => void) {
    const pending = this.debt + Math.max(0, elapsed);
    this.debt = Math.min(0.5, pending);
    this.dropped += Math.max(0, pending - this.debt);
    let steps = 0;
    while (this.debt + 1e-10 >= this.step && steps < 24) {
      update(this.step);
      this.debt -= this.step;
      steps++;
    }
    return Math.max(0, Math.min(1, this.debt / this.step));
  }
}
