// Calendario de la competencia: lunes a domingo en la zona horaria de Chile.
// Se calculan ambos límites de cada semana de forma independiente para respetar
// los cambios de hora de verano/invierno (una semana puede durar 167 o 169 h).
const DAY = 86400000;
const TIMEZONE = 'America/Santiago';
const dtf = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
});

function chileParts(time) {
  return Object.fromEntries(
    dtf.formatToParts(new Date(time))
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)])
  );
}

function localMidnight(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const target = Date.UTC(year, month - 1, day);
  let guess = target + 3 * 3600000;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = chileParts(guess);
    const observed = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const adjustment = target - observed;
    guess += adjustment;
    if (adjustment === 0) break;
  }
  return guess;
}

export function currentChileWeek(now = Date.now()) {
  const parts = chileParts(now);
  const localDate = Date.UTC(parts.year, parts.month - 1, parts.day);
  const weekday = new Date(localDate).getUTCDay(); // 0 = domingo
  const monday = new Date(localDate - ((weekday + 6) % 7) * DAY);
  const nextMonday = new Date(monday.getTime() + 7 * DAY);
  const sunday = new Date(nextMonday.getTime() - DAY);
  return {
    desde: monday.toISOString().slice(0, 10),
    hasta: sunday.toISOString().slice(0, 10),
    inicio: localMidnight(monday),
    finExclusivo: localMidnight(nextMonday),
    zonaHoraria: TIMEZONE,
  };
}
