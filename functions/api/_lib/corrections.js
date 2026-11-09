// Explicaciones breves, solo visibles después de una respuesta incorrecta validada.
export const EXPLANATIONS = Object.freeze({
  "q01": "Es una identidad trigonométrica: sen²x + cos²x = 1 para cualquier x real.",
  "q02": "La derivada mide la tasa de cambio de una función en un instante.",
  "q03": "Si la derivada es positiva en un intervalo, la función crece allí.",
  "q04": "Un límite indica el valor al que se aproxima una función al acercarse a un punto.",
  "q05": "La negación cambia verdadero por falso y falso por verdadero.",
  "q06": "La notación Σ representa la suma de los términos indicados.",
  "q07": "En a + bi, b es la parte imaginaria y a es la parte real.",
  "q08": "La pendiente es el cambio vertical dividido por el horizontal (Δy/Δx).",
  "q09": "Un vector tiene módulo y dirección; un escalar solo tiene magnitud.",
  "q10": "La aceleración mide cuánto cambia la velocidad por unidad de tiempo.",
  "q11": "En movimiento rectilíneo uniforme, la velocidad se mantiene constante.",
  "q12": "El producto punto incluye cos 90°, que vale 0.",
  "q13": "Una integral definida suma aportes con signo dentro de un intervalo.",
  "q14": "La derivada de una constante es 0, por eso las primitivas incluyen +C.",
  "q15": "La tasa media es Δy/Δx: compara ambos cambios.",
  "q16": "El teorema fundamental relaciona derivación e integración.",
  "q17": "Una matriz ordena elementos en filas horizontales y columnas verticales.",
  "q18": "Si el determinante de una matriz cuadrada es 0, no tiene inversa.",
  "q19": "El núcleo reúne los vectores que se transforman en el vector cero.",
  "q20": "Un autovector v cumple Av = λv: se multiplica por su autovalor.",
  "q21": "La energía cinética es ½mv²: depende de la masa y de la rapidez.",
  "q22": "Por la segunda ley de Newton, la fuerza neta produce aceleración (F = ma).",
  "q23": "El impulso equivale al cambio de momento lineal (J = Δp).",
  "q24": "Por la ley de Hooke, la fuerza depende de cuánto se deforma el resorte (F = −kx)."
});

export function correctionFor(question) {
  if (!question || !Array.isArray(question.opciones) || !Number.isInteger(question.correcta)) return null;
  const explanation = EXPLANATIONS[question.id];
  const answer = question.opciones[question.correcta];
  if (!explanation || typeof answer !== 'string' || !['A', 'B', 'C'][question.correcta]) return null;
  return { letra: ['A', 'B', 'C'][question.correcta], texto: answer, explicacion: explanation };
}
