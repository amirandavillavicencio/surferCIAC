# Carrera continua: diagnóstico y comprobaciones

Base revisada: `9d8f8df8e10e2c18a00b1cdeb59d2bcd35e7037b`.
Submódulo conservado: `79f9159d97c618bf9741b480872c87e4dab16417`.

## Causas encontradas

`scripts/prepare.mjs` insertaba `clearObstaclesUntil()` y `clearCollectiblesUntil()` en la simulación. `main.tick()` las llamaba antes y después de avanzar cada fotograma. La reserva nacía cuando la pregunta ya estaba a 40 metros. Por tanto, se retiraban objetos que el generador había creado y que la cámara ya mostraba. En los trenes móviles, la limpieza mezclaba el intervalo de encuentro con sus extremos físicos actuales.

`CIACQuiz.tick()` ocultaba las superficies al cruzarlas o esperar la API. También actualizaba sus posiciones antes de avanzar la simulación, con un fotograma de diferencia respecto al escenario. La velocidad saltaba entre multiplicadores al entrar y salir de las franjas.

`PlayerView.play()` podía reiniciar una animación finita ya terminada. La rama de caída no podía ejecutarse mientras el estado seguía siendo `jump`, incluso si el clip había terminado. La cadencia de carrera respondía poco a la reducción de velocidad. Las líneas laterales cambiaban su duración CSS y, con ello, su fase.

## Cambios

- `ciac/course.ts`: reservas deterministas antes de generar la pista, primera línea a 180 m y siguientes cada 150 m. Cada reserva comprende desde 40 m antes hasta 10 m después del cruce. Las franjas conservan sus 36 m. El generador considera todo el recorrido físico de un tren, su longitud y la retirada posterior de cámara. No crea trenes que invadan una reserva, ni sus rampas, ni monedas o potenciadores dentro de ella. La búsqueda original de rutas se ejecuta sobre las especificaciones admitidas.
- `scripts/prepare.mjs`: integra las reservas en `Track`, retira ambas funciones de limpieza y mantiene el reciclaje original. Un imán no comienza a atraer monedas a través de una reserva. La preparación parte siempre del mismo commit del submódulo, de modo que repetirla no conserva parches anteriores. No se publica ningún cambio en el repositorio externo.
- `ciac/pace.ts`: transición de 0,65 s con curva suave al 72 % y de vuelta al 100 %, calculada en los subpasos físicos del motor. La penalización conserva el 55 % durante tres segundos de simulación y tiene prioridad sobre las franjas. La pausa no consume ese tiempo. La recuperación posterior es gradual.
- `ciac/game.ts`: separa la pregunta de la reserva física. Si una respuesta llega demasiado tarde para mostrar la siguiente pregunta a 40 m, se espera la próxima reserva disponible; no se mueve ni se limpia pista construida. Al terminar o fallar la API, se conservan los huecos ya preparados y la generación futura vuelve a ser normal.
- `ciac/answer-track.ts`: tres grupos reutilizables de superficies, dos geometrías compartidas y posiciones calculadas con la distancia actual. Las superficies llegan desde el horizonte y permanecen hasta 14 m detrás del corredor. Sus materiales se preparan durante el calentamiento inicial del renderizador.
- Integración de `PlayerView` y cámara: los clips finitos se reinician solo ante un nuevo evento; caída, carrera y mezcla conservan continuidad. La cadencia se relaciona con la velocidad efectiva. La cámara mantiene seguimiento exponencial independiente de la frecuencia de fotogramas. El audio original continúa tomando la velocidad de la misma simulación.
- `ciac/race-fx.ts` y `.css`: la animación lateral cambia su tasa de reproducción sin cambiar su fase. La inclinación ya no se reinicia al entrar en una pregunta. Se retiraron las partículas añadidas al esquivar trenes.

No se modificaron `ciac/swipe.ts`, las preguntas, sus claves, las funciones de API, los puntajes, las migraciones ni las reglas del ranking.

## Pruebas ejecutadas

`npm test`: diez pruebas de comportamiento y tres pruebas existentes del calendario semanal, todas aprobadas; banco de 24 preguntas verificado.

Las pruebas de comportamiento ejecutan las clases reales de simulación, generador, quiz, controles y Three.js:

- 100 semillas con tutorial y 100 sin tutorial, 4.000 m por mapa: reservas despejadas y búsqueda de ruta satisfactoria. Se generaron 405 trenes móviles y 5.159 trenes estacionados en el conjunto.
- Doce carreras de 2.000 m: seguimiento de identidad y retirada de obstáculos y monedas, sin eliminaciones delante de la cámara salvo recogidas registradas; comprobación de los márgenes antes y después de las líneas.
- Reducción y recuperación con pasos de 1/120, 1/60, 1/30 y 1/20 s; penalización al 55 % durante 360 subpasos de 1/120 s.
- Las 24 preguntas del banco, solicitud única al cruce, respuesta demorada, reinicio con respuesta pendiente y fallo de conexión. El transporte y el DOM se simulan localmente; no se escriben resultados de prueba en D1.
- Gestos cortos en un adaptador de 390 px, cuatro direcciones, reversas rápidas, rechazo de diagonales ambiguas y prevención de eventos duplicados. No son eventos táctiles nativos de Safari.
- Cambios rápidos de carril, salto, aterrizaje, deslizamiento y colisiones con los cinco tipos sólidos probados.
- GLB original cargado sin decodificar sus texturas: `World.sync()` y las matrices de cada pieza y vagón coinciden con la simulación, hasta su retirada. También se comprueba que un clip finito no se reinicie espontáneamente. Esto comprueba geometría y transformaciones, no imágenes renderizadas.

`npm run build:pages`: aprobado, incluyendo `tsc --noEmit`, Vite y la preparación de `core.glb`. `node --check src/worker.js` y `git diff --check`: aprobados.

## Límite de validación

El navegador remoto devolvió `THREE.WebGLRenderer: Error creating WebGL context`, con `GL_RENDERER = Disabled`, al intentar abrir la versión base. No fue posible obtener capturas del juego ni ejecutar los E2E originales que necesitan un navegador con WebGL. No se afirma haber medido FPS ni comprobado el aspecto final en Safari.

Quedan pendientes la revisión visual de una partida completa, audio, FPS y navegación por gestos en un iPhone físico. Las pruebas numéricas y de eventos no sustituyen esa revisión.

Para repetir las comprobaciones desde una copia nueva: descargar el submódulo, ejecutar `npm --prefix upstream ci`, `npm test` y `npm run build:pages`.
