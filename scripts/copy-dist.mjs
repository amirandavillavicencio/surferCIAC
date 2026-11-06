import {rm,cp} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await cp('upstream/dist','dist',{recursive:true});

await import("./write-build-info.mjs");
