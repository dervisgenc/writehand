import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The Outlook add-in's release build (`pnpm addin:build`), which the helper app carries and serves. */
export const ADDIN_DIST = fileURLToPath(new URL('../../outlook-addin/dist', import.meta.url));
/** Written by the add-in's build for these notices; not a page file, so it is not carried. */
export const ADDIN_THIRD_PARTY = join(ADDIN_DIST, 'third-party-packages.json');

function filesUnder(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

/**
 * Resolves `writehand:addin-files` to the add-in's built files as `[path, base64]` pairs.
 * `required`: the release program must contain them; a development build without them can still
 * serve browsers, and `writehand outlook enable` then says that the add-in is missing.
 */
export function addinFilesPlugin({ required }) {
  return {
    name: 'writehand-addin-files',
    setup(build) {
      build.onResolve({ filter: /^writehand:addin-files$/ }, (args) => ({
        path: args.path,
        namespace: 'addin-files',
      }));
      build.onLoad({ filter: /.*/, namespace: 'addin-files' }, () => {
        if (!existsSync(join(ADDIN_DIST, 'manifest.xml'))) {
          if (required) {
            return {
              errors: [
                { text: `The Outlook add-in is not built (${ADDIN_DIST}). Run pnpm addin:build first.` },
              ],
            };
          }
          return {
            contents: 'export default [];',
            loader: 'js',
            warnings: [{ text: 'The Outlook add-in is not built; this helper app cannot serve it.' }],
          };
        }
        const files = filesUnder(ADDIN_DIST)
          .filter((path) => path !== ADDIN_THIRD_PARTY)
          .map((path) => [
            relative(ADDIN_DIST, path).split(sep).join('/'),
            readFileSync(path).toString('base64'),
          ]);
        return {
          contents: `export default ${JSON.stringify(files)};`,
          loader: 'js',
          watchFiles: files.map(([name]) => join(ADDIN_DIST, name)),
        };
      });
    },
  };
}
