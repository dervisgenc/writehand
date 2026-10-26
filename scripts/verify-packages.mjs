// Post-build check of the production packages: are the permissions narrow, have local
// test addresses or the development module leaked into the regular package, does the
// background format suit the browser, and are the Firefox ID and data collection
// declaration present?
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outputs = {
  chrome: resolve(root, 'apps/browser-extension/.output/chrome-mv3'),
  firefox: resolve(root, 'apps/browser-extension/.output/firefox-mv3'),
};

const ALLOWED_PERMISSIONS = ['storage'];
// Talking to the local helper app is an optional permission; the welcome wizard requests it.
const OPTIONAL_PERMISSIONS = ['nativeMessaging'];
// The API key providers' API origins, asked for when the user connects a key. Must match
// API_PROVIDER_PERMISSIONS in packages/contracts/src/api-providers.ts.
const OPTIONAL_HOST_PERMISSIONS = [
  'https://api.groq.com/*',
  'https://openrouter.ai/*',
  'https://api.openai.com/*',
];
const FORBIDDEN_PERMISSIONS = [
  '<all_urls>',
  'tabs',
  'scripting',
  'activeTab',
  'cookies',
  'webRequest',
  'webRequestBlocking',
  'downloads',
  'clipboardRead',
  'history',
  'bookmarks',
];
// Must match SITE_MATCHES in apps/browser-extension/src/bootstrap/supported-sites.ts.
const SUPPORTED_MATCHES = [
  'https://outlook.live.com/*',
  'https://outlook.office.com/*',
  'https://outlook.office365.com/*',
  'https://outlook.cloud.microsoft/*',
  'https://mail.google.com/*',
];
const DEVELOPMENT_MARKERS = ['writehand-development-fixture', 'localhost', '127.0.0.1'];

const problems = [];
const fail = (browser, message) => problems.push(`[${browser}] ${message}`);

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesIn(path) : [path];
  });
}

for (const [browser, directory] of Object.entries(outputs)) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  } catch {
    fail(browser, `could not read the manifest: ${directory} (run "pnpm build" first)`);
    continue;
  }

  if (manifest.manifest_version !== 3) fail(browser, 'Not Manifest V3.');

  // The name and description come from the `_locales` translations; the default locale must define them.
  try {
    const messages = JSON.parse(
      readFileSync(join(directory, '_locales', manifest.default_locale, 'messages.json'), 'utf8'),
    );
    for (const field of [manifest.name, manifest.description]) {
      const key = /^__MSG_(\w+)__$/.exec(field)?.[1];
      if (key === undefined || typeof messages[key]?.message !== 'string')
        fail(browser, `manifest text is not localized: ${field}`);
    }
  } catch {
    fail(browser, `could not read the _locales file of the default locale (${manifest.default_locale})`);
  }

  const permissions = manifest.permissions ?? [];
  if (JSON.stringify([...permissions].sort()) !== JSON.stringify(ALLOWED_PERMISSIONS)) {
    fail(browser, `unexpected permissions: ${JSON.stringify(permissions)}`);
  }
  if (JSON.stringify(manifest.optional_permissions ?? []) !== JSON.stringify(OPTIONAL_PERMISSIONS)) {
    fail(browser, `unexpected optional permissions: ${JSON.stringify(manifest.optional_permissions)}`);
  }
  if (
    JSON.stringify(manifest.optional_host_permissions ?? []) !== JSON.stringify(OPTIONAL_HOST_PERMISSIONS)
  ) {
    fail(
      browser,
      `unexpected optional host permissions: ${JSON.stringify(manifest.optional_host_permissions)}`,
    );
  }
  const allPermissions = [
    ...permissions,
    ...(manifest.optional_permissions ?? []),
    ...(manifest.host_permissions ?? []),
    ...(manifest.optional_host_permissions ?? []),
  ];
  for (const forbidden of FORBIDDEN_PERMISSIONS) {
    if (allPermissions.includes(forbidden)) fail(browser, `forbidden permission: ${forbidden}`);
  }
  if ((manifest.host_permissions ?? []).length > 0) {
    fail(browser, `broad host_permissions must not be added: ${JSON.stringify(manifest.host_permissions)}`);
  }

  for (const script of manifest.content_scripts ?? []) {
    for (const pattern of script.matches ?? []) {
      if (!SUPPORTED_MATCHES.includes(pattern)) fail(browser, `unsupported content script match: ${pattern}`);
    }
    if (script.all_frames === true) fail(browser, 'all_frames must stay off for now.');
  }
  // Every supported site has its content script; none is dropped by accident.
  const covered = new Set((manifest.content_scripts ?? []).flatMap((script) => script.matches ?? []));
  for (const pattern of SUPPORTED_MATCHES) {
    if (!covered.has(pattern)) fail(browser, `no content script for the supported site: ${pattern}`);
  }
  for (const resource of manifest.web_accessible_resources ?? []) {
    for (const pattern of resource.matches ?? []) {
      if (!SUPPORTED_MATCHES.includes(pattern))
        fail(browser, `unsupported web_accessible_resources match: ${pattern}`);
    }
  }

  const csp = JSON.stringify(manifest.content_security_policy ?? '');
  if (csp.includes('unsafe-eval') || csp.includes('http')) fail(browser, `relaxed CSP: ${csp}`);

  if (browser === 'chrome' && typeof manifest.background?.service_worker !== 'string') {
    fail(browser, 'The Chromium package must use a background service worker.');
  }
  if (browser === 'firefox') {
    if (!Array.isArray(manifest.background?.scripts))
      fail(browser, 'The Firefox package must use background.scripts.');
    const gecko = manifest.browser_specific_settings?.gecko;
    if (typeof gecko?.id !== 'string') fail(browser, 'browser_specific_settings.gecko.id is missing.');
    if (gecko?.data_collection_permissions === undefined)
      fail(browser, 'The Firefox data collection declaration is missing.');
    // Firefox for Android has no native messaging and is not tested; declaring it would list the
    // extension there. Add `gecko_android` only together with a recorded check on a device.
    if (manifest.browser_specific_settings?.gecko_android !== undefined)
      fail(browser, 'The Firefox package must not declare Firefox for Android (gecko_android).');
  }

  for (const file of filesIn(directory)) {
    if (!/\.(js|html|json|css)$/.test(file)) continue;
    const content = readFileSync(file, 'utf8');
    for (const marker of DEVELOPMENT_MARKERS) {
      if (content.includes(marker))
        fail(
          browser,
          `development marker "${marker}" in the regular package: ${file.slice(directory.length + 1)}`,
        );
    }
    if (/<script[^>]+src=["']https?:/i.test(content)) fail(browser, `remote code loading: ${file}`);
  }
}

if (problems.length > 0) {
  console.error('Package check FAILED:\n' + problems.map((problem) => `  - ${problem}`).join('\n'));
  process.exit(1);
}
console.log(
  'Package check passed: chrome-mv3 and firefox-mv3 (permissions, matches, background format, development code).',
);
