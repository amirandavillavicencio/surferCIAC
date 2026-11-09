import questions from '../../../data/questions.json';

export const SEMESTRES = ['Primer semestre', 'Segundo semestre', 'Todos'];
export function bank(semestre) {
  return semestre === 'Todos' ? questions : questions.filter(q => q.semestre === semestre);
}
// La cantidad de preguntas por partida no aumenta al crecer el banco.
export function questionLimit(semestre) {
  return semestre === 'Todos' ? 24 : 12;
}
export function questionFor(semestre, asked, offset) {
  const list = bank(semestre);
  if (asked < 0 || asked >= questionLimit(semestre)) return null;
  return list[(offset + asked) % list.length];
}
export function publicQuestion(q) {
  if (!q) return null;
  return { id: q.id, curso: q.curso, tema: q.tema, enunciado: q.enunciado, breve: q.breve, opciones: q.opciones };
}
export function json(body, status=200) {
  return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export async function bodyOf(request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw Error('Se requiere JSON');
  return request.json();
}
