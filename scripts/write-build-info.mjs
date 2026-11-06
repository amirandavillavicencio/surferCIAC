import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const html=await readFile('dist/index.html','utf8');
const entry=html.match(/"js":\["([^"]+\.js)"/)?.[1];
if(!entry)throw Error('Missing game entrypoint');
const bytes=await readFile('dist/'+entry.replace(/^\//,''));
await writeFile('dist/build.json',JSON.stringify({commit,entry,sha256:createHash('sha256').update(bytes).digest('hex')})+'\n');
