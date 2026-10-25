import { spawn } from 'node:child_process';
import { createClaudeCodeProvider, findClaudeBinary } from '@writehand/ai-claude-code';
import { createOpenAiOAuth, createOpenAiProvider, failureCode } from '@writehand/ai-openai';
import {
  hostRequestSchema,
  PROTOCOL_VERSION,
  type HostRequest,
  type HostRequestType,
  type RuntimeResponseEnvelope,
} from '@writehand/contracts';

import { createAiService } from './ai-service';
import { createCredentialStore } from './credential-store';
import type { HostConfig } from './host-config';
import { commandPath } from './install-plan';
import { rejectionFor } from './native-protocol';
import type { HostPlatform } from './platform';
import { registeredBrowsers } from './registrations';
import { createUpdater } from './update';
import { HOST_VERSION } from './version';

/** The AI service of one helper process, with its credentials, providers and browser opener. */
export function createHelperService(platform: HostPlatform) {
  return createAiService({
    store: createCredentialStore(platform.dataDirectory, {
      restrictDirectory: platform.restrictDirectory,
    }),
    oauth: createOpenAiOAuth(),
    provider: createOpenAiProvider(),
    claude: createClaudeCodeProvider({
      env: process.env,
      findBinary: () => findClaudeBinary(platform.claudeLocations),
    }),
    openBrowser: (url) =>
      new Promise<void>((resolve, reject) => {
        // Only the HTTPS sign-in page is opened: the system opener would also start local files.
        if (new URL(url).protocol !== 'https:') {
          reject(new Error('Browser could not open.'));
          return;
        }
        const opener = platform.urlOpener(url);
        const child = spawn(opener.file, opener.args, { stdio: 'ignore' });
        child.once('error', () => reject(new Error('Browser could not open.')));
        child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error('Browser could not open.'))));
      }),
  });
}

export type HelperService = ReturnType<typeof createHelperService>;

export interface DispatchResult {
  readonly response: RuntimeResponseEnvelope | object;
  /** An update installed another version: the process answers, then exits. */
  readonly exitAfterAnswer: boolean;
}

/** How many requests one transport takes at once before it answers `AI_BUSY`. */
const MAX_IN_FLIGHT = 32;

/**
 * Answers the helper app's requests, whatever carries them: native messaging from a browser
 * or the local Outlook add-in server. `allowed` limits the request types a transport accepts;
 * any other type is refused with `MESSAGE_REJECTED`. Unparseable messages get the version
 * rejection an older or newer client understands, or no answer at all (`null`).
 */
export function createHostDispatcher(deps: {
  platform: HostPlatform;
  config: HostConfig;
  service: HelperService;
  allowed?: ReadonlySet<HostRequestType>;
}) {
  const { platform, config, service } = deps;
  const updater = createUpdater({ platform, config });
  let inFlight = 0;

  async function answer(request: HostRequest): Promise<DispatchResult> {
    const base = { protocolVersion: PROTOCOL_VERSION, requestId: request.requestId };
    const done = (payload: unknown, exitAfterAnswer = false): DispatchResult => ({
      response: { ...base, ok: true, payload },
      exitAfterAnswer,
    });
    switch (request.type) {
      case 'AI_STATUS':
        return done(await service.status());
      case 'AI_COMMAND':
        return done(await service.command(request.payload));
      case 'AI_GENERATE':
        return done(await service.generate(request.payload.generationId, request.payload.input));
      case 'AI_CANCEL':
        return done(service.cancel(request.payload.generationId));
      case 'HOST_UPDATE_CHECK':
        return done(await updater.check());
      case 'HOST_UPDATE': {
        const result = await updater.update('ignore');
        // The next request starts the new program; this one exits once it has answered.
        return done(result, result.version !== HOST_VERSION);
      }
      case 'HOST_INFO':
        return done({
          version: HOST_VERSION,
          ...platform.target,
          browsers: await registeredBrowsers(platform, commandPath(platform, config.development)),
          development: config.development,
        });
    }
  }

  return {
    async dispatch(raw: unknown): Promise<DispatchResult | null> {
      const parsed = hostRequestSchema.safeParse(raw);
      if (!parsed.success) {
        const rejection = rejectionFor(raw, PROTOCOL_VERSION);
        return rejection === null ? null : { response: rejection, exitAfterAnswer: false };
      }
      const request = parsed.data;
      const failure = (code: string): DispatchResult => ({
        response: {
          protocolVersion: PROTOCOL_VERSION,
          requestId: request.requestId,
          ok: false,
          error: { code },
        },
        exitAfterAnswer: false,
      });
      if (deps.allowed !== undefined && !deps.allowed.has(request.type)) return failure('MESSAGE_REJECTED');
      if (inFlight >= MAX_IN_FLIGHT) return failure('AI_BUSY');
      inFlight++;
      try {
        return await answer(request);
      } catch (caught) {
        return failure(failureCode(caught));
      } finally {
        inFlight--;
      }
    },
    dispose: () => service.dispose(),
  };
}
