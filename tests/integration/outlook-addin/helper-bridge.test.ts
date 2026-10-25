import { createHelperClient } from '@writehand/ai-connection';
import { OUTLOOK_BRIDGE, PROTOCOL_VERSION, type HostRequest } from '@writehand/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bridgeToken, createBridgeTransport } from '../../../apps/outlook-addin/src/platform/helper-bridge';

const TOKEN = 'pane-token-0123456789abcdef';

const statusRequest: HostRequest = {
  protocolVersion: PROTOCOL_VERSION,
  requestId: 'r1',
  type: 'AI_STATUS',
  payload: {},
};

afterEach(() => {
  document.head.innerHTML = '';
});

describe("the task pane's way to the helper app", () => {
  it('reads the token only from a page the helper app filled in', () => {
    expect(bridgeToken(document)).toBeNull();
    document.head.innerHTML = `<meta name="${OUTLOOK_BRIDGE.tokenMeta}" content="">`;
    expect(bridgeToken(document)).toBeNull();
    document.head.innerHTML = `<meta name="${OUTLOOK_BRIDGE.tokenMeta}" content="${TOKEN}">`;
    expect(bridgeToken(document)).toBe(TOKEN);
  });

  it('posts each request as JSON to its own origin with the token and returns the answer', async () => {
    const answer = { protocolVersion: PROTOCOL_VERSION, requestId: 'r1', ok: true, payload: {} };
    const fetchFn = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(answer), { status: 200 }));
    expect(await createBridgeTransport(TOKEN, fetchFn)(statusRequest)).toEqual(answer);

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe(OUTLOOK_BRIDGE.path);
    expect(init).toMatchObject({
      method: 'POST',
      cache: 'no-store',
      headers: { 'content-type': 'application/json', [OUTLOOK_BRIDGE.tokenHeader]: TOKEN },
      body: JSON.stringify(statusRequest),
    });
  });

  it('answers AI_HOST_UNAVAILABLE, never throws, when the server refuses or cannot be reached', async () => {
    const refused = createBridgeTransport(TOKEN, async () => new Response('', { status: 403 }));
    expect(await refused(statusRequest)).toMatchObject({ ok: false, error: { code: 'AI_HOST_UNAVAILABLE' } });
    const offline = createBridgeTransport(TOKEN, async () => {
      throw new TypeError('Failed to fetch');
    });
    const client = createHelperClient(offline);
    expect(await client.status()).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'AI_HOST_UNAVAILABLE' }),
    });
  });

  it('cancels a generation in the helper app when it does not finish in time', async () => {
    const sent: HostRequest[] = [];
    const fetchFn = vi.fn<typeof fetch>(async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as HostRequest;
      sent.push(request);
      if (request.type === 'AI_GENERATE') throw new DOMException('The operation timed out.', 'TimeoutError');
      return new Response(
        JSON.stringify({
          protocolVersion: 1,
          requestId: request.requestId,
          ok: true,
          payload: { cancelled: true },
        }),
      );
    });
    const generate: HostRequest = {
      protocolVersion: PROTOCOL_VERSION,
      requestId: 'g1',
      type: 'AI_GENERATE',
      payload: {
        generationId: '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b',
        input: {
          operation: 'revise',
          source: 'Hello',
          instruction: '',
          targetLanguage: null,
          tone: 'neutral',
          standingInstructions: '',
          format: 'plain',
          refinement: null,
          messages: [],
        },
      },
    };
    expect(await createBridgeTransport(TOKEN, fetchFn)(generate)).toMatchObject({
      ok: false,
      error: { code: 'AI_UNAVAILABLE' },
    });
    await vi.waitFor(() => expect(sent.map((request) => request.type)).toEqual(['AI_GENERATE', 'AI_CANCEL']));
    expect(sent[1]?.payload).toEqual({ generationId: '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b' });
  });
});
