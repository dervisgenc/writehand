// Prints the notes of a release: its CHANGELOG.md section followed by the install commands
// (browsers, then the Outlook applications).
//   node scripts/release-notes.mjs <x.y.z>
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const version = process.argv[2] ?? '';
const changelog = readFileSync(resolve(import.meta.dirname, '../CHANGELOG.md'), 'utf8');
const start = changelog.indexOf(`## [${version}]`);
if (!/^\d+\.\d+\.\d+$/.test(version) || start === -1) {
  console.error(`CHANGELOG.md has no section for "${version}". Run pnpm release:version first.`);
  process.exit(1);
}
const body = changelog.slice(start).split('\n').slice(1);
const end = body.findIndex((line) => line.startsWith('## '));
const download = 'https://github.com/dervisgenc/writehand/releases/latest/download';

console.log(`${body
  .slice(0, end === -1 ? undefined : end)
  .join('\n')
  .trim()}

## Install the helper app

macOS and Linux:

\`\`\`sh
curl -fsSL ${download}/install.sh | sh
\`\`\`

Windows (PowerShell):

\`\`\`powershell
irm ${download}/install.ps1 | iex
\`\`\`

The extension's welcome page shows the same command.

## Outlook applications on Windows (preview)

One PowerShell command installs the helper app together with its Outlook add-in server. Windows asks once to trust a certificate for this computer's local addresses; then Outlook on the web opens, where you add the add-in once from the file the command names.

\`\`\`powershell
irm ${download}/install-outlook.ps1 | iex
\`\`\`

See [Outlook add-in](https://github.com/dervisgenc/writehand/blob/main/docs/OUTLOOK_ADDIN.md) for what it does and how to remove it.

\`SHA256SUMS\` lists every file's checksum and \`SHA256SUMS.sig\` is its Ed25519 signature; the helper app verifies both before it updates itself. Build provenance: \`gh attestation verify <file> --repo dervisgenc/writehand\`.`);
