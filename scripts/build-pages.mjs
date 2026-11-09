import { access, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Usa los archivos 3D originales del submódulo fijado en .gitmodules.
await Promise.all([
  access('upstream/src/main.ts'),
  access('upstream/public/assets/core.glb'),
  access('upstream/package-lock.json')
]);

const run = (command, args) => execFileSync(command, args, {
  stdio: 'inherit',
  env: process.env
});

run('node', ['scripts/prepare.mjs']);

// El lockfile fijado del submódulo contiene URLs del espejo npmmirror,
// que a veces responde HTTP 500. Conservar versiones e integridades, y
// descargar los mismos paquetes desde el registro oficial de npm.
const lockPath = 'upstream/package-lock.json';
const lock = await readFile(lockPath, 'utf8');
const officialRegistryLock = lock.replaceAll(
  'https://registry.npmmirror.com/',
  'https://registry.npmjs.org/'
);
if (officialRegistryLock !== lock) await writeFile(lockPath, officialRegistryLock);

run('npm', ['--prefix', 'upstream', 'ci', '--registry=https://registry.npmjs.org/']);
run('npm', ['--prefix', 'upstream', 'run', 'build']);
// Ejecutar las pruebas de simulación, animaciones y ranking antes de publicar.
run('npm', ['test']);
await rm('dist', { recursive: true, force: true });
await cp('upstream/dist', 'dist', { recursive: true });
await rm('dist/assets/scenery.glb', { force: true });
await Promise.all([access('dist/index.html'), access('dist/assets/core.glb')]);
console.log('surferCIAC: juego Three.js, core.glb preparados para Cloudflare Pages.');

await import("./write-build-info.mjs");
