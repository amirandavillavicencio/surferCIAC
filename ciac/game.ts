import { QuizAnswerTrack } from './answer-track';
import { QuizCourse, FIRST_GATE, GATE_SPACING, QUESTION_VISIBLE_DISTANCE, STRIP_LENGTH } from './course';
import type { Scene } from 'three';
import './game.css';
import { MISSIONS, RunMissions } from './missions';
import type { GameplayCue } from './gameplay-audio';
import { powerForCorrectAnswer, ACADEMIC_POWER_LABELS } from './academic-powerups';
import { POWER_TIME } from '../config';
import type { PowerKind } from '../sim/types';

type Question = { id: string; curso: string; tema: string; enunciado: string; breve?: string; opciones: string[] };
type LaneAction = 'left' | 'right' | 'up' | 'down' | 'pause' | 'confirm' | string;
type Phase = 'idle' | 'ready' | 'question' | 'submitting' | 'complete' | 'ended';
interface Hooks {
  scene: Scene; notice(message: string): void; course: QuizCourse;
  frontier(): number; penalize(seconds: number): void;
  reward?(shield:boolean, bonus:number):void;
  grantPower(kind: PowerKind): void;
  threat(correct: boolean): number;
  sound(cue: GameplayCue, delay?: number): void;
}

async function api(path: string, body?: object): Promise<any> {
  const response = await fetch('/api/' + path, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  } : { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error de conexión');
  return data;
}

export class CIACQuiz {
  private missions = new RunMissions();
  private missionHUD: HTMLDivElement;
  private feedback: HTMLDivElement;
  private feedbackUntil = 0;
  private summary: HTMLElement;
  private phase: Phase = 'idle';
  private runSerial = 0;
  private hooks: Hooks;
  private token = '';
  private question: Question | null = null;
  private selected = 1;
  private readonly answerTrack: QuizAnswerTrack;
  private nextDistance = FIRST_GATE;
  private currentDistance = 0;
  private dialog: HTMLDivElement;
  private dangerHUD: HTMLDivElement;
  private lastDanger=-1;
  private title: HTMLElement;
  private choices: HTMLButtonElement[] = [];
  private message: HTMLElement;
  private select: HTMLSelectElement;
  private resultForm: HTMLFormElement;
  private playerName: HTMLInputElement;
  private formStatus: HTMLElement;
  private ranking: HTMLElement;

  constructor(hooks: Hooks) {
    this.hooks = hooks;
    this.answerTrack = new QuizAnswerTrack(hooks.scene);
    const startPanel = document.querySelector<HTMLElement>('#s-start .panel');
    const overPanel = document.querySelector<HTMLElement>('#s-over .panel');
    if (!startPanel || !overPanel) throw new Error('No se encontró la interfaz del motor SUBWAY-SURFERS');

    const label = document.createElement('label');
    label.className = 'ciac-course';
    label.textContent = 'Preguntas de primer año · USM';
    this.select = document.createElement('select');
    this.select.setAttribute('aria-label', 'Seleccionar semestre');
    for (const semester of ['Primer semestre', 'Segundo semestre', 'Todos']) {
      const option = document.createElement('option');
      option.value = semester;
      option.textContent = semester;
      this.select.append(option);
    }
    label.append(this.select);
    startPanel.insertBefore(label, document.getElementById('btn-play'));

    const prize = document.createElement('p');
    prize.className = 'ciac-prize';
    prize.textContent = 'El ganador de la semana se lleva un kit de premio.';
    startPanel.insertBefore(prize, document.getElementById('btn-play'));

    this.ranking = document.createElement('div');
    this.ranking.className = 'ciac-ranking';
    startPanel.append(this.ranking);
    void this.refreshRanking();

    this.dialog = document.createElement('div');
    this.dialog.className = 'ciac-dialog';
    this.dialog.hidden = true;
    this.title = document.createElement('strong');
    this.title.className = 'ciac-question';
    this.message = document.createElement('div');
    this.message.className = 'ciac-message';
    this.message.setAttribute('aria-live', 'off');
    const lanes = document.createElement('div');
    lanes.className = 'ciac-lanes';
    for (let i = 0; i < 3; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ghost ciac-lane';
      button.tabIndex = -1;
      button.disabled = true;
      this.choices.push(button);
      lanes.append(button);
    }
    this.dialog.append(this.title, lanes, this.message);
    document.getElementById('ui')!.append(this.dialog);
    this.dangerHUD=document.createElement('div');
    this.dangerHUD.className='ciac-danger';
    this.dangerHUD.hidden=true;
    document.getElementById('ui')!.append(this.dangerHUD);
    this.missionHUD = document.createElement('div');
    this.missionHUD.className = 'ciac-mission';
    this.feedback = document.createElement('div');
    this.feedback.className = 'ciac-feedback';
    this.feedback.setAttribute('role', 'status');
    this.missionHUD.hidden = this.feedback.hidden = true;
    document.getElementById('ui')!.append(this.missionHUD, this.feedback);

    this.resultForm = document.createElement('form');
    this.resultForm.className = 'ciac-result';
    this.resultForm.hidden = true;
    const resultTitle = document.createElement('strong');
    resultTitle.textContent = 'Publica tu puntaje en el ranking';
    this.playerName = document.createElement('input');
    this.playerName.type = 'text';
    this.playerName.required = true;
    this.playerName.minLength = 2;
    this.playerName.maxLength = 24;
    this.playerName.setAttribute('autocomplete', 'nickname');
    this.playerName.placeholder = 'Tu nombre en el ranking';
    this.playerName.setAttribute('aria-label', 'Nombre público');
    const button = document.createElement('button');
    button.type = 'submit';
    button.className = 'big';
    button.textContent = 'Guardar puntaje';
    this.formStatus = document.createElement('span');
    this.formStatus.setAttribute('role', 'status');
    this.resultForm.append(resultTitle, this.playerName, button, this.formStatus);
    this.resultForm.addEventListener('submit', (event) => { event.preventDefault(); void this.saveScore(); });
    this.resultForm.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.summary=document.createElement('p');
    this.summary.className='ciac-run-summary';
    overPanel.append(this.summary,this.resultForm);
  }

  get activeGate() {
    return this.phase === 'ready' || this.phase === 'question' ? this.nextDistance : Infinity;
  }
  render(distance: number) { this.answerTrack.update(distance, this.hooks.course); }
  get questionSlow() {
    return this.phase === 'question' &&
      this.nextDistance - this.currentDistance <= STRIP_LENGTH &&
      this.currentDistance < this.nextDistance;
  }

  setDanger(level:number, shield=false) {
    if(this.phase==='ended')return;
    const display=level+(shield?5:0);
    if(display===this.lastDanger)return;
    this.lastDanger=display;
    this.dangerHUD.hidden=level===0&&!shield;
    this.dangerHUD.textContent=[level?'Guardia · '+level+'/4':'',shield?'Escudo activo':''].filter(Boolean).join(' · ');
    this.dangerHUD.setAttribute('data-danger',String(level));
  }

  observeRun(distance: number, stumbled: boolean) {
    this.missions.advance(distance, stumbled);
  }

  presentFeedback(playing: boolean) {
    this.feedback.hidden = !playing || performance.now() >= this.feedbackUntil;
    this.missionHUD.hidden = !playing || !this.dialog.hidden || !this.feedback.hidden;
    if (this.missionHUD.hidden) return;
    const progress = this.missions.progress;
    const next = MISSIONS.findIndex((mission, index) => progress[index] < mission.goal);
    const mission = MISSIONS[next];
    const text = mission
      ? `Misiones · ${next + 1}/${MISSIONS.length} · ${mission.label} ${progress[next]}/${mission.goal}`
      : 'Misiones · 4/4 completadas';
    if (this.missionHUD.textContent !== text) this.missionHUD.textContent = text;
  }

  reset() {
    this.runSerial++;
    this.phase = 'idle';
    this.question = null;
    this.token = '';
    this.missions = new RunMissions();
    this.feedbackUntil = 0;
    this.feedback.hidden = this.missionHUD.hidden = true;
    this.summary.textContent='';
    this.dialog.hidden = true;
    this.setDanger(0);
    this.resultForm.hidden = true;
    this.formStatus.textContent = '';
    this.playerName.disabled = false;
    this.playerName.value = '';
    const saveButton = this.resultForm.querySelector<HTMLButtonElement>('button[type=submit]')!;
    saveButton.disabled = false;
    saveButton.hidden = false;
    this.nextDistance = FIRST_GATE;
    this.currentDistance = 0;
    this.answerTrack.hide();
    this.dialog.classList.remove('ciac-correct', 'ciac-wrong');
    for (const choice of this.choices) choice.disabled = true;
    void this.refreshRanking();
  }

  async start() {
    const serial = this.runSerial;
    this.phase = 'idle';
    try {
      const response = await api('start', { semestre: this.select.value });
      if (serial !== this.runSerial) return;
      this.token = response.token;
      if ((this.phase as Phase) === 'ended') { this.resultForm.hidden = false; return; }
      this.question = response.question;
      this.nextDistance = this.hooks.course.gateAtOrAfter(Math.max(FIRST_GATE, this.currentDistance + QUESTION_VISIBLE_DISTANCE));
      this.phase = this.question ? 'ready' : 'complete';
      if (!this.question) this.hooks.course.stop(this.hooks.frontier());
    } catch (error) {
      if (serial !== this.runSerial) return;
      this.hooks.course.stop(this.hooks.frontier());
      this.hooks.notice('Preguntas no disponibles: ' + String(error instanceof Error ? error.message : error));
    }
  }

  // La carrera sigue avanzando. Se responde con el carril al cruzar la franja.
  tick(distance: number, lane: number) {
    this.currentDistance = distance;
    if (this.phase === 'submitting') {
      this.dialog.hidden = true;
      return;
    }
    if (!this.question || (this.phase !== 'ready' && this.phase !== 'question')) {
      this.dialog.hidden = true;
      return;
    }

    const ahead = this.nextDistance - distance;
    if (ahead > QUESTION_VISIBLE_DISTANCE) {
      this.dialog.hidden = true;
      return;
    }

    if (this.phase === 'ready') {
      this.phase = 'question';
      this.title.textContent = this.question.curso + ' · ' +
        (this.question.breve || this.question.enunciado);
      this.choices.forEach((button, index) => {
        const side = ['izquierdo', 'central', 'derecho'][index];
        button.textContent = ['A', 'B', 'C'][index] + ' · ' + this.question!.opciones[index];
        button.setAttribute('aria-label', 'Carril ' + side + ': ' + this.question!.opciones[index]);
      });
      this.message.textContent = 'Elige un carril y cruza su franja de color.';
    }
    if (this.selected !== lane || this.dialog.hidden) {
      this.selected = lane;
      this.highlight();
    }
    this.dialog.hidden = false;

    if (ahead <= 0) {
      this.phase = 'submitting';
      this.dialog.hidden = true;
      void this.answer(lane);
    }
  }

  handleAction(_action: LaneAction) {
    // Los gestos son del corredor; ningún botón del quiz interrumpe la carrera.
    return false;
  }

  presentLane(lane: number) {
    if (this.phase !== 'question') return;
    if (this.selected !== lane) { this.selected = lane; this.highlight(); }
  }

  private highlight() {
    for (let i = 0; i < 3; i++) this.choices[i].classList.toggle('selected', i === this.selected);
  }

  private async answer(lane: number) {
    if (this.phase !== 'submitting' || !this.question) return;
    const serial = this.runSerial;
    const gateDistance = this.nextDistance;
    try {
      const response = await api('answer', { token: this.token, lane });
      if (serial !== this.runSerial || (this.phase as Phase) === 'ended') return;
      if (typeof response.correct !== 'boolean' || !Number.isSafeInteger(response.points) || response.points < 0) {
        throw new Error('Respuesta del servidor incompleta');
      }
      this.question = response.question;
      this.nextDistance = this.hooks.course.gateAtOrAfter(Math.max(
        gateDistance + GATE_SPACING, this.currentDistance + QUESTION_VISIBLE_DISTANCE
      ));
      this.phase = this.question ? 'ready' : 'complete';
      const change = this.hooks.threat(response.correct);
      const { earned, shield, bonus } = this.missions.answer(response.correct, response.points, change);
      // Se concede exclusivamente después de recibir el acierto validado por la API.
      const power = response.correct ? powerForCorrectAnswer(this.missions.correct) : null;
      if (power) this.hooks.grantPower(power);
      this.hooks.sound(response.correct ? 'correct' : 'wrong');
      if (shield || bonus) {
        this.hooks.reward?.(shield, bonus);
        this.hooks.sound(shield ? 'shield' : 'bonus', .24);
      }
      if (!response.correct) this.hooks.penalize(Number(response.penaltySeconds) || 3);
      const danger = change ? ` · Guardia ${change > 0 ? '+' : '−'}${Math.abs(change)}` : '';
      const reward = shield ? ' · Escudo por 150 m' : bonus ? ' · +100 de carrera' : '';
      const powerText = power ? ` · ${ACADEMIC_POWER_LABELS[power]} ${POWER_TIME[power]} s` : '';
      this.feedback.dataset.correct = String(response.correct);
      this.feedback.textContent = response.correct
        ? `¡Correcto! · +${earned} académicos${danger}${powerText}${reward}`
        : `Incorrecto${danger} · Menor velocidad`;
      this.feedbackUntil = performance.now() + 2300;
      if (!this.question) this.hooks.course.stop(this.hooks.frontier());
    } catch (error) {
      if (serial !== this.runSerial) return;
      // Si no hay respuesta del servidor, no se inventan puntos.
      this.phase = 'complete';
      this.hooks.course.stop(this.hooks.frontier());
      this.hooks.notice('No se pudo validar la respuesta: ' +
        String(error instanceof Error ? error.message : error));
    }
  }

  endRun(distance:number, score:number, caught:boolean) {
    this.summary.textContent=`${Math.floor(distance)} m · ${score} puntos de carrera · ${this.missions.correct} aciertos · Mejor racha: ${this.missions.bestStreak} · ${caught?'Te alcanzó el guardia':'Choque con un obstáculo'}`;
    const progress = this.missions.progress;
    const completed = MISSIONS.filter((mission, index) => progress[index] >= mission.goal);
    const missions = document.createElement('small');
    missions.textContent = completed.length
      ? 'Misiones completadas · ' + completed.map(mission => `${mission.goal} ${mission.label.toLowerCase()}`).join(' · ')
      : 'Misiones completadas · 0/4';
    this.summary.append(missions);
    this.feedback.hidden = this.missionHUD.hidden = true;
    this.runSerial++;
    this.phase = 'ended';
    this.dangerHUD.hidden=true;
    this.answerTrack.hide();
    this.dialog.hidden = true;
    this.resultForm.hidden = !this.token;
    this.formStatus.textContent = '';
  }

  private async saveScore() {
    const button = this.resultForm.querySelector<HTMLButtonElement>('button[type=submit]')!;
    if (!this.token) return;
    button.disabled = true;
    this.formStatus.textContent = 'Validando nombre…';
    try {
      const result = await api('finish', {token: this.token, name: this.playerName.value});
      this.formStatus.textContent = 'Puntaje guardado: ' + result.points;
      button.hidden = true;
      this.playerName.disabled = true;
      void this.refreshRanking();
    } catch (error) {
      this.formStatus.textContent = String(error instanceof Error ? error.message : error);
      button.disabled = false;
    }
  }

  private async refreshRanking() {
    try {
      const result = await api('leaderboard?periodo=semana');
      this.ranking.replaceChildren();
      const heading = document.createElement('strong');
      heading.textContent = 'Ranking semanal';
      this.ranking.append(heading);
      if (result.semana) {
        const period = document.createElement('small');
        const shortDate = (date: string) => date.split('-').reverse().join('/');
        period.textContent = shortDate(result.semana.desde) + ' al ' + shortDate(result.semana.hasta) + ' · Chile';
        this.ranking.append(period);
      }
      const rows = (result.ranking as Array<{name:string;score:number}>).slice(0,5);
      if (rows.length === 0) {
        const empty = document.createElement('small');
        empty.textContent = 'Todavía no hay puntajes publicados';
        this.ranking.append(empty);
      }
      for (const [index, row] of rows.entries()) {
        const line = document.createElement('div');
        const name = document.createElement('span');
        name.textContent = String(index + 1) + '. ' + row.name;
        const score = document.createElement('b');
        score.textContent = String(row.score);
        line.append(name, score);
        this.ranking.append(line);
      }
      const notice = document.createElement('small');
      notice.textContent = 'El primer lugar es provisional hasta revisar los puntajes.';
      this.ranking.append(notice);
    } catch {
      this.ranking.textContent = 'Ranking no disponible';
    }
  }
}
