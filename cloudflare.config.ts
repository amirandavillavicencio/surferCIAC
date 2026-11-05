import { bindings, defineConfig } from 'cf/config';

export default defineConfig({
  worker: {
    name: 'surferciac',
    entrypoint: './src/worker.js',
    compatibilityDate: '2026-11-05',
    workersDev: false,
    previewUrls: false,
    env: {
      DB: bindings.d1({
        id: '9182b28f-7173-422e-8a32-ec08809bfde8',
        name: 'surferciac-db'
      }),
      COMPETITION_LIVE: bindings.text('false')
    }
  }
});
