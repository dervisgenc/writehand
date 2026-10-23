import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

import { version } from '../../package.json';
import { DEV_ORIGIN, DEV_PORT, productionOrigin } from './build/addin-config';
import { addinPlugin } from './build/vite-plugin-addin';

/** The localhost certificate `pnpm addin:certs` creates with office-addin-dev-certs. */
function devCertificate() {
  const directory = join(homedir(), '.office-addin-dev-certs');
  const cert = join(directory, 'localhost.crt');
  const key = join(directory, 'localhost.key');
  return existsSync(cert) && existsSync(key)
    ? { cert: readFileSync(cert), key: readFileSync(key) }
    : undefined;
}

/**
 * The task pane: `taskpane.html` (the pane) and `commands.html` (the manifest's function file).
 * - `vite` (`pnpm addin:dev`): development server on https://localhost:3000 with hot reload.
 * - `vite build --mode localhost` (`pnpm addin:build:local`): a production build for
 *   https://localhost:3000 in `dist-local/`, served by `pnpm addin:serve`, for real clients.
 * - `vite build` (`pnpm addin:build`): the release build in `dist/`; `manifest.xml` is written
 *   only when `WRITEHAND_ADDIN_ORIGIN` names the hosting origin.
 */
export default defineConfig(({ command, mode }) => {
  // `localhost-sample`: the same with local sample providers, for real clients without an AI account.
  const local = mode === 'localhost' || mode === 'localhost-sample';
  const origin =
    command === 'serve' || local ? DEV_ORIGIN : productionOrigin(process.env.WRITEHAND_ADDIN_ORIGIN);
  const https = devCertificate();
  return {
    // Relative asset paths: the pages work at the origin's root and under a path (the tests).
    base: './',
    plugins: [vue(), addinPlugin({ origin, version })],
    build: {
      outDir: local ? 'dist-local' : 'dist',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: { input: { taskpane: 'taskpane.html', commands: 'commands.html' } },
    },
    server: { port: DEV_PORT, strictPort: true, https },
    preview: { port: DEV_PORT, strictPort: true, https },
  };
});
