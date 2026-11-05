import { access, cp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Usa los archivos 3D originales del submódulo fijado en .gitmodules.
await Promise.all([
  access('upstream/src/main.ts'),
  access('upstream/public/assets/core.glb'),
  access('upstream/public/assets/scenery.glb'),
  access('upstream/package-lock.json')
]);

const run = (command, args) => execFileSync(command, args, {
  stdio: 'inherit',
  env: process.env
});

run('node', ['scripts/prepare.mjs']);
run('npm', ['--prefix', 'upstream', 'ci']);
run('npm', ['--prefix', 'upstream', 'run', 'build']);
await rm('dist', { recursive: true, force: true });
await cp('upstream/dist', 'dist', { recursive: true });
await Promise.all([
  access('dist/index.html'),
  access('dist/assets/core.glb'),
  access('dist/assets/scenery.glb')
]);
console.log('surferCIAC: juego Three.js, core.glb y scenery.glb preparados para Cloudflare Pages.');
