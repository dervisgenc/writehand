import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

import { addinFilesPlugin } from './addin-files.mjs';

// Development build: the whole helper app as one script for Node.js (`pnpm ai:install` runs it).
// The release build (scripts/build-sea.mjs) packs the same entry point into a single program.
await build({
  entryPoints: { cli: fileURLToPath(new URL('../src/cli.ts', import.meta.url)) },
  outdir: fileURLToPath(new URL('../dist', import.meta.url)),
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  // The Outlook add-in's task pane, served by `writehand outlook serve`.
  plugins: [addinFilesPlugin({ required: false })],
  // CommonJS dependencies (the file lock) need native Node require in the ESM bundle.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
