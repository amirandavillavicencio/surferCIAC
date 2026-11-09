import questions from '../../../data/questions.json';

// Explicaciones breves, solo visibles después de una respuesta incorrecta validada.
export const EXPLANATIONS = Object.freeze(
  Object.fromEntries(questions.map(q => [q.id, q.explicacion]))
);

export function correctionFor(question) {
  if (!question || !Array.isArray(question.opciones) || !Number.isInteger(question.correcta)) return null;
  const explanation = EXPLANATIONS[question.id];
  const answer = question.opciones[question.correcta];
  if (!explanation || typeof answer !== 'string' || !['A', 'B', 'C'][question.correcta]) return null;
  return { letra: ['A', 'B', 'C'][question.correcta], texto: answer, explicacion: explanation };
}
