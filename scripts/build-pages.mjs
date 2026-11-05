import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
// El sitio no incorpora gráficos ni archivos del motor 3D sin autorización.
await writeFile('dist/404.html', '<!doctype html><html lang="es"><meta charset="utf-8"><title>surferCIAC</title><p>El juego 3D todavía no está publicado.</p></html>\n');
