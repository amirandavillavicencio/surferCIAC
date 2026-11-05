import type { Sim } from '../sim/sim';
import type { World } from '../view/world';
import './race-fx.css';

// Decoración y avisos: nunca alteran obstáculos ni puntaje.
export class RaceFX {
  private readonly rush: HTMLDivElement;
  private readonly notice: HTMLDivElement;
  private readonly passed = new Set<number>();
  private previousLane = 1;
  private tilt = 0;
  private noticeLeft = 0;
  private paceBand = -1;
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(root: HTMLElement) {
    this.rush = document.createElement('div');
    this.rush.className = 'ciac-rush';
    this.rush.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) this.rush.append(document.createElement('i'));

    this.notice = document.createElement('div');
    this.notice.className = 'ciac-train-alert';
    this.notice.setAttribute('role', 'status');
    this.notice.hidden = true;
    root.append(this.rush, this.notice);
  }

  reset() {
    this.passed.clear();
    this.previousLane = 1;
    this.tilt = 0;
    this.noticeLeft = 0;
    this.rush.classList.remove('active');
    this.notice.hidden = true;
  }

  update(sim: Sim, world: World, dt: number, playing: boolean, inQuestion: boolean) {
    if (!playing || !sim.alive) {
      this.rush.classList.remove('active');
      this.notice.hidden = true;
      this.noticeLeft = 0;
      this.tilt = 0;
      this.previousLane = sim.lane;
      return;
    }

    const pace = Math.max(0, Math.min(1, (sim.speed - 12) / 15));
    this.rush.classList.toggle('active', !this.reducedMotion.matches);
    this.rush.classList.toggle('question', inQuestion);
    const band = Math.round(pace * 4);
    if (band !== this.paceBand) {
      this.paceBand = band;
      this.rush.style.setProperty('--ciac-streak-time', (0.9 - band * 0.09).toFixed(2) + 's');
      this.rush.style.setProperty('--ciac-rush-opacity', (0.12 + band * 0.045).toFixed(2));
    }

    if (inQuestion) {
      this.notice.hidden = true;
      this.noticeLeft = 0;
      this.tilt = 0;
      this.previousLane = sim.lane;
      return;
    }

    if (sim.lane !== this.previousLane) {
      this.tilt = (sim.lane - this.previousLane) * -0.012;
      this.previousLane = sim.lane;
    }
    this.tilt *= Math.exp(-dt * 5);
    if (!this.reducedMotion.matches) world.camera.rotateZ(this.tilt);

    this.noticeLeft = Math.max(0, this.noticeLeft - dt);
    if (this.noticeLeft === 0) this.notice.hidden = true;

    let incoming = false;
    for (const train of sim.obs) {
      if (train.kind !== 'mtrain') continue;
      const gap = train.d0 - sim.d;
      if (gap > 0 && gap < 72 && train.lane === sim.lane) incoming = true;
      if (train.d1 - sim.d < 0 && train.d1 - sim.d > -12 && train.lane !== sim.lane && !this.passed.has(train.id)) {
        this.passed.add(train.id);
        if (this.passed.size > 100) this.passed.clear();
        this.show('¡Tren esquivado!', 1.1, false);
        world.fx.burst(sim.x, sim.y + 0.35, 0.1, 5, 0xcceeff, {
          speed: 1.3, up: 0.35, size: 0.18, life: 0.28, grav: 0
        });
      }
    }
    if (incoming && this.noticeLeft < 0.2) {
      this.show('¡Tren de frente!', 0.28, true);
    }
  }

  private show(message: string, seconds: number, danger: boolean) {
    if (this.notice.textContent !== message) this.notice.textContent = message;
    this.notice.classList.toggle('danger', danger);
    this.notice.hidden = false;
    this.noticeLeft = seconds;
  }
}
