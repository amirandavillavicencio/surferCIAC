# surferCIAC

Juego académico de primer año de la Universidad Técnica Federico Santa María, desarrollado para integrarse **con el proyecto concreto** [DanielLin0516/SUBWAY-SURFERS](https://github.com/DanielLin0516/SUBWAY-SURFERS) (Three.js + Vite + TypeScript).

## Estado y permisos del código original

El código y los modelos originales del corredor **no tienen licencia de reutilización declarada** (revisado el 5 de noviembre de 2026). Por ese motivo, este repositorio no copia sus archivos. El enlace Git submodule `upstream/` fija el commit `79f9159d97c618bf9741b480872c87e4dab16417`, pero no concede permisos. Antes de construir, modificar o publicar el juego con sus modelos, pide autorización al autor. La documentación de GitHub explica la distinción entre repositorio público y licencia.

Esta rama contiene la integración CIAC propia, no una versión jugable desplegada. No hay una demo falsa ni un motor alternativo.

## Lo que está preparado

- Banco inicial de **24 ejercicios reales** basados en los contenidos del formulario USM adjuntado: MAT070, MAT060, FIS100, MAT071, MAT061 y FIS110.
- Selección de semestre y preguntas en tres carriles durante la carrera, usando las escenas y controles originales.
- Respuesta correcta: suma 100 puntos académicos y desbloquea el siguiente tramo de 150 metros. Respuesta incorrecta: termina la carrera.
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
