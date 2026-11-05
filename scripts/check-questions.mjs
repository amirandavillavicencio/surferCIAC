import {readFile} from 'node:fs/promises';
const questions = JSON.parse(await readFile('data/questions.json','utf8'));
const ids = new Set();
for (const q of questions) {
  if (ids.has(q.id)) throw Error('ID repetido: '+q.id);
  ids.add(q.id);
  if (!Array.isArray(q.opciones) || q.opciones.length !== 3) throw Error('Deben ser tres carriles: '+q.id);
  if (!Number.isInteger(q.correcta) || q.correcta < 0 || q.correcta > 2) throw Error('Respuesta inválida: '+q.id);
  if (!['Primer semestre','Segundo semestre'].includes(q.semestre)) throw Error('Semestre inválido: '+q.id);
}
console.log('Preguntas verificadas: '+questions.length);
