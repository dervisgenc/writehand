import {
  appError,
  err,
  isHelperMode,
  ok,
  type AiCommand,
  type AiInput,
  type AiMode,
  type AiStatus,
  type AiSummary,
  type AppError,
  type HelperAiMode,
  type HelperStatus,
  type Result,
} from '@writehand/contracts';
import {
  apiKeyReady,
  type AiConnectionPreferences,
  type AiConnectionStore,
  type ApiKeyConnection,
} from '@writehand/ai-connection';

import type { HelperClient } from './helper-client';

/** The same limits as the helper app's own generations; the helper app enforces its timeout itself. */
const GENERATION_TIMEOUT_MS = 120_000;
const MAX_RUNNING_GENERATIONS = 4;

type HelperState = Result<HelperStatus, AppError>;

/**
 * Before any choice in this browser: the helper app's method if it is installed, otherwise the
 * API key, which works without it. Helper app 0.1.0 may report its retired `api-key` method;
 * that user's key now belongs in the extension.
 */
function initialMode(helper: HelperState): AiMode {
  return helper.ok ? helper.value.mode : 'api-key';
}

/**
 * The AI connection behind every generation. The method is chosen per browser profile: the
 * API key method runs here in the background, ChatGPT and Claude run in the helper app. The
 * helper app keeps one method for all browsers, so it is switched to this browser's method
 * before it is shown or used.
 */
export function createAiConnection(deps: {
  store: AiConnectionStore;
  apiKeys: ApiKeyConnection;
  helper: HelperClient;
}) {
  /** Running generations; `helper` once the request went to the helper app, which then cancels it. */
  const running = new Map<string, { readonly abort: AbortController; helper: boolean }>();

  /**
   * Switches the helper app to `mode` unless it is there already or a sign-in is in progress.
   * If it refuses (it is busy), its current state is kept: it is not ready for `mode` yet.
   */
  const switchHelper = async (helper: HelperState, mode: HelperAiMode): Promise<HelperState> => {
    if (!helper.ok || helper.value.mode === mode || helper.value.signingIn) return helper;
    const switched = await deps.helper.command({ action: 'set-mode', mode });
    return switched.ok ? switched : helper;
  };
  const helperFor = async (mode: HelperAiMode): Promise<HelperState> =>
    switchHelper(await deps.helper.status(), mode);

  const currentMode = async (chosen: AiConnectionPreferences): Promise<AiMode> =>
    chosen.mode ?? initialMode(await deps.helper.status());

  /** Moves a helper app 0.1.0 user's OpenAI key method into the extension, once. */
  const preferences = async (helper: HelperState): Promise<AiConnectionPreferences> => {
    const current = await deps.store.read();
    if (current.mode !== null || !helper.ok || helper.value.mode !== 'api-key') return current;
    return deps.store.update(() => ({ mode: 'api-key', provider: 'openai' }));
  };

  async function status(): Promise<AiStatus> {
    let helper = await deps.helper.status();
    const chosen = await preferences(helper);
    const mode = chosen.mode ?? initialMode(helper);
    if (isHelperMode(mode)) helper = await switchHelper(helper, mode);
    const apiKey = await deps.apiKeys.status(chosen);
    const reachable = helper.ok ? helper.value : null;
    const unreachable = helper.ok ? null : helper.error.code;
    return {
      mode,
      ready: isHelperMode(mode) ? reachable?.mode === mode && reachable.ready : apiKeyReady(apiKey),
      // A missing helper app is shown by the method itself; other failures need explaining.
      error: isHelperMode(mode)
        ? unreachable === 'AI_HOST_UNAVAILABLE'
          ? null
          : (unreachable ?? reachable?.error ?? null)
        : null,
      helper: reachable,
      apiKey,
    };
  }

  /** Changes what the command names; the caller reports the resulting status. */
  async function apply(command: AiCommand): Promise<Result<unknown, AppError>> {
    switch (command.action) {
      case 'set-mode': {
        if (isHelperMode(command.mode)) {
          const switched = await deps.helper.command({ action: 'set-mode', mode: command.mode });
          // Without the helper app the choice is kept and applied once it is installed.
          if (!switched.ok && switched.error.code !== 'AI_HOST_UNAVAILABLE') return switched;
        }
        await deps.store.update(() => ({ mode: command.mode }));
        return ok(undefined);
      }
      case 'select-api-provider':
        return deps.apiKeys.selectProvider(command.provider);
      case 'save-api-key': {
        const saved = await deps.apiKeys.saveKey(command.provider, command.apiKey);
        // Connecting a key means using it.
        if (saved.ok) await deps.store.update(() => ({ mode: 'api-key' }));
        return saved;
      }
      case 'remove-api-key':
        return deps.apiKeys.removeKey(command.provider);
      case 'set-model':
      case 'refresh-models': {
        const mode = await currentMode(await deps.store.read());
        if (!isHelperMode(mode))
          return command.action === 'set-model'
            ? deps.apiKeys.setModel(command.model)
            : deps.apiKeys.refreshModels();
        // The model belongs to the helper app's method, so it must be this browser's.
        const helper = await helperFor(mode);
        return helper.ok ? deps.helper.command(command) : helper;
      }
      default:
        return deps.helper.command(command);
    }
  }

  async function generateWithHelper(
    mode: HelperAiMode,
    generationId: string,
    input: AiInput,
  ): Promise<Result<{ text: string }, AppError>> {
    const helper = await helperFor(mode);
    if (!helper.ok) return helper;
    if (helper.value.mode !== mode) return err(appError('AI_BUSY'));
    const generation = running.get(generationId);
    if (generation === undefined || generation.abort.signal.aborted) return err(appError('READ_CANCELLED'));
    generation.helper = true;
    return deps.helper.generate(generationId, input);
  }

  async function generateWithApiKey(input: AiInput, signal: AbortSignal) {
    const result = await deps.apiKeys.generate(input, signal);
    return result.ok ? ok({ text: result.value }) : result;
  }

  return {
    status,

    async command(command: AiCommand): Promise<Result<AiStatus, AppError>> {
      const applied = await apply(command);
      return applied.ok ? ok(await status()) : applied;
    },

    /** For mail pages: polled, so it never switches the helper app's method. */
    async summary(): Promise<AiSummary> {
      const chosen = await deps.store.read();
      const apiKeySummary = async (): Promise<AiSummary> => {
        const apiKey = await deps.apiKeys.status(chosen);
        const { selectedModel, provider } = apiKey;
        return { mode: 'api-key', ready: apiKeyReady(apiKey), selectedModel, provider };
      };
      if (chosen.mode === 'api-key') return apiKeySummary();
      const helper = await deps.helper.status();
      const mode = chosen.mode ?? initialMode(helper);
      if (!isHelperMode(mode)) return apiKeySummary();
      const state = helper.ok && helper.value.mode === mode ? helper.value : null;
      return { mode, ready: state?.ready ?? false, selectedModel: state?.selectedModel ?? null };
    },

    /** Registered at once, so a cancellation that arrives while the method is resolved still counts. */
    async generate(generationId: string, input: AiInput): Promise<Result<{ text: string }, AppError>> {
      if (running.has(generationId) || running.size >= MAX_RUNNING_GENERATIONS)
        return err(appError('AI_BUSY'));
      const abort = new AbortController();
      running.set(generationId, { abort, helper: false });
      const timer = setTimeout(() => abort.abort(), GENERATION_TIMEOUT_MS);
      try {
        const mode = await currentMode(await deps.store.read());
        return isHelperMode(mode)
          ? await generateWithHelper(mode, generationId, input)
          : await generateWithApiKey(input, abort.signal);
      } finally {
        clearTimeout(timer);
        running.delete(generationId);
      }
    },

    async cancel(generationId: string): Promise<Result<{ cancelled: boolean }, AppError>> {
      const generation = running.get(generationId);
      if (generation === undefined) return ok({ cancelled: false });
      generation.abort.abort();
      return generation.helper ? deps.helper.cancel(generationId) : ok({ cancelled: true });
    },
  };
}

export type AiConnection = ReturnType<typeof createAiConnection>;
