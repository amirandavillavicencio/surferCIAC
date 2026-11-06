# surferCIAC

Juego académico de primer año de la Universidad Técnica Federico Santa María, desarrollado para integrarse **con el proyecto concreto** [DanielLin0516/SUBWAY-SURFERS](https://github.com/DanielLin0516/SUBWAY-SURFERS) (Three.js + Vite + TypeScript).

## Estado y permisos del código original

El código y los modelos originales del corredor **no tienen licencia de reutilización declarada** (revisado el 5 de noviembre de 2026). Por ese motivo, este repositorio no copia sus archivos. El enlace Git submodule `upstream/` fija el commit `79f9159d97c618bf9741b480872c87e4dab16417`, pero no concede permisos. Antes de construir, modificar o publicar el juego con sus modelos, pide autorización al autor. La documentación de GitHub explica la distinción entre repositorio público y licencia.

Esta rama contiene la integración CIAC propia, no una versión jugable desplegada. No hay una demo falsa ni un motor alternativo.

## Lo que está preparado

- Banco inicial de **24 ejercicios reales** basados en los contenidos del formulario USM adjuntado: MAT070, MAT060, FIS100, MAT071, MAT061 y FIS110.
- Selección de semestre y preguntas en tres carriles durante la carrera, usando las escenas y controles originales.
- Respuesta correcta: suma 100 puntos académicos y desbloquea el siguiente tramo de 150 metros. Respuesta incorrecta: retrasa la carrera 3 segundos sin cerrar la partida ni sumar puntos; luego continúa con la siguiente pregunta.
- Ranking de mejores puntajes, asociado al nombre público elegido por el jugador, con almacenamiento D1.
- Comprobación de respuestas **en servidor** (las claves no se envían al navegador). El puntaje original de distancia/monedas se conserva en el juego, pero el ranking global solo usa los puntos académicos comprobados en servidor.
- Moderación de nombres con `@2toad/profanity` en español e inglés y, opcionalmente, Llama Guard 3 en Cloudflare Workers AI. Los filtros no son infalibles.
- No se solicitan ni guardan RUT, correo o matrícula.

## Competencia semanal: kit de premio

La pantalla de inicio anuncia: **«El ganador de la semana se lleva un kit de premio.»**

El ranking semanal se calcula con los puntajes académicos guardados en Cloudflare D1 desde el **lunes a las 00:00 hasta el domingo a las 23:59 (hora de Santiago de Chile)**. El cálculo del límite semanal contempla los cambios de hora de Chile. La ruta `GET /api/leaderboard?periodo=semana` devuelve los 10 mejores puntajes de la semana; la pantalla muestra los primeros cinco. El ranking histórico sigue disponible en `GET /api/leaderboard`.

Orden: mayor puntaje y, en caso de empate, el puntaje registrado primero. La cabecera del ranking muestra las fechas exactas de la semana. El líder **no es automáticamente declarado ganador**: los puntajes y la identidad de quien recibirá el premio deben revisarse manualmente al terminar la semana. No se ha conectado un sistema de entrega ni de notificación de ganadores. No se almacena identidad real ni datos de contacto.

**Antes de anunciar oficialmente ganadores o entregar kits**, se deben resolver la autenticación de participantes, la prevención de puntajes automatizados y las reglas de igualdad entre modalidades: «Todos» ofrece más preguntas que una partida limitada a un solo semestre y, por ello, se pueden alcanzar puntajes máximos diferentes. También falta acordar cómo se entrega el premio. La publicidad del kit queda visible para anunciar la dinámica, pero por ahora los resultados son provisionales.

Para comprobar el cálculo semanal: `node --test tests/week.test.mjs`.

## Estructura

```
upstream/               Submódulo del proyecto 3D elegido (sin copiar archivos)
ciac/game.ts            Interfaz y lógica del quiz integrada en el motor
ciac/game.css           Extensión de los estilos originales
data/questions.json     Enunciados, tres alternativas y claves, solo en servidor
functions/api/          Inicio, respuesta, cierre de partidas y ranking
migrations/0001_init.sql  Tablas D1
scripts/prepare.mjs     Integración local en la fuente original
scripts/copy-dist.mjs   Copia del resultado de Vite a dist/
```

## Preparación, una vez otorgado el permiso

```bash
git clone --recurse-submodules https://github.com/amirandavillavicencio/surferCIAC.git
cd surferCIAC
npm install
npm --prefix upstream install
UPSTREAM_PERMISSION_GRANTED=1 npm run build
```

El script inserta el módulo educativo en `upstream/src/main.ts` del árbol de trabajo local, sin modificar el historial del submódulo. Si la versión original cambia, los anclajes fallan para que no se modifique un archivo incorrecto. La variable de entorno solo indica que tú has obtenido el permiso; no lo concede.

## Cloudflare Pages + D1

1. Crear una base D1 y aplicar `migrations/0001_init.sql`.
2. Conectar la base al proyecto Pages con nombre de binding **DB**.
3. Opcionalmente, agregar un binding Workers AI con nombre **AI** para el control adicional de nombres.
4. Una vez aclarada la licencia, configurar la compilación con `npm run build`, salida `dist` y la variable `UPSTREAM_PERMISSION_GRANTED=1`. Verificar que el entorno de compilación haya descargado el submódulo `upstream/`.
5. Las rutas `/api/start`, `/api/answer`, `/api/finish` y `/api/leaderboard` son Pages Functions. No funcionan si solo se abre el HTML como archivo local.

**Importante:** el servidor verifica respuestas y calcula puntos, pero un bot todavía podría automatizar peticiones y conseguir puntos sin jugar. Antes de un torneo público o con premios, hace falta protección antibots, control de frecuencia por usuario y una validación de desplazamiento o desafío adicional desde servidor.

Para revisar el banco: `node scripts/check-questions.mjs`. Los 24 ejercicios necesitan aprobación docente antes de ser tratados como evaluación oficial.

## Implementación del Worker `surferciac` (5 de noviembre de 2026)

La cuenta de Cloudflare ya dispone de una base D1 independiente, `surferciac-db`, con el esquema `migrations/0001_init.sql` aplicado. El archivo `cloudflare.config.ts` configura el Worker actual y conecta el binding `DB` a esa base.

El comando `npm run build` construye **solamente el Worker de API** usando `cf build`. Se conservó el proceso de compilación original del juego en `npm run build:game`; su autorización y sus archivos gráficos siguen pendientes. El Worker no presenta otro diseño ni una página ficticia cuando falta el motor 3D.

Rutas preparadas:
- `GET /api/status`: confirma la conexión con D1.
- `GET /api/leaderboard?periodo=semana`: ranking de la semana en horario de Chile.
- `POST /api/start`, `POST /api/answer`, `POST /api/finish`: estructura de la partida académica, deshabilitada temporalmente.

El valor `COMPETITION_LIVE` permanece en `false` porque **todavía no hay un juego público conectado y el ranking premiado carece de protección suficiente contra partidas automatizadas**. No cambiarlo a `true` sin implementar controles antifraude y verificar el juego. No se han registrado nombres o puntajes ficticios.

La integración de Cloudflare Workers Builds usa `npm run build` y `npx cf deploy --prebuilt`. El Worker y el código del juego se mantienen separados mientras se resuelve el permiso de distribución del motor.

## Dirección independiente de Pages

El proyecto Cloudflare Pages `surferciac` está conectado al repositorio `surferCIAC` (rama `main`), con subdominio `https://surferciac.pages.dev`. La publicación de Pages usa `npm run build:pages`, y mantiene el mismo binding D1 `DB` a `surferciac-db`.

El motor 3D todavía no forma parte de la compilación para Pages. La respuesta en la raíz es una página 404 descriptiva hasta completar el juego original. Las rutas `/api/status` y `/api/leaderboard?periodo=semana` sí permiten comprobar los servicios. Las rutas que crean y cierran partidas se mantienen desactivadas con `COMPETITION_LIVE=false`.

El antiguo acceso público del Worker `surferciac` bajo `gestionmonumentoscde.workers.dev` quedó deshabilitado. La configuración de Workers mantiene `workersDev: false` para impedir que nuevos despliegues reactiven esa dirección. Los demás Workers y el subdominio general de la cuenta no se modificaron.

## Publicación del motor 3D (solicitada por el titular del despliegue)

El comando `npm run build:pages` ahora descarga las dependencias del submódulo original, integra el módulo académico en `upstream/src/main.ts`, compila el juego real con Vite/TypeScript y copia `index.html`, JavaScript, CSS, `core.glb` y `scenery.glb` a `dist/`. Cloudflare Pages publica `dist/` en `https://surferciac.pages.dev/`. No se ha creado otro motor ni se han sustituido los modelos.

El bloqueo artificial que detenía `scripts/prepare.mjs` fue retirado a petición del usuario. **La ausencia de licencia del repositorio original sigue siendo una cuestión de derechos de autor, y poder compilarlo no acredita permiso de redistribución.** El submódulo permanece fijado al commit original. El ranking con premio necesita revisión humana de posibles puntajes automatizados.

El servicio `surferciac` de Cloudflare Workers independiente del proyecto Pages no tiene activa su dirección pública `workers.dev`; el dominio para entrar al juego es `surferciac.pages.dev`.

## Penalización por respuestas incorrectas

Una respuesta incorrecta **no mata al personaje ni cierra la sesión**. La carrera se detiene durante **3 segundos de tiempo de juego**; el tiempo de pausa no reduce la penalización. Se muestra una cuenta regresiva. Después el corredor continúa y la siguiente pregunta aparece tras otros 150 metros. La API `/api/answer` informa `penaltySeconds: 3` al fallar y `0` al acertar. Solo los aciertos agregan 100 puntos; los choques normales con obstáculos siguen funcionando como antes.

## Preguntas compactas integradas en los carriles

La carrera continúa mientras aparece una pregunta breve sobre la vía. Las alternativas se ven en un panel compacto y en tres marcadores 3D asociados a los carriles. El jugador responde automáticamente cuando atraviesa el marcador con su carril; ya no se exige tocar un botón ni saltar para confirmar. La primera puerta aparece a 180 m y las siguientes cada 150 m; en torno al cruce se limpia una franja de obstáculos del generador, para que el marcador no quede bloqueado. El resto de las colisiones normales sigue activo.

Los enunciados académicos originales, las alternativas, las claves y la validación en servidor permanecen intactos. Para la interfaz se agregó la propiedad `breve`, una versión acotada de cada uno de los 24 enunciados. Las respuestas correctas siguen sumando 100 puntos. Las equivocadas reducen la velocidad al 55 % de la normal durante 3 segundos, sin congelar la carrera.

## Textos del juego en español

Los textos originales del motor se traducen mediante `ciac/i18n.ts`, que el paso de preparación incorpora al compilado. El título visible es `Surfer CIAC`, el botón principal dice `Jugar` y el resto de los controles, marcadores y avisos se presenta en español. Se mantiene el motor, los modelos 3D, los controles y el registro de mejores puntajes originales.

## Indicadores legibles en la aproximación

Los tres carteles 3D conservan la correspondencia A/B/C con cada carril. Ahora tienen fondo oscuro casi opaco, contorno blanco, letra y alternativa ampliadas. El carril que ocupa el jugador aparece con borde dorado y una franja dorada sobre la vía, sin adelantar la respuesta correcta. Cuando faltan menos de 45 metros, el panel superior aumenta el tamaño de las opciones y muestra la distancia hasta el cruce. En los últimos 8 metros, los carteles se mantienen a una distancia mínima de cámara para que no desaparezcan detrás del personaje. La respuesta sigue siendo automática al cruzar y el juego no se pausa.

## Modo pregunta a pantalla completa

Al acercarse a una pregunta, la carrera entra en modo pregunta: se detiene la simulación y aparece un panel que ocupa toda la pantalla del teléfono con el enunciado y tres alternativas táctiles grandes. Se elige tocando una alternativa o con flechas y confirmación. Las respuestas se validan en servidor, se muestra brevemente el resultado y se reanuda la carrera, manteniendo la penalización de velocidad de 3 segundos por error. Durante la pregunta no avanzan ni se generan obstáculos; se retiran los objetos del tramo que rodea al corredor y se mantiene un corredor seguro de 130 metros al reanudar. No se cambian las preguntas, claves, modelos 3D ni el ranking.

## Preguntas por carriles con franjas de color (noviembre 2026)

Se recupera la carrera continua: las preguntas de primer año aparecen en una tarjeta horizontal en la parte superior del juego, sin detener la simulación. Las tres opciones se muestran de izquierda a derecha con los mismos colores de los tres carriles: **A azul (izquierda), B verde (centro), C morado (derecha)**. El carril en el que se encuentra el jugador se resalta con un borde blanco, sin adelantar si es correcto.

Cuando el corredor se acerca a los últimos **36 metros** de una pregunta, se ven tres superficies coloreadas en el mundo Three.js, una por carril, alineadas con los valores del panel. Una marca final representa la línea de validación: la API recibe el número de carril que atraviesa el corredor, sin toque adicional. Los modelos originales permanecen intactos.

La pregunta aparece al estar a 40 metros de la zona de respuesta. Desde ese punto hasta 10 metros después del cruce se eliminan los obstáculos del tramo, incluyendo trenes móviles. Si la API tarda en responder, la zona segura sigue avanzando. El resto de la carrera mantiene los obstáculos originales. Una respuesta incorrecta reduce la velocidad durante tres segundos; la respuesta correcta suma 100 puntos. No cambian las preguntas, claves ni el ranking.

## Ajuste de visibilidad del tramo de respuestas

La pregunta aparece cuando faltan **40 metros** para cruzar la línea de respuesta, y cada carril muestra su color durante los **últimos 36 metros** del tramo. De este modo, al aparecer la pregunta los colores comienzan a solo 4 metros por delante del corredor. Se mantiene la correspondencia A azul, B verde y C morado, la validación por carril y el tramo sin obstáculos.

## Trenes móviles y sensación de velocidad

Se hace más frecuente la aparición de trenes móviles del motor original desde los tramos posteriores al tutorial, ajustando su ponderación a `0.17 + 0.10 × nivel`. Se conserva el generador que comprueba rutas esquivables. Los trenes empiezan a acercarse desde 85 metros, con un factor de movimiento 0,70; mantienen las bocinas y el ruido originales. La cámara amplía levemente el campo visual a mayor velocidad. Aparecen líneas de desplazamiento tenues en los bordes, inclinación breve al cambiar de carril y partículas con aviso al esquivar un tren. Estos efectos son decorativos: no cambian las preguntas, el puntaje ni el ranking. Se ocultan durante las preguntas y pausas, y las líneas respetan la preferencia de movimiento reducido. Las zonas de respuesta siguen libres de obstáculos.

## Carrera y respuestas (versión actual)

Los trenes circulan exclusivamente por los **tres carriles jugables**; se retiraron los trenes ambientales y las vías externas añadidas en la versión anterior. Las preguntas aparecen cuando faltan **40 metros** para la línea de respuesta, y las superficies de colores ocupan los últimos **36 metros**. Al entrar en esa zona de color, la velocidad baja al **72 %** de la normal para dar tiempo a escoger el carril; vuelve a la velocidad normal al cruzar, salvo la penalización original de 3 segundos por respuesta incorrecta (55 %).

Durante una pregunta, los tres carriles quedan sin obstáculos, monedas ni potenciadores; los obstáculos normales regresan después de un margen seguro de **10 metros**. Se conservan los trenes móviles del motor original en las vías jugables durante la carrera normal, su sonido y los efectos de velocidad. La API de respuestas, preguntas, puntajes y ranking no cambia.

## Renderizado del tren y personaje (noviembre 2026)

Se dibujan vagones individuales con margen de salida por detrás de la cámara, uniones visibles entre ellos y un material más legible que conserva la textura original de `core.glb`. El personaje conserva su esqueleto y clips originales, pero recibe una sombra de contacto que acompaña el salto, un acabado de material ligeramente ajustado y cambios de cadencia de carrera progresivos. Se mantienen los tres carriles, las preguntas, las colisiones, el ranking y el submódulo de origen. Los nuevos objetos 3D se crean una sola vez, al cargar la escena.
