// Release build of the helper app: one program that needs no Node.js on the user's computer.
// The CLI is bundled into a single CommonJS file and injected into a copy of the Node.js
// binary that runs this script (Node.js single executable application). Run it with
// Node.js 24 LTS on each target system; it writes
//   dist/release/writehand-<darwin|linux|windows>-<arm64|x64>.tar.gz (Windows: .zip)
// containing the program, the license and the licenses of the code bundled into it.
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import postject from 'postject';

import { ADDIN_THIRD_PARTY, addinFilesPlugin } from './addin-files.mjs';

const NODE_MAJOR = 24;
// Node.js looks for this marker to find the injected application.
const SEA_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

const app = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(app, '../..');
const work = join(app, 'dist', 'sea');
const output = join(app, 'dist', 'release');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (Number(process.versions.node.split('.')[0]) !== NODE_MAJOR)
  throw new Error(`Build the release program with Node.js ${NODE_MAJOR} LTS (this is ${process.version}).`);

// Release archives name systems as the helper's HostPlatform.target does.
const os = { darwin: 'darwin', linux: 'linux', win32: 'windows' }[process.platform];
if (os === undefined) throw new Error(`Unsupported build system: ${process.platform}`);
const program = os === 'windows' ? 'writehand.exe' : 'writehand';
const archive = `writehand-${os}-${process.arch}.${os === 'windows' ? 'zip' : 'tar.gz'}`;
const run = (file, args) => execFileSync(file, args, { stdio: 'inherit' });

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
mkdirSync(output, { recursive: true });

// 1. One CommonJS file: a single executable application starts a CommonJS script.
const bundle = join(work, 'writehand.cjs');
const { metafile } = await build({
  // Metafile paths are relative to this folder, whichever folder the script runs from.
  absWorkingDir: root,
  entryPoints: [join(app, 'src', 'cli.ts')],
  outfile: bundle,
  bundle: true,
  platform: 'node',
  target: `node${NODE_MAJOR}`,
  format: 'cjs',
  legalComments: 'none',
  metafile: true,
  logLevel: 'warning',
  // The release program carries the Outlook add-in's task pane (`writehand outlook`).
  plugins: [addinFilesPlugin({ required: true })],
});

// 2. The application blob, injected into a copy of this Node.js binary.
const blob = join(work, 'sea-prep.blob');
const config = join(work, 'sea-config.json');
writeFileSync(
  config,
  JSON.stringify({ main: bundle, output: blob, disableExperimentalSEAWarning: true, useCodeCache: true }),
);
run(process.execPath, ['--experimental-sea-config', config]);
const executable = join(work, program);
copyFileSync(process.execPath, executable);
chmodSync(executable, 0o755);
// macOS arm64 runs only signed programs: drop Node's signature, inject, then sign ad hoc.
if (os === 'darwin') run('codesign', ['--remove-signature', executable]);
await postject.inject(executable, 'NODE_SEA_BLOB', readFileSync(blob), {
  sentinelFuse: SEA_FUSE,
  ...(os === 'darwin' ? { machoSegmentName: 'NODE_SEA' } : {}),
});
if (os === 'darwin') run('codesign', ['--sign', '-', executable]);

const reported = execFileSync(executable, ['version'], { encoding: 'utf8' }).trim();
if (reported !== version) throw new Error(`The program reports version ${reported}, expected ${version}.`);

// 3. Licenses: this project's, and those of Node.js and the npm packages inside the program.
const packages = new Map();
for (const input of Object.keys(metafile.inputs)) {
  const match = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(input);
  if (match) packages.set(resolve(root, match[1]), true);
}
// The Outlook add-in's task pane inside the program bundles its own packages (Vue and others).
for (const directory of JSON.parse(readFileSync(ADDIN_THIRD_PARTY, 'utf8'))) packages.set(directory, true);
const licenseOf = (directory) =>
  readdirSync(directory).find((name) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(name));
const notices = [...packages.keys()].sort().map((directory) => {
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  const file = licenseOf(directory);
  const text = file ? readFileSync(join(directory, file), 'utf8').trim() : `License: ${manifest.license}`;
  return `${manifest.name} ${manifest.version}\n\n${text}`;
});
const nodeLicense = [
  join(dirname(process.execPath), 'LICENSE'),
  join(dirname(process.execPath), '..', 'LICENSE'),
].find(existsSync);
if (nodeLicense === undefined)
  throw new Error('The Node.js license was not found next to this Node.js binary.');
notices.unshift(`Node.js ${process.version}\n\n${readFileSync(nodeLicense, 'utf8').trim()}`);
writeFileSync(join(work, 'THIRD_PARTY_LICENSES.txt'), `${notices.join(`\n\n${'-'.repeat(72)}\n\n`)}\n`);
copyFileSync(join(root, 'LICENSE'), join(work, 'LICENSE'));

// 4. The archive the install scripts download.
const target = join(output, archive);
rmSync(target, { force: true });
const files = [program, 'LICENSE', 'THIRD_PARTY_LICENSES.txt'];
if (os === 'windows') {
  // Windows' own bsdtar writes zip archives; Git's tar earlier on PATH does not.
  run(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), [
    '-a',
    '-cf',
    target,
    '-C',
    work,
    ...files,
  ]);
} else {
  run('tar', ['-czf', target, '-C', work, ...files]);
}
console.log(`${relative(root, target)} (version ${version}, ${packages.size} bundled packages)`);
