# Métricas de uso de Carrera CIAC

## Visitas a la página

El proyecto de Cloudflare Pages `surferciac` está asociado a Cloudflare Web Analytics para el dominio `surferciac.pages.dev`.

En el panel de Cloudflare, entrar a **Web Analytics** y seleccionar **surferciac.pages.dev** para consultar visitas, visitantes y evolución temporal. Los datos comienzan a recolectarse desde que se instala el beacon, no son retroactivos.

## Partidas en Cloudflare D1

Base de producción: `surferciac-db`. La tabla `runs` registra intentos de inicio; una misma persona puede iniciar varias partidas. `scores` contiene los puntajes que fueron guardados al terminar, incluyendo los que todavía no se publican.

**Partidas iniciadas por día (UTC):**

```sql
SELECT
  date(created_at / 1000, 'unixepoch') AS dia_utc,
  COUNT(*) AS partidas_iniciadas,
  SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) AS partidas_con_puntaje_guardado,
  SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) AS sesiones_cerradas,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS sesiones_sin_cierre
FROM runs
GROUP BY dia_utc
ORDER BY dia_utc DESC;
```

**Resumen acumulado:**

```sql
SELECT
  (SELECT COUNT(*) FROM runs) AS partidas_iniciadas,
  (SELECT COUNT(*) FROM runs WHERE status = 'finished') AS partidas_con_puntaje_guardado,
  (SELECT COUNT(*) FROM scores) AS puntajes_guardados,
  (SELECT COUNT(*) FROM scores WHERE published_at IS NOT NULL) AS puntajes_publicados;
```

Estas consultas son de solo lectura. `active` es un estado de base de datos, no indica necesariamente que el jugador siga conectado. Los conteos no equivalen a personas distintas. No se agregan nombres o partidas a través de la analítica.
