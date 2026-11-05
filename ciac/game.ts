import './game.css';

type Question = { id: string; curso: string; tema: string; enunciado: string; opciones: string[] };
type LaneAction = 'left' | 'right' | 'up' | 'down' | 'pause' | 'confirm' | string;
type Phase = 'idle' | 'ready' | 'question' | 'submitting' | 'complete' | 'ended';
interface Hooks { fail(): void; lane(index: number): void; notice(message: string): void }

async function api(path: string, body?: object): Promise<any> {
  const response = await fetch('/api/' + path, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  } : { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error de conexión');
  return data;
}

export class CIACQuiz {
  private phase: Phase = 'idle';
  private runSerial = 0;
  private hooks: Hooks;
  private token = '';
  private question: Question | null = null;
  private selected = 1;
  private nextDistance = 75;
  private dialog: HTMLDivElement;
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
    const lanes = document.createElement('div');
    lanes.className = 'ciac-lanes';
    for (let i = 0; i < 3; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ghost ciac-lane';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        void this.answer(i);
      });
      button.addEventListener('pointerdown', (event) => event.stopPropagation());
      this.choices.push(button);
      lanes.append(button);
    }
    this.dialog.append(this.title, lanes, this.message);
    document.getElementById('ui')!.append(this.dialog);

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
    this.playerName.autocomplete = 'nickname';
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
    overPanel.append(this.resultForm);
  }

  get active() { return this.phase === 'question' || this.phase === 'submitting'; }

  reset() {
    this.runSerial++;
    this.phase = 'idle';
    this.question = null;
    this.token = '';
    this.dialog.hidden = true;
    this.resultForm.hidden = true;
    this.formStatus.textContent = '';
    this.playerName.disabled = false;
    this.playerName.value = '';
    const saveButton = this.resultForm.querySelector<HTMLButtonElement>('button[type=submit]')!;
    saveButton.disabled = false;
    saveButton.hidden = false;
    this.nextDistance = 75;
    void this.refreshRanking();
  }

  async start() {
    const serial = this.runSerial;
    this.phase = 'idle';
    try {
      const response = await api('start', { semestre: this.select.value });
      if (serial !== this.runSerial) return;
      this.token = response.token;
      if (this.phase === 'ended') { this.resultForm.hidden = false; return; }
      this.question = response.question;
      this.phase = this.question ? 'ready' : 'complete';
    } catch (error) {
      if (serial !== this.runSerial) return;
      this.hooks.notice('Preguntas no disponibles: ' + String(error instanceof Error ? error.message : error));
    }
  }

  tick(distance: number) {
    if (this.phase !== 'ready' || !this.question || distance < this.nextDistance) return;
    this.phase = 'question';
    this.selected = 1;
    this.hooks.lane(this.selected);
    this.title.textContent = this.question.curso + ' · ' + this.question.enunciado;
    this.message.textContent = 'Desliza para elegir carril y pulsa salto para responder. También puedes tocar una respuesta.';
    for (let i = 0; i < 3; i++) this.choices[i].textContent = String.fromCharCode(65 + i) + ' · ' + this.question.opciones[i];
    this.highlight();
    this.dialog.hidden = false;
  }

  handleAction(action: LaneAction) {
    if (!this.active || action === 'pause') return false;
    if (this.phase === 'submitting') return true;
    if (action === 'left') this.selected = Math.max(0, this.selected - 1);
    if (action === 'right') this.selected = Math.min(2, this.selected + 1);
    if (action === 'left' || action === 'right') {
      this.hooks.lane(this.selected);
      this.highlight();
    } else if (action === 'up' || action === 'confirm') {
      void this.answer(this.selected);
    }
    return true;
  }

  private highlight() {
    for (let i = 0; i < 3; i++) this.choices[i].classList.toggle('selected', i === this.selected);
  }

  private async answer(lane: number) {
    if (this.phase !== 'question' || !this.question) return;
    this.phase = 'submitting';
    this.selected = lane;
    this.hooks.lane(lane);
    this.highlight();
    this.message.textContent = 'Comprobando respuesta…';
    try {
      const response = await api('answer', { token: this.token, lane });
      this.dialog.hidden = true;
      if (!response.correct) {
        this.phase = 'ended';
        this.hooks.notice('Respuesta incorrecta. Termina la partida.');
        this.hooks.fail();
        return;
      }
      this.hooks.notice('Correcto · ' + response.points + ' puntos académicos');
      this.question = response.question;
      if (!this.question) {
        this.phase = 'complete';
        this.hooks.notice('Respondiste todas las preguntas. Sigue corriendo.');
      } else {
        this.phase = 'ready';
        this.nextDistance += 150;
      }
    } catch (error) {
      this.message.textContent = String(error instanceof Error ? error.message : error);
      this.phase = 'question';
    }
  }

  endRun() {
    this.phase = 'ended';
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
