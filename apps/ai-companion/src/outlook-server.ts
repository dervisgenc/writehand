import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer, type Server } from 'node:https';
import { OUTLOOK_BRIDGE } from '@writehand/contracts';

import type { DispatchResult } from './host-dispatch';

/**
 * The helper app's local server for the Outlook add-in (`writehand outlook serve`). It serves
 * the task pane's files on `https://localhost:<port>` and answers the pane's helper app
 * requests on the same origin, so the pane needs no permission to reach a local address.
 *
 * Who may do what:
 * - Every request must name this server (`Host`), which also stops DNS rebinding.
 * - The pane's requests must come from its own origin (`Origin`, set by the browser) and carry
 *   the token the server wrote into the pane's page, which no other site can read.
 * - Stopping or restarting the server needs the control token from the helper's data folder and
 *   must not come from a browser (no `Origin`): only `writehand` commands of the same user do that.
 * Nothing about a request's content is logged.
 */

export interface AddinFile {
  readonly type: string;
  readonly body: Buffer;
}

export interface OutlookServerOptions {
  readonly port: number;
  /** Published paths without a leading slash (`taskpane.html`, `assets/…`). */
  readonly files: ReadonlyMap<string, AddinFile>;
  readonly dispatch: (raw: unknown) => Promise<DispatchResult | null>;
  /** Written into the pane's page; the pane sends it back with every request. */
  readonly token: string;
  /** The key the pane's address must carry (`?key=`) for the page to get the token. */
  readonly pageKey: string;
  readonly controlToken: string;
  readonly status: () => object;
  readonly onStop: () => void;
  /** Hands over to the program now installed (after an update): it starts that one and stops. */
  readonly onRestart: () => void;
}

/** The pane's page: its `<meta>` gets the token, and no other site may frame it. */
export const TASKPANE_PATH = 'taskpane.html';
const CONTROL_HEADER = 'x-writehand-control';
/** A generation request with the largest context is far below this. */
const MAX_BODY_BYTES = 1_000_000;
/** Outlook's own pages that frame the task pane (the new Outlook and Outlook on the web). */
export const FRAME_ANCESTORS = [
  "'self'",
  'https://outlook.office.com',
  'https://outlook.office365.com',
  'https://outlook.cloud.microsoft',
  'https://outlook.live.com',
];

const TYPES: Readonly<Record<string, string>> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  png: 'image/png',
  svg: 'image/svg+xml',
  xml: 'application/xml; charset=utf-8',
  json: 'application/json; charset=utf-8',
  woff2: 'font/woff2',
};

export function contentTypeOf(path: string): string {
  return TYPES[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream';
}

function sameToken(given: string | string[] | undefined, expected: string): boolean {
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readBody(request: IncomingMessage): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        resolve(null);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', () => resolve(null));
  });
}

/** Fills the pane's token placeholder: `<meta name="writehand-bridge" content="">`. */
export function withToken(page: Buffer, token: string): Buffer {
  const placeholder = `<meta name="${OUTLOOK_BRIDGE.tokenMeta}" content="">`;
  const html = page.toString('utf8');
  if (!html.includes(placeholder)) return page;
  return Buffer.from(
    html.replace(placeholder, `<meta name="${OUTLOOK_BRIDGE.tokenMeta}" content="${token}">`),
  );
}

/** The request handler, apart from TLS and listening, so it can be tested directly. */
export function createOutlookHandler(options: OutlookServerOptions) {
  const hosts = new Set([`localhost:${options.port}`, `127.0.0.1:${options.port}`]);
  const origins = new Set([`https://localhost:${options.port}`, `https://127.0.0.1:${options.port}`]);

  const send = (
    response: ServerResponse,
    status: number,
    headers: Record<string, string> = {},
    body?: Buffer | string,
  ) => {
    response.writeHead(status, {
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      ...headers,
    });
    response.end(body);
  };

  async function bridge(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const origin = request.headers.origin;
    if (typeof origin !== 'string' || !origins.has(origin)) return send(response, 403);
    if (!sameToken(request.headers[OUTLOOK_BRIDGE.tokenHeader], options.token)) return send(response, 403);
    if (!(request.headers['content-type'] ?? '').startsWith('application/json')) return send(response, 415);
    const body = await readBody(request);
    if (body === null) return send(response, 413);
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      return send(response, 400);
    }
    const result = await options.dispatch(raw);
    if (result === null) return send(response, 400);
    send(response, 200, { 'content-type': TYPES.json! }, JSON.stringify(result.response));
  }

  function control(request: IncomingMessage, response: ServerResponse, path: string): void {
    // Browsers always send `Origin` with a POST; the control commands come from the command line.
    if (
      request.headers.origin !== undefined ||
      !sameToken(request.headers[CONTROL_HEADER], options.controlToken)
    ) {
      return send(response, 403);
    }
    if (path === '/control/status' && request.method === 'GET') {
      return send(response, 200, { 'content-type': TYPES.json! }, JSON.stringify(options.status()));
    }
    if (path === '/control/stop' && request.method === 'POST') {
      response.on('finish', options.onStop);
      return send(response, 204);
    }
    if (path === '/control/restart' && request.method === 'POST') {
      response.on('finish', options.onRestart);
      return send(response, 204);
    }
    send(response, 404);
  }

  function file(request: IncomingMessage, response: ServerResponse, url: URL): void {
    const path = url.pathname;
    const name = path === '/' ? TASKPANE_PATH : path.slice(1);
    const found = options.files.get(name);
    if (found === undefined) return send(response, 404);
    const page = name.endsWith('.html');
    const headers: Record<string, string> = { 'content-type': found.type };
    if (page) headers['content-security-policy'] = `frame-ancestors ${FRAME_ANCESTORS.join(' ')}`;
    else headers['cache-control'] = 'no-cache';
    // The token goes only into a pane requested with this user's page key, which only their own
    // manifest carries. Any other local client, such as a program of another Windows account on
    // this computer, gets the page without it and so cannot use the helper app.
    const keyed =
      name === TASKPANE_PATH &&
      sameToken(url.searchParams.get(OUTLOOK_BRIDGE.pageKeyParameter) ?? undefined, options.pageKey);
    const body = keyed ? withToken(found.body, options.token) : found.body;
    send(response, 200, headers, request.method === 'HEAD' ? undefined : body);
  }

  return (request: IncomingMessage, response: ServerResponse): void => {
    if (!hosts.has(request.headers.host ?? '')) return send(response, 421);
    const url = new URL(request.url ?? '/', 'https://localhost');
    const path = url.pathname;
    if (path === OUTLOOK_BRIDGE.path) {
      if (request.method !== 'POST') return send(response, 405);
      void bridge(request, response).catch(() => send(response, 500));
      return;
    }
    if (path.startsWith('/control/')) return control(request, response, path);
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405);
    file(request, response, url);
  };
}

/**
 * Starts the server on 127.0.0.1. Resolves with the server once it listens, or with `in-use`
 * when another program (usually a running copy of this server) holds the port.
 */
export function startOutlookServer(
  options: OutlookServerOptions & { readonly cert: string; readonly key: string },
): Promise<Server | 'in-use'> {
  const server = createServer(
    { cert: options.cert, key: options.key, minVersion: 'TLSv1.2' },
    createOutlookHandler(options),
  );
  // A generation may take two minutes; a stalled client must not hold a connection forever.
  server.requestTimeout = 150_000;
  server.headersTimeout = 20_000;
  return new Promise((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) =>
      error.code === 'EADDRINUSE' ? resolve('in-use') : reject(error),
    );
    server.listen(options.port, '127.0.0.1', () => resolve(server));
  });
}
