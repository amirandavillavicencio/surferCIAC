# Surfer CIAC

Saurabh’s Sprint completo como base jugable, con el sistema académico CIAC integrado. Fuente MIT fijada en `835b8404fd3bd96afea08e91d0f4fd03e627dd1e` de [Saurabh2005695/Saurabh-s-Sprint-](https://github.com/Saurabh2005695/Saurabh-s-Sprint-).

- `sprint/`: los 66 archivos originales, sin modificaciones, incluidos recursos, biblioteca Three.js r128, juego autónomo, herramientas y referencia Unity. Licencia en `sprint/LICENSE`.
- `sprint-source.json`: inventario con hashes SHA-256 y referencia de procedencia.
- `ciac/sprint/`: adaptación localizada del sistema académico existente: 24 preguntas, semestre, franjas, selección física del carril, factores 0,72/0,55, penalización de tres segundos y ranking.
- `scripts/build-pages.mjs`: copia el proyecto original a `dist/` e incorpora ocho puntos de conexión académica en `js/main.js`. El resto del motor original permanece idéntico. Adapta el service worker para no almacenar respuestas de la API.
- `data/`, `functions/api/`, `migrations/` y `cloudflare.config.ts`: servicios académicos y D1 existentes, sin cambios.

```sh
npm ci
npm run build
npm test
npm run dev:game
```

Cloudflare Pages: comando `npm run build:pages`, salida `dist`. Conserva el binding D1 `DB`, la configuración de competencia y los servicios existentes. `npm run build:api` conserva la compilación independiente del Worker de API.

`tests/browser-sprint.py` compara el original servido en `localhost:8791` con `dist/` en `localhost:8788`, a 390 × 844. Comprueba personajes, tablas, menús, movimientos, trenes, persecución, potenciadores, controles, preguntas, penalización y reanimación. `tests/sprint-api.test.mjs` prueba los servicios contra D1 local aislada.

El motor CIAC anterior permanece recuperable mediante la etiqueta `archive/pre-sprint-engine-d3f1a2d` y el commit `d3f1a2d1d1bce990f7c293efce274e660b88dce9`. Sus fuentes y pruebas se conservan; `npm run test:legacy` ejecuta su suite histórica. El submódulo `upstream/` y los antiguos scripts de preparación no intervienen en el juego publicado.

El puntaje de distancia y monedas original se conserva en el juego. El ranking CIAC usa exclusivamente puntos académicos validados por el servidor. El banco actual contiene 24 preguntas; la siguiente pregunta la proporciona la API y la integración no fija ese límite en el recorrido.
