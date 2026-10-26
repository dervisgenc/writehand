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

import type { AiConnection } from './ai-connection';

/**
 * The AI connection of a page that generates itself, without a background to message: the
 * Outlook add-in's task pane. Its API key method runs in the page; the ChatGPT and Claude plans
 * go to the helper app through the client the connection was created with.
 */
export interface AiService {
  status(): Promise<AiStatus>;
  /** Runs a method, account, key, provider or model command and reports the resulting status. */
  command(command: AiCommand): Promise<Result<AiStatus, AppError>>;
  generate(input: AiInput, signal?: AbortSignal): Promise<Result<{ text: string }, AppError>>;
}

/** The connection with a caller's `AbortSignal` in place of generation IDs. */
export function connectionService(connection: AiConnection): AiService {
  return {
    status: () => connection.status(),
    command: (command) => connection.command(command),
    async generate(input, signal) {
      if (signal?.aborted) return err(appError('READ_CANCELLED'));
      const generationId = crypto.randomUUID();
      const cancel = () => void connection.cancel(generationId);
      signal?.addEventListener('abort', cancel);
      try {
        return await connection.generate(generationId, input);
      } finally {
        signal?.removeEventListener('abort', cancel);
      }
    },
  };
}

/**
 * `TextProcessor` that generates in the same page through the AI service. The standing
 * instructions are read from the settings on every generation.
 */
export function createDirectProcessor(
  service: AiService,
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
