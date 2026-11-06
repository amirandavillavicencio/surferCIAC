# Surfer CIAC · Eeshadutta WebGL

Base jugable: proyecto completo [eeshadutta/Subway-Surfers](https://github.com/eeshadutta/Subway-Surfers), commit `3dba9ff4844cf34e3137cdf667a6577243eacf21`. Conserva su WebGL propio, gl-matrix, personajes, persecución, trenes, escenarios, texturas, sonidos, potenciadores, controles y colisiones. No utiliza Three.js.

- `eeshadutta/`: los 55 archivos originales, intactos. El repositorio original **no declara licencia de reutilización**; no se le atribuye MIT. Los permisos de código, imágenes y sonidos no se deducen de su disponibilidad pública.
- `eeshadutta-source.json`: inventario SHA-256, procedencia y referencia del motor anterior.
- `ciac/eeshadutta/`: adaptación móvil y sistema académico separado.
- `scripts/build-eeshadutta.mjs`: copia todos los archivos originales a `dist/` y aplica puntos de conexión verificables en `main.js` y `index.html`.
- `data/`, `functions/`, `migrations/`, `src/worker.js` y `cloudflare.config.ts`: banco de 24 preguntas y servicios CIAC existentes, sin modificaciones.

```sh
npm ci
npm run build
npm test
npm run dev:game
```

Cloudflare Pages: comando `npm run build:pages`, salida `dist`, conservando `DB`, configuración de competencia y API existentes. `npm run build:api` compila el Worker independiente. No se habilita la competencia ni se modifica D1 con este cambio.

Adaptaciones necesarias:

1. Canvas vertical y viewport WebGL con proyección que conserva el campo horizontal original. Se añaden vías originales detrás del inicio para cubrir el suelo expuesto por la pantalla vertical. Cámara y objetos conservan sus posiciones físicas.
2. Gestos táctiles traducidos a los eventos de teclado originales. Audio iniciado por el gesto del usuario, evitando el autoplay bloqueado en iPhone.
3. Franjas y controles CIAC en módulos separados. Carriles físicos a X=-6/0/6; factores 0,72 y 0,55, penalización de tres segundos y validación/puntos en servidor conservados. Se reservan los corredores antes de empezar; no se alteran las fórmulas de colisión.
4. El original termina en Z=-800 y avanza 0,5 unidades por frame. Se conserva ese funcionamiento; cuando quedan preguntas se repite el mismo trazado original, reutilizando sus objetos y buffers. La distancia y el puntaje de carrera se acumulan entre repeticiones. La victoria original se presenta al finalizar el tramo posterior a la última pregunta. No se inventa una progresión de velocidad ni un generador nuevo.
5. Los avisos bloqueantes de derrota/victoria se representan en una pantalla de resultado que permite guardar el ranking y reiniciar. Se reemplaza la caché PWA de la base anterior.

`tests/browser-eeshadutta.py` compara el original en `localhost:8792` con `dist/` en `localhost:8788`, a 390 × 844. Prueba ambos escenarios, movimientos, potenciadores, colisiones y una sesión académica de 24 respuestas con penalización y ranking. La sesión usa el potenciador de vuelo para atravesar encuentros entre preguntas y responde sobre el suelo. `tests/sprint-api.test.mjs` comprueba las 24 preguntas contra D1 local aislada.

Motor anterior recuperable en el commit `5d2683a7cc758c2305e48f90bf55d8cf874b9c5a` y la etiqueta `archive/pre-eeshadutta-engine-5d2683a`. Las bases anteriores y sus pruebas se conservan como referencia; `npm run test:sprint` ejecuta la suite de Saurabh y `npm run test:legacy` la anterior. No intervienen en el juego activo.
