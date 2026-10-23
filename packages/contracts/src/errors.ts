/**
 * Stable error codes. The code identifies the error source programmatically; the
 * user-facing description comes from the extension's `locales/` files.
 */
export const ERROR_CODES = [
  'PAGE_UNSUPPORTED',
  'PAGE_NOT_READY',
  'THREAD_CHANGED',
  'ACCOUNT_CHANGED',
  'TARGET_MISSING',
  'TARGET_CHANGED',
  'SELECTION_INVALID',
  'SOURCE_EMPTY',
  'SOURCE_TOO_LARGE',
  'CONTEXT_TOO_LARGE',
  'CONTEXT_REQUIRED',
  'CONTEXT_STALE',
  'LANGUAGE_REQUIRED',
  'RESULT_INVALID',
  'RESULT_UNCHANGED',
  'PREVIEW_STALE',
  'SETTINGS_CONFLICT',
  'SETTINGS_INVALID',
  'READ_TIMEOUT',
  'READ_CANCELLED',
  'WRITE_UNSUPPORTED',
  'WRITE_UNCERTAIN',
  /** The result is larger than a new reply opened by the mail app can take (32 KB in Outlook). */
  'REPLY_TOO_LARGE',
  'UNDO_INVALID',
  'CLIPBOARD_UNAVAILABLE',
  'EXTENSION_RELOADED',
  'PROCESSING_UNAVAILABLE',
  'AI_HOST_UNAVAILABLE',
  'AI_NOT_CONNECTED',
  'AI_AUTH_FAILED',
  'AI_AUTH_EXCHANGE_FAILED',
  'AI_AUTH_TOKEN_INVALID',
  'AI_AUTH_IDENTITY_FAILED',
  'AI_AUTH_CANCELLED',
  'AI_POLICY_DENIED',
  'AI_WORKSPACE_MISMATCH',
  'AI_ACCOUNT_NAME_TAKEN',
  'AI_PLAN_REQUIRED',
  'AI_NOT_ELIGIBLE',
  'AI_ACCESS_DENIED',
  'AI_LIMIT_REACHED',
  /** The ChatGPT workspace or the OpenAI API account has no credits left; a plan limit has not been reached. */
  'AI_CREDITS_EXHAUSTED',
  'AI_UNAVAILABLE',
  'AI_NETWORK',
  'AI_MODEL_UNAVAILABLE',
  'AI_RESPONSE_INCOMPLETE',
  'AI_REVOKE_UNCONFIRMED',
  'AI_BUSY',
  /** The provider did not accept the API key. */
  'AI_KEY_INVALID',
  /** The browser does not let the extension reach the API key's provider (optional host permission). */
  'AI_PROVIDER_ACCESS_REQUIRED',
  /** The browser could not store or read the API key protected. */
  'AI_KEY_STORAGE_FAILED',
  /** The request is larger than the provider allows for the model or plan (e.g. a free tier's tokens per minute). */
  'AI_REQUEST_TOO_LARGE',
  'AI_CLAUDE_NOT_INSTALLED',
  'AI_CLAUDE_NOT_LOGGED_IN',
  /** Claude Code exists only as a command script (claude.cmd) that cannot start safely without a shell. */
  'AI_CLAUDE_UNSUPPORTED_INSTALL',
  /** The extension and the local helper app are from different versions; the request was not recognized. */
  'AI_VERSION_MISMATCH',
  /** The helper app's latest version could not be fetched from GitHub. */
  'HOST_UPDATE_CHECK_FAILED',
  /** The update could not be downloaded or installed; the installed version is unchanged. */
  'HOST_UPDATE_FAILED',
  /** The downloaded release's signature or checksum could not be verified; nothing was installed. */
  'HOST_UPDATE_UNVERIFIED',
  'CONTENT_SCRIPT_UNREACHABLE',
  'MESSAGE_REJECTED',
  'UNEXPECTED',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** The panel field the error is attached to. */
export type ErrorField = 'source' | 'instruction' | 'targetLanguage' | 'context' | 'target' | 'preview';

export interface AppError {
  readonly code: ErrorCode;
  readonly field?: ErrorField;
  /**
   * Numeric diagnostics only, with no content (limit, length, count).
   * Email text, addresses or URLs are never written here.
   */
  readonly details?: Readonly<Record<string, number>>;
}

export function appError(
  code: ErrorCode,
  options: { field?: ErrorField; details?: Record<string, number> } = {},
): AppError {
  return Object.freeze({
    code,
    ...(options.field ? { field: options.field } : {}),
    ...(options.details ? { details: Object.freeze({ ...options.details }) } : {}),
  });
}
