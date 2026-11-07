# Acabado visual sobre f9d4ef0

Se conserva el submódulo original 79f9159d y toda la simulación restaurada. `scripts/visual-finish.mjs` aplica cambios de presentación después de las integraciones existentes.

Trenes: carrocería con esquinas superiores curvas, parabrisas dividido, rejillas, luces, zócalos, ruedas, puertas, ventanas, techo y uniones existentes. La geometría visual permanece dentro del contorno anterior; no se cambian colisiones ni dimensiones funcionales.

Vías: se corrige la superficie verde que ocultaba el balasto, se dibuja grava propia y se refuerzan rieles y durmientes. Ciudad: tres variantes de fachadas, cornisas, ventanas, toldos, jardineras y árboles, agrupadas en tres lotes de instancias. Rampas con superficie metálica y bordes de peligro; barreras con remates. Monedas con canto, aro y relieve. Materiales y costuras del corredor, piel y uniforme del guardia. Luz cálida, relleno más suave, niebla y encuadre ajustados. Panel académico más compacto, sin desenfoque costoso, con los mismos colores y textos; bordes de las franjas más claros.

Todos los recursos añadidos son geometría y texturas procedurales originales de este cambio. No se descargan recursos externos. Se mantienen las atribuciones y licencias de los recursos anteriores, incluido el guardia MIT.

## Verificación

- `npm run build:pages`: compilación TypeScript/Vite, 32 pruebas de comportamiento, 3 de calendario y validación de las 24 preguntas.
- Chromium a 390 × 844, escala 1: capturas comparables de trenes y de una pregunta en la misma posición de pista. La pregunta concreta varía porque la API conserva su selección aleatoria real.
- `tests/browser-visual-finish.mjs`: ejecuta los manejadores reales start/answer/leaderboard contra SQLite local con la migración original y un adaptador de la interfaz D1. No escribe en la base de producción. El controlador existente recorre la pista sin invencibilidad hasta la pregunta. La respuesta se acepta una sola vez, avanza la pregunta y la partida sigue viva. Sin errores de JavaScript ni recorte del panel.
- Los archivos generados main.ts, config.ts, input.ts, sim/sim.ts, sim/track.ts, ciac/game.ts, ciac/course.ts y ciac/pace.ts son idénticos byte por byte a los de la referencia preparada. API, preguntas, D1 y ranking no tienen cambios.

## Rendimiento y límites

La escena de comparación pasa de 105 a 112 llamadas de dibujo; de 34.000 a aproximadamente 56.300 triángulos y de 16 a 14 texturas. Las fachadas comparten geometría y material, sin asignaciones de geometría durante la partida. No se añaden luces, mapas de sombra ni posprocesado.

En este Chromium con renderizado por software, 120 muestras dieron mediana 1,0 → 1,2 ms y p95 38,9 → 49,1 ms. Los picos aumentan: no se afirma ausencia de regresión en todos los dispositivos ni equivalencia con Safari. Hace falta medición en iPhone físico para establecer su rendimiento. Los JSON adjuntos conservan las mediciones y el resultado de la pregunta.

Para repetir: ejecutar `node scripts/prepare.mjs` y `node tests/browser-visual-finish.mjs after`. Se requiere Playwright y Chromium; `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` y `CHROMIUM_ARGS` permiten seleccionar la instalación. `VISUAL_OUTPUT` define el destino de capturas. Para la referencia: `BASELINE_ROOT` debe apuntar a un checkout preparado de f9d4ef0 y el argumento es `before`.
