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
