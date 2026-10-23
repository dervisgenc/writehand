import {
  API_PROVIDER_PERMISSIONS,
  FIREFOX_EXTENSION_ID,
  HELPER_COMMAND,
  SITE_IDS,
} from '@writehand/contracts';
import { manifestMessages } from '@writehand/locales';
import { defineConfig } from 'wxt';

import { version } from '../../package.json';
import { DEVELOPMENT_MATCHES, SITE_MATCHES } from './src/bootstrap/supported-sites';

/**
 * Builds Manifest V3 packages for Chromium (service worker) and Firefox
 * (background script) from the same source. WXT defaults to MV2 for Firefox,
 * so the commands pass `--mv3` explicitly (see package.json).
 *
 * Permissions are deliberately narrow: `storage`, optional `nativeMessaging`, optional access
 * to the API key providers' API origins, and static content script matches for the supported
 * Outlook on the web and Gmail addresses. `<all_urls>`, `tabs`, `scripting`, `activeTab`, `cookies`, `webRequest`
 * and `clipboardRead` are not requested.
 */
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  imports: false,
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    // Name and description come from the `_locales` files in each UI language (hook below).
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    // The root package.json is the single version source; the helper app carries the same version.
    version,
    permissions: ['storage'],
    // The helper app permission is not requested at install; the welcome wizard asks for it with a reason.
    optional_permissions: ['nativeMessaging'],
    // Each API key provider's origin is asked for when the user connects a key for it.
    optional_host_permissions: [...API_PROVIDER_PERMISSIONS],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: FIREFOX_EXTENSION_ID,
              // The built-in data collection declaration arrived in Firefox 140.
              strict_min_version: '140.0',
              // Selected text goes to the chosen AI provider only when the user requests a generation;
              // API keys and the helper app's sign-in are authentication information.
              data_collection_permissions: { required: ['personalCommunications', 'authenticationInfo'] },
            },
            gecko_android: { strict_min_version: '142.0' },
          },
        }
      : {}),
  }),
  zip: {
    // Store packages: writehand-<version>-chrome.zip (Chrome, Edge, Brave) and -firefox.zip. The source
    // archive AMO requires must cover the whole monorepo; the release workflow builds it with `git archive`.
    artifactTemplate: `${HELPER_COMMAND}-{{version}}-{{browser}}.zip`,
    zipSources: false,
  },
  hooks: {
    'build:publicAssets': (_wxt, files) => {
      for (const [language, messages] of Object.entries(manifestMessages())) {
        files.push({
          relativeDest: `_locales/${language}/messages.json`,
          contents: `${JSON.stringify(messages, null, 2)}\n`,
        });
      }
    },
    // The local test pages are supported origins only in development, test and demo builds;
    // each site's content script gets its own local path (`DEVELOPMENT_MATCHES`).
    // The matches are added to the entrypoint options rather than the manifest: in MV3
    // `wxt` (dev) does not write the content script to the manifest but registers it at
    // runtime from these options. The manifest's content script, host permissions and the
    // shadow root stylesheet's web_accessible_resources matches are generated from them too.
    'entrypoints:resolved': (wxt, entrypoints) => {
      if (wxt.config.mode === 'production') {
        return;
      }
      for (const entry of entrypoints) {
        if (entry.type !== 'content-script') {
          continue;
        }
        const { matches } = entry.options;
        const site = SITE_IDS.find((id) => matches?.some((pattern) => SITE_MATCHES[id].includes(pattern)));
        if (matches !== undefined && site !== undefined) {
          entry.options.matches = [...matches, ...DEVELOPMENT_MATCHES[site]];
        }
      }
    },
  },
});
