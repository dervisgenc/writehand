import { failureResponse, OUTLOOK_BRIDGE, PROTOCOL_VERSION, type HostRequest } from '@writehand/contracts';

/** A generation may take two minutes; everything else answers within seconds. */
const TIMEOUTS: Partial<Record<HostRequest['type'], number>> = { AI_GENERATE: 130_000 };
const DEFAULT_TIMEOUT_MS = 90_000;

/**
 * The token the helper app wrote into this page when it served it, or null when the page did not
 * come from the helper app (the development server, the tests): then the ChatGPT and Claude
 * plans are not offered.
 */
export function bridgeToken(document: Document): string | null {
  const token = document.querySelector(`meta[name="${OUTLOOK_BRIDGE.tokenMeta}"]`)?.getAttribute('content');
  return token && token.length >= 16 ? token : null;
}

/**
 * Sends the helper app's requests to the local add-in server that served this page, on the same
 * origin, with the page's token. It answers with a response envelope and never throws: a server
 * that does not answer is `AI_HOST_UNAVAILABLE`, a generation that does not finish in time is
 * cancelled in the helper app and reported as `AI_UNAVAILABLE`.
 */
export function createBridgeTransport(token: string, fetchFn: typeof fetch = fetch) {
  const post = async (request: HostRequest, timeoutMs: number): Promise<unknown> => {
    const response = await fetchFn(OUTLOOK_BRIDGE.path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [OUTLOOK_BRIDGE.tokenHeader]: token },
      body: JSON.stringify(request),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok ? await response.json() : failureResponse(request.requestId);
  };

  return async (request: HostRequest): Promise<unknown> => {
    try {
      return await post(request, TIMEOUTS[request.type] ?? DEFAULT_TIMEOUT_MS);
    } catch (caught) {
      const timedOut = caught instanceof DOMException && caught.name === 'TimeoutError';
      if (timedOut && request.type === 'AI_GENERATE') {
        const cancel: HostRequest = {
          protocolVersion: PROTOCOL_VERSION,
          requestId: crypto.randomUUID(),
          type: 'AI_CANCEL',
          payload: { generationId: request.payload.generationId },
        };
        void post(cancel, DEFAULT_TIMEOUT_MS).catch(() => undefined);
      }
      return failureResponse(request.requestId, timedOut ? 'AI_UNAVAILABLE' : 'AI_HOST_UNAVAILABLE');
    }
  };
}
