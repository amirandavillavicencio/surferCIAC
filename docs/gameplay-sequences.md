# Secuencias de carrera

La carrera normal construye secuencias por intervalos académicos de 150 m. Los
encuentros ferroviarios abren con una barrera, ofrecen una sola entrada en rampa
frente a trenes estacionarios, permiten transferirse de techo y terminan con una
barrera en las tres vías. En los encuentros de evasión el tren móvil ocupa el
carril alternativo durante parte de la secuencia. Las barreras intermedias dejan
decidir entre cambiar de vía y ejecutar una maniobra en el carril actual.

La rampa y el primer frente de vagones se generan juntos. La secuencia completa
se comprueba contra la reserva de preguntas. Un intervalo parcial tras el
tutorial conserva la reserva y el tutorial original.

## Medición

Desde el directorio raíz, con el submódulo y sus dependencias instalados:

```sh
npm run prepare:game
upstream/node_modules/.bin/esbuild tests/sequence-benchmark.ts --bundle --platform=node --outfile=/tmp/sequence-benchmark.mjs
node /tmp/sequence-benchmark.mjs
```

Para repetir contra 4c62681, copia solo sequence-benchmark.ts y minimum-effort.ts
al directorio tests de una segunda copia preparada en ese commit. Cada versión
mantiene su propio piloto. Los benchmarks usan semillas 1 a 6, 640 m y las
mismas reglas de simulación y calendario académico.

La búsqueda parte desde los tres carriles, con 300 ms antes de la primera
oportunidad de entrada. Explora izquierda, derecha, salto, deslizamiento y
espera cada 100 ms. Cada candidato ejecuta pasos de Sim a 120 Hz con posición
temporal de trenes y colisiones. Se descartan choques y tropiezos. El estado se
agrupa por posición, fase lateral, salto y deslizamiento. Se guardan hasta 110
estados por paso. El número de acciones de la mejor ruta encontrada es una cota
superior del mínimo continuo. El total de estados finales representa rutas
conservadas por el algoritmo y está limitado por el ancho de búsqueda.

El criterio de regresión considera pasiva una ventana que permite salir sin
mandos o cuya ruta de menor esfuerzo encontrada deja más de seis segundos
entre entradas, incluyendo la lectura y los bordes de la ventana. Una ruta
con cero entradas que sobreviva demuestra una evasión pasiva. El recorte de
estados impide afirmar que toda ruta con menos intervenciones fue descartada.

El piloto continuo y la búsqueda por ventanas se informan por separado.
Suelo y techo cuentan solo la distancia con apoyo efectivo. Aire, rampas y
barreras bajas explican el porcentaje restante. La lectura se cronometra
desde que la pregunta entra en su intervalo de 40 m hasta la línea de respuesta.
La comparación visual se puede reconstruir con browser-sequence-comparison.py,
Chromium y ambas compilaciones servidas por HTTP. El navegador recibe respuestas
locales fijas para reproducir las mismas preguntas en cada ejecución.
