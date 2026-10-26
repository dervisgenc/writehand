import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { OUTLOOK_BRIDGE, PROTOCOL_VERSION } from '@writehand/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DispatchResult } from '../../apps/ai-companion/src/host-dispatch';
import {
  contentTypeOf,
  createOutlookHandler,
  FRAME_ANCESTORS,
  type AddinFile,
} from '../../apps/ai-companion/src/outlook-server';

const PORT = 41537;
const ORIGIN = `https://localhost:${PORT}`;
const TOKEN = 'pane-token-0123456789';
const CONTROL = 'control-token-0123456789';
const KEY = 'page-key-of-this-user-0123456789';

const file = (path: string, body: string): [string, AddinFile] => [
  path,
  { type: contentTypeOf(path), body: Buffer.from(body) },
];
const files = new Map([
  file('taskpane.html', '<head><meta name="writehand-bridge" content=""></head><body>pane</body>'),
  file('assets/taskpane-1.js', 'console.log(1)'),
  file('manifest.xml', '<OfficeApp/>'),
]);

let server: Server | null = null;
afterEach(() => server?.close());

function setup() {
  const dispatch = vi.fn(async (raw: unknown): Promise<DispatchResult | null> =>
    typeof raw === 'object' && raw !== null && 'requestId' in raw
      ? {
          response: {
            protocolVersion: PROTOCOL_VERSION,
            requestId: String(raw.requestId),
            ok: true,
            payload: {},
          },
          exitAfterAnswer: false,
        }
      : null,
  );
  const onStop = vi.fn();
  const onRestart = vi.fn();
  const handler = createOutlookHandler({
    port: PORT,
    files,
    dispatch,
    token: TOKEN,
    pageKey: KEY,
    controlToken: CONTROL,
    status: () => ({ version: '9.9.9' }),
    onStop,
    onRestart,
  });
  return new Promise<{
    call: (options: {
      method?: string;
      path: string;
      headers?: Record<string, string>;
      body?: string;
    }) => Promise<{
      status: number;
      headers: Record<string, string | string[] | undefined>;
      body: string;
    }>;
    dispatch: typeof dispatch;
    onStop: typeof onStop;
    onRestart: typeof onRestart;
  }>((resolve) => {
    server = createServer(handler).listen(0, '127.0.0.1', () => {
      const { port } = server!.address() as AddressInfo;
      resolve({
        dispatch,
        onStop,
        onRestart,
        call: ({ method = 'GET', path, headers = {}, body }) =>
          new Promise((done, fail) => {
            const call = request(
              { host: '127.0.0.1', port, method, path, headers: { host: `localhost:${PORT}`, ...headers } },
              (response) => {
                let text = '';
                response.on('data', (chunk: Buffer) => (text += chunk.toString()));
                response.on('end', () =>
                  done({ status: response.statusCode ?? 0, headers: response.headers, body: text }),
                );
              },
            );
            call.on('error', fail);
            call.end(body);
          }),
      });
    });
  });
}

const bridgeHeaders = (changes: Record<string, string> = {}) => ({
  origin: ORIGIN,
  [OUTLOOK_BRIDGE.tokenHeader]: TOKEN,
  'content-type': 'application/json',
  ...changes,
});
const statusRequest = JSON.stringify({ protocolVersion: 1, requestId: 'r1', type: 'AI_STATUS', payload: {} });

describe('the local Outlook add-in server', () => {
  it('serves the pane with its token, only inside Outlook frames, and never caches it', async () => {
    const { call } = await setup();
    // The address from the user's manifest, with Outlook's own parameters added.
    const page = await call({ path: `/taskpane.html?key=${KEY}&command=revise&_host_Info=Outlook$Win32` });
    expect(page.status).toBe(200);
    expect(page.body).toContain(`<meta name="writehand-bridge" content="${TOKEN}">`);
    expect(page.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(page.headers['content-security-policy']).toBe(`frame-ancestors ${FRAME_ANCESTORS.join(' ')}`);
    expect(page.headers['cache-control']).toBe('no-store');
    expect(page.headers['x-content-type-options']).toBe('nosniff');
    expect((await call({ path: '/' })).body).toContain('pane');
  });

  it('gives the token only to a pane requested with the page key of its manifest', async () => {
    const { call } = await setup();
    const empty = '<meta name="writehand-bridge" content="">';
    // Any local client can request the page, for example a program of another Windows account;
    // without this user's key it gets the page, but not the token.
    for (const path of [
      '/taskpane.html',
      '/',
      '/taskpane.html?key=page-key-of-another-user-012345',
      `/taskpane.html?key=${KEY}x`,
      `/taskpane.html?command=revise&KEY=${KEY}`,
    ]) {
      const page = await call({ path });
      expect(page.status, path).toBe(200);
      expect(page.body, path).toContain(empty);
      expect(page.body, path).not.toContain(TOKEN);
    }
    expect((await call({ path: `/taskpane.html?command=write&key=${KEY}` })).body).toContain(TOKEN);
    // The root serves the pane too, under the same rule.
    expect((await call({ path: `/?key=${KEY}` })).body).toContain(TOKEN);
  });

  it('serves the built files by their exact names and nothing else', async () => {
    const { call } = await setup();
    const script = await call({ path: '/assets/taskpane-1.js' });
    expect(script.status).toBe(200);
    expect(script.headers['content-type']).toBe('text/javascript; charset=utf-8');
    expect((await call({ path: '/manifest.xml' })).headers['content-type']).toBe(
      'application/xml; charset=utf-8',
    );
    expect((await call({ path: '/assets/../taskpane.html' })).status).toBe(200);
    expect((await call({ path: '/../../credentials.json' })).status).toBe(404);
    expect((await call({ path: '/assets/missing.js' })).status).toBe(404);
    expect((await call({ method: 'DELETE', path: '/taskpane.html' })).status).toBe(405);
  });

  it('answers only requests that name it, which stops DNS rebinding', async () => {
    const { call } = await setup();
    expect((await call({ path: '/taskpane.html', headers: { host: 'attacker.example:41537' } })).status).toBe(
      421,
    );
    expect((await call({ path: '/taskpane.html', headers: { host: `127.0.0.1:${PORT}` } })).status).toBe(200);
    expect((await call({ path: '/taskpane.html', headers: { host: 'localhost:3000' } })).status).toBe(421);
  });

  it("passes the pane's helper app requests to the dispatcher and returns its answer", async () => {
    const { call, dispatch } = await setup();
    const answer = await call({
      method: 'POST',
      path: OUTLOOK_BRIDGE.path,
      headers: bridgeHeaders(),
      body: statusRequest,
    });
    expect(answer.status).toBe(200);
    expect(JSON.parse(answer.body)).toEqual({ protocolVersion: 1, requestId: 'r1', ok: true, payload: {} });
    expect(answer.headers['cache-control']).toBe('no-store');
    expect(dispatch).toHaveBeenCalledWith(JSON.parse(statusRequest));
  });

  it('refuses requests from another origin, without the token or with a wrong one', async () => {
    const { call, dispatch } = await setup();
    const post = (headers: Record<string, string>) =>
      call({ method: 'POST', path: OUTLOOK_BRIDGE.path, headers, body: statusRequest });
    expect((await post(bridgeHeaders({ origin: 'https://attacker.example' }))).status).toBe(403);
    expect((await post(bridgeHeaders({ origin: 'https://outlook.office.com' }))).status).toBe(403);
    expect(
      (await post(bridgeHeaders({ [OUTLOOK_BRIDGE.tokenHeader]: 'pane-token-wrong-012345' }))).status,
    ).toBe(403);
    const { origin: _, ...withoutOrigin } = bridgeHeaders();
    expect((await post(withoutOrigin)).status).toBe(403);
    const { [OUTLOOK_BRIDGE.tokenHeader]: __, ...withoutToken } = bridgeHeaders();
    expect((await post(withoutToken)).status).toBe(403);
    expect((await post(bridgeHeaders({ 'content-type': 'text/plain' }))).status).toBe(415);
    expect((await call({ path: OUTLOOK_BRIDGE.path, headers: bridgeHeaders() })).status).toBe(405);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('refuses malformed and oversized bodies', async () => {
    const { call } = await setup();
    const post = (body: string) =>
      call({ method: 'POST', path: OUTLOOK_BRIDGE.path, headers: bridgeHeaders(), body });
    expect((await post('{not json')).status).toBe(400);
    expect((await post('"no envelope"')).status).toBe(400);
    expect(
      (
        await post(JSON.stringify({ requestId: 'x', pad: 'a'.repeat(1_100_000) })).catch(() => ({
          status: 413,
        }))
      ).status,
    ).toBe(413);
  });

  it('lets only the command line, with the control token, ask for its status, stop or restart it', async () => {
    const { call, onStop, onRestart } = await setup();
    expect((await call({ path: '/control/status', headers: { 'x-writehand-control': CONTROL } })).body).toBe(
      JSON.stringify({ version: '9.9.9' }),
    );
    expect(
      (await call({ path: '/control/status', headers: { 'x-writehand-control': 'wrong-token-0123456789' } }))
        .status,
    ).toBe(403);
    // A browser page cannot use it, even with the token: browsers always send `Origin`.
    const fromBrowser = await call({
      method: 'POST',
      path: '/control/stop',
      headers: { 'x-writehand-control': CONTROL, origin: ORIGIN },
    });
    expect(fromBrowser.status).toBe(403);
    expect(onStop).not.toHaveBeenCalled();
    expect(
      (await call({ method: 'POST', path: '/control/stop', headers: { 'x-writehand-control': CONTROL } }))
        .status,
    ).toBe(204);
    await vi.waitFor(() => expect(onStop).toHaveBeenCalledTimes(1));
    expect(
      (await call({ method: 'POST', path: '/control/restart', headers: { 'x-writehand-control': CONTROL } }))
        .status,
    ).toBe(204);
    await vi.waitFor(() => expect(onRestart).toHaveBeenCalledTimes(1));
    expect((await call({ path: '/control/other', headers: { 'x-writehand-control': CONTROL } })).status).toBe(
      404,
    );
  });
});
