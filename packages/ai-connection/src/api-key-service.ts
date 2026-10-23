import {
  appError,
  err,
  ok,
  toAiInput,
  type AiCommand,
  type AiInput,
  type AiPreferences,
  type AiStatus,
  type AppError,
  type Result,
  type TextProcessor,
} from '@writehand/contracts';

import type { AiConnectionStore } from './ai-connection-store';
import { apiKeyReady, type ApiKeyConnection } from './api-key-connection';

/** The same limits as the extension's background and the helper app. */
export const GENERATION_TIMEOUT_MS = 120_000;
export const MAX_RUNNING_GENERATIONS = 4;

/**
 * The AI connection of a page that has only the API key method (the Outlook add-in's task
 * pane): no helper app, no messaging. The key is read from the vault only to be sent to its
 * own provider.
 */
export interface ApiKeyService {
  status(): Promise<AiStatus>;
  /** Runs a key, provider or model command and reports the resulting status. */
  command(command: AiCommand): Promise<Result<AiStatus, AppError>>;
  generate(input: AiInput, signal?: AbortSignal): Promise<Result<{ text: string }, AppError>>;
}

export function createApiKeyService(deps: {
  store: AiConnectionStore;
  apiKeys: ApiKeyConnection;
  timeoutMs?: number;
}): ApiKeyService {
  const timeoutMs = deps.timeoutMs ?? GENERATION_TIMEOUT_MS;
  let running = 0;

  async function status(): Promise<AiStatus> {
    const apiKey = await deps.apiKeys.status(await deps.store.read());
    return { mode: 'api-key', ready: apiKeyReady(apiKey), error: null, helper: null, apiKey };
  }

  async function apply(command: AiCommand): Promise<Result<unknown, AppError>> {
    switch (command.action) {
      case 'set-mode':
        // The ChatGPT and Claude plans need the helper app, which this page cannot reach.
        if (command.mode !== 'api-key') return err(appError('AI_HOST_UNAVAILABLE'));
        await deps.store.update(() => ({ mode: 'api-key' }));
        return ok(undefined);
      case 'select-api-provider':
        return deps.apiKeys.selectProvider(command.provider);
      case 'save-api-key': {
        const saved = await deps.apiKeys.saveKey(command.provider, command.apiKey);
        if (saved.ok) await deps.store.update(() => ({ mode: 'api-key' }));
        return saved;
      }
      case 'remove-api-key':
        return deps.apiKeys.removeKey(command.provider);
      case 'set-model':
        return deps.apiKeys.setModel(command.model);
      case 'refresh-models':
        return deps.apiKeys.refreshModels();
      default:
        return err(appError('AI_HOST_UNAVAILABLE'));
    }
  }

  return {
    status,

    async command(command) {
      const applied = await apply(command);
      return applied.ok ? ok(await status()) : applied;
    },

    async generate(input, signal) {
      if (running >= MAX_RUNNING_GENERATIONS) return err(appError('AI_BUSY'));
      const abort = new AbortController();
      const cancel = () => abort.abort();
      signal?.addEventListener('abort', cancel);
      const timer = setTimeout(cancel, timeoutMs);
      running += 1;
      try {
        if (signal?.aborted) return err(appError('READ_CANCELLED'));
        const result = await deps.apiKeys.generate(input, abort.signal);
        return result.ok ? ok({ text: result.value }) : result;
      } finally {
        running -= 1;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
      }
    },
  };
}

/**
 * `TextProcessor` that generates in the same page through the API key service. The standing
 * instructions are read from the settings on every generation.
 */
export function createDirectProcessor(
  service: ApiKeyService,
  readPreferences: () => Promise<AiPreferences>,
): TextProcessor {
  return {
    kind: 'connected',
    async process(action, signal) {
      if (signal.aborted) return err(appError('READ_CANCELLED'));
      // `AbortSignalLike` has no events, so cancellation is polled, as the extension does.
      const abort = new AbortController();
      const timer = setInterval(() => {
        if (signal.aborted) abort.abort();
      }, 50);
      try {
        const result = await service.generate(toAiInput(action, await readPreferences()), abort.signal);
        if (signal.aborted) return err(appError('READ_CANCELLED'));
        return result.ok
          ? ok({
              requestId: action.requestId,
              sessionId: action.sessionId,
              formRevision: action.formRevision,
              text: result.value.text,
              sample: false,
            })
          : result;
      } finally {
        clearInterval(timer);
      }
    },
  };
}
