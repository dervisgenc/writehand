import { PROTOCOL_VERSION } from '@writehand/contracts';
import { describe, expect, it } from 'vitest';

import {
  createRequest,
  createRuntimeHandler,
  sendRequest,
} from '../../../apps/browser-extension/src/platform/runtime-messaging';

describe('Messages between runtime contexts', () => {
  const pageStatus = {
    providerId: 'outlook-web',
    support: 'ready',
    canOpenPanel: true,
    panelOpen: false,
  } as const;
  const handler = createRuntimeHandler(
    { GET_PAGE_STATUS: async () => ({ ok: true, value: pageStatus }) },
    {
      context: 'content-script',
      isAllowedSender: (sender) => sender.id === 'self' && sender.tab === undefined,
    },
  );

  it('rejects a message with an unknown type or extra fields', () => {
    expect(
      handler(
        { protocolVersion: PROTOCOL_VERSION, requestId: 'r', type: 'WRITE_TEXT', payload: {} },
        { id: 'self' },
      ),
    ).toBeNull();
    expect(
      handler(
        { protocolVersion: PROTOCOL_VERSION, requestId: 'r', type: 'OPEN_PANEL', payload: { text: 'x' } },
        { id: 'self' },
      ),
    ).toBeNull();
  });

  it('does not answer a message meant for another context', () => {
    expect(handler(createRequest('GET_SETTINGS', {}, 'r1'), { id: 'self' })).toBeNull();
  });

  it('rejects a sender that is not allowed', async () => {
    const response = await handler(createRequest('GET_PAGE_STATUS', {}, 'r2'), {
      id: 'self',
      tab: { id: 4 },
    });
    expect(response).toEqual({
      protocolVersion: 1,
      requestId: 'r2',
      ok: false,
      error: { code: 'MESSAGE_REJECTED' },
    });
  });

  it('validates the response schema and request ID', async () => {
    const request = createRequest('GET_PAGE_STATUS', {}, 'r3');
    const ok = await sendRequest((message) => handler(message, { id: 'self' })!, request);
    expect(ok).toEqual({ ok: true, value: pageStatus });

    const spoofed = await sendRequest(
      async () => ({ protocolVersion: 1, requestId: 'baska', ok: true, payload: pageStatus }),
      request,
    );
    expect(spoofed).toEqual({ ok: false, error: expect.objectContaining({ code: 'MESSAGE_REJECTED' }) });

    const unreachable = await sendRequest(async () => {
      throw new Error('Could not establish connection');
    }, request);
    expect(unreachable).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'CONTENT_SCRIPT_UNREACHABLE' }),
    });
  });
});
