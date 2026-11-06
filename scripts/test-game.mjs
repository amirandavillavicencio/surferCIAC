import { build } from '../upstream/node_modules/esbuild/lib/main.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

execFileSync(process.execPath, ['scripts/prepare.mjs'], {stdio:'inherit'});
const directory = await mkdtemp(join(tmpdir(), 'surfer-ciac-'));
try {
  const outfile = join(directory, 'behavior.mjs');
  await build({stdin:{contents:"import './tests/behavior.ts'; import './tests/polish.ts';",resolveDir:process.cwd(),sourcefile:'game-tests.ts'}, outfile, bundle:true, platform:'node',
    format:'esm', mainFields:['module','main'], loader:{'.css':'empty'}, logLevel:'warning'});
  execFileSync(process.execPath, ['--test', outfile], {stdio:'inherit'});
} finally {
  await rm(directory, {recursive:true, force:true});
}
