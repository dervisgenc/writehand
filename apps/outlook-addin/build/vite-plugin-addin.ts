import type { Plugin } from 'vite';

import { contentSecurityPolicy, OFFICE_JS_URL } from './addin-config';
import { createManifest } from './manifest';

export interface AddinPluginOptions {
  /** The origin the manifest points to; without one, no manifest is written. */
  readonly origin: string | null;
  readonly version: string;
}

const CSP_MARKER = '<!-- writehand:csp -->';
const OFFICE_MARKER = '<!-- writehand:office-js -->';

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
          .replace(OFFICE_MARKER, `<script src="${OFFICE_JS_URL}"></script>`);
      },
    },
    configureServer(server) {
      server.middlewares.use('/manifest.xml', (_request, response) => {
        if (options.origin === null) {
          response.statusCode = 404;
          response.end();
          return;
        }
        response.setHeader('Content-Type', 'application/xml; charset=utf-8');
        response.end(createManifest({ origin: options.origin, version: options.version }));
      });
    },
    generateBundle() {
      if (options.origin === null) {
        this.warn('No WRITEHAND_ADDIN_ORIGIN: the task pane was built without manifest.xml.');
        return;
      }
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.xml',
        source: createManifest({ origin: options.origin, version: options.version }),
      });
    },
  };
}
