import { OUTLOOK_BRIDGE } from '@writehand/contracts';
import type { Plugin } from 'vite';

import { contentSecurityPolicy, OFFICE_JS_URL } from './addin-config';
import { createManifest } from './manifest';

export interface AddinPluginOptions {
  /** The origin the manifest points to. */
  readonly origin: string;
  readonly version: string;
  /**
   * Served by the helper app: the pane gets the `<meta>` the helper app fills with its token
   * for helper app requests (`OUTLOOK_BRIDGE`).
   */
  readonly bridge: boolean;
}

/**
 * The npm packages bundled into the pages, by folder: the helper app's release build adds their
 * licenses to its third-party notices. Not a page file; the helper app does not carry it.
 */
export const THIRD_PARTY_LIST = 'third-party-packages.json';

const CSP_MARKER = '<!-- writehand:csp -->';
const OFFICE_MARKER = '<!-- writehand:office-js -->';
const BRIDGE_MARKER = '<!-- writehand:bridge -->';

/**
 * Puts the Content Security Policy and the Office.js script into the task pane's pages and
 * writes `manifest.xml` next to them. The development server serves the manifest at
 * `/manifest.xml` and uses a CSP that allows hot reload.
 */
export function addinPlugin(options: AddinPluginOptions): Plugin {
  let dev = false;
  return {
    name: 'writehand-addin',
    configResolved(config) {
      dev = config.command === 'serve' && !config.isProduction;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes(CSP_MARKER) || !html.includes(OFFICE_MARKER)) {
          throw new Error('A task pane page lacks the CSP or Office.js marker.');
        }
        return html
          .replace(
            CSP_MARKER,
            `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy({ dev })}" />`,
          )
          .replace(OFFICE_MARKER, `<script src="${OFFICE_JS_URL}"></script>`)
          .replace(
            BRIDGE_MARKER,
            options.bridge ? `<meta name="${OUTLOOK_BRIDGE.tokenMeta}" content="">` : '',
          );
      },
    },
    configureServer(server) {
      server.middlewares.use('/manifest.xml', (_request, response) => {
        response.setHeader('Content-Type', 'application/xml; charset=utf-8');
        response.end(createManifest({ origin: options.origin, version: options.version }));
      });
    },
    generateBundle() {
      const packages = new Set<string>();
      for (const id of this.getModuleIds()) {
        const folder = /^(.*node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]+)[\\/]/.exec(id)?.[1];
        if (folder !== undefined) packages.add(folder);
      }
      this.emitFile({
        type: 'asset',
        fileName: THIRD_PARTY_LIST,
        source: JSON.stringify([...packages].sort()),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.xml',
        source: createManifest({ origin: options.origin, version: options.version }),
      });
    },
  };
}
