// Traducción española propia del proyecto CIAC. El motor 3D original se conserva.
export type Lang = 'es';
export type Key = keyof typeof S;

const S = {
  title: 'Carrera CIAC',
  tagline: 'Esquiva los trenes y sigue avanzando.',
  play: 'Jugar',
  best: 'Mejor puntaje',
  coinsTotal: 'Monedas',
  ctrlKeys: '← → o A/D: cambiar carril · ↑ / W / Espacio: saltar · ↓ / S: deslizarse · Esc: pausar',
  ctrlTouch: 'Desliza a los lados para cambiar carril · arriba para saltar · abajo para deslizarte',
  tapToStart: 'Toca para comenzar',
  paused: 'Pausa',
  resume: 'Continuar',
  restart: 'Reiniciar',
  home: 'Inicio',
  over: '¡Te atraparon!',
  score: 'Puntaje',
  coins: 'Monedas',
  distance: 'Distancia',
  newBest: '¡Nuevo récord!',
  again: 'Volver a jugar',
  preparing: 'Preparando…',
  loading: 'Cargando',
  loadFail: 'No se pudo cargar. Actualiza la página.',
  hintJumpKeys: 'Pulsa ↑ para saltar',
  hintJumpTouch: 'Desliza hacia arriba para saltar',
  hintSlideKeys: 'Pulsa ↓ para deslizarte',
  hintSlideTouch: 'Desliza hacia abajo para deslizarte',
  hintLaneKeys: 'Pulsa ← → para cambiar carril',
  hintLaneTouch: 'Desliza a los lados para cambiar carril',
  hintRamp: 'Sube la rampa para llegar al techo del tren',
  magnet: 'Imán',
  shoes: 'Zapatillas de salto',
  double: 'Puntaje doble',
  careful: '¡Cuidado! Otro golpe y te atrapan',
  mute: 'Silenciar',
  sound: 'Sonido',
  mult: 'Multiplicador',
  meters: 'm',
  lang: 'Idioma'
} as const;

export function detectLang(): Lang { return 'es'; }
export const getLang = (): Lang => 'es';
export function setLang(_lang: Lang) { document.documentElement.lang = 'es'; }
export const t = (key: Key): string => S[key];
export const LANGS: Lang[] = ['es'];
export const LANG_LABEL: Record<Lang, string> = { es: 'ES' };
