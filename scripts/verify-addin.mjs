// Checks the Outlook add-in's production build (apps/outlook-addin/dist): the pages' Content
// Security Policy, Office.js as the only remote script, no development code or local addresses,
// and, when a manifest was written (WRITEHAND_ADDIN_ORIGIN), its identity, version, addresses
// and permissions. Run after `pnpm build`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'apps/outlook-addin/dist');

// Must match apps/outlook-addin/build/addin-config.ts.
const OFFICE_JS_URL = 'https://officeapis.public.onecdn.static.microsoft/1/office.js';
const OFFICE_JS_ORIGIN = 'https://officeapis.public.onecdn.static.microsoft';
const PROVIDER_ORIGINS = ['https://api.groq.com', 'https://openrouter.ai', 'https://api.openai.com'];
const EXPECTED_CSP = [
  "default-src 'none'",
  `script-src 'self' ${OFFICE_JS_ORIGIN}`,
  `connect-src 'self' ${PROVIDER_ORIGINS.join(' ')} ${OFFICE_JS_ORIGIN}`,
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const failures = [];
const fail = (message) => failures.push(message);

if (!existsSync(DIST)) {
  console.error('No apps/outlook-addin/dist. Run pnpm build first.');
  process.exit(1);
}

for (const page of ['taskpane.html', 'commands.html']) {
  const path = join(DIST, page);
  if (!existsSync(path)) {
    fail(`${page} is missing`);
    continue;
  }
  const html = readFileSync(path, 'utf8');
  const policies = [...html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/g)];
  if (policies.length !== 1)
    fail(`${page}: expected one Content-Security-Policy meta tag, found ${policies.length}`);
  else if (policies[0][1] !== EXPECTED_CSP)
    fail(`${page}: unexpected Content-Security-Policy: ${policies[0][1]}`);
  const remote = [...html.matchAll(/<script[^>]*\ssrc="(https?:[^"]+)"/g)].map((match) => match[1]);
  if (remote.length !== 1 || remote[0] !== OFFICE_JS_URL) {
    fail(`${page}: the only remote script must be Office.js, found ${JSON.stringify(remote)}`);
  }
  if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html)) fail(`${page}: inline scripts are not allowed`);
  if (/<link[^>]*href="https?:/.test(html)) fail(`${page}: remote stylesheets or links are not allowed`);
}

const assets = join(DIST, 'assets');
for (const file of existsSync(assets) ? readdirSync(assets) : []) {
  if (file.endsWith('.map')) fail(`assets/${file}: source maps are not shipped`);
  if (!/\.(js|css)$/.test(file)) continue;
  const code = readFileSync(join(assets, file), 'utf8');
  for (const marker of ['localhost:', '127.0.0.1', '/@vite/client', 'sourceMappingURL']) {
    if (code.includes(marker)) fail(`assets/${file}: contains development marker "${marker}"`);
  }
}

const manifestPath = join(DIST, 'manifest.xml');
if (existsSync(manifestPath)) {
  const manifest = readFileSync(manifestPath, 'utf8');
  const brand = readFileSync(join(ROOT, 'packages/contracts/src/brand.ts'), 'utf8');
  const id = /OUTLOOK_ADDIN_ID = '([0-9a-f-]+)'/.exec(brand)?.[1];
  const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  if (id === undefined || !manifest.includes(`<Id>${id}</Id>`))
    fail('manifest.xml: the add-in ID is not OUTLOOK_ADDIN_ID');
  if (!manifest.includes(`<Version>${version}.0</Version>`))
    fail(`manifest.xml: version is not ${version}.0`);
  if (!manifest.includes('<Permissions>ReadWriteItem</Permissions>'))
    fail('manifest.xml: permission must be ReadWriteItem');
  for (const forbidden of ['LaunchEvent', 'ItemSend', 'OnMessageSend', 'ReadWriteMailbox', 'Appointment']) {
    if (manifest.includes(forbidden)) fail(`manifest.xml: must not contain ${forbidden}`);
  }
  const urls = [...manifest.matchAll(/DefaultValue="(https?:[^"]+)"/g)].map((match) => match[1]);
  const origins = new Set(
    urls.filter((url) => !url.startsWith('https://github.com/')).map((url) => new URL(url).origin),
  );
  if (origins.size !== 1)
    fail(`manifest.xml: every page and icon must come from one origin, found ${[...origins]}`);
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.hostname === 'localhost')
      fail(`manifest.xml: ${origin} is not a production HTTPS origin`);
  }
} else {
  console.log('No manifest.xml (WRITEHAND_ADDIN_ORIGIN was not set); checked the pages only.');
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  process.exit(1);
}
console.log('Add-in check passed: dist (Content Security Policy, Office.js only, no development code).');
