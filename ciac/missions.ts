export const MISSIONS = [
  { label: 'Aciertos seguidos', goal: 3 },
  { label: 'Respuestas correctas', goal: 5 },
  { label: 'Niveles recuperados', goal: 2 },
  { label: 'Metros sin tropiezos', goal: 200 }
] as const;

export class RunMissions {
  correct = 0;
  streak = 0;
  bestStreak = 0;
  private recovered = 0;
  private bestClean = 0;
  private lastStumble = 0;
  private points = 0;

  answer(correct: boolean, totalPoints: number, dangerChange: number) {
    const earned = totalPoints - this.points;
    this.points = totalPoints;
    if (correct) {
      this.correct++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.recovered += Math.max(0, -dangerChange);
    } else {
      this.streak = 0;
    }
    return { earned, shield: this.streak === 3, bonus: this.streak === 5 ? 100 : 0 };
  }

  advance(distance: number, stumbled: boolean) {
    this.bestClean = Math.max(this.bestClean, Math.floor(distance - this.lastStumble));
    if (stumbled) this.lastStumble = distance;
  }

  get progress() {
    return [this.bestStreak, this.correct, this.recovered, this.bestClean];
  }
}
