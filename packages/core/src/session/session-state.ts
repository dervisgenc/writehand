import {
  DEFAULT_CONTEXT_SELECTION,
  type AppError,
  type ApplyTarget,
  type BlockRef,
  type ComposerRef,
  type ContextEdit,
  type ContextSelection,
  type ContextSnapshot,
  type TargetLanguage,
  type Operation,
  type PreparedAction,
  type ThreadRef,
  type ThreadSnapshot,
  type Tone,
} from '@writehand/contracts';

/**
 * The single state model of a panel session. It keeps one phase instead of separate
 * `isLoading`/`hasResult` flags that could contradict each other. Whether the panel is open
 * or closed is not part of this model.
 */
export type SessionPhase =
  | { readonly status: 'idle' }
  | {
      readonly status: 'reading';
      readonly operationId: string;
      readonly subject: 'thread' | 'source';
    }
  | { readonly status: 'editing' }
  | { readonly status: 'prepared'; readonly requestId: string }
  | { readonly status: 'preview' }
  | {
      readonly status: 'applying';
      readonly operationId: string;
      readonly kind: 'apply' | 'undo';
    }
  | { readonly status: 'applied' }
  | { readonly status: 'error'; readonly error: AppError };

export type SessionStatus = SessionPhase['status'];

export interface SessionForm {
  readonly operation: Operation;
  readonly sourceText: string;
  readonly instruction: string;
  /** Kept in the session even while hidden; not included in the action record for revision. */
  readonly targetLanguage: TargetLanguage;
  readonly tone: Tone;
  /** Whether the conversation is included as context for revision and translation. */
  readonly useConversation: boolean;
  readonly contextSelection: ContextSelection;
  readonly includedBlocks: readonly BlockRef[];
  /** Message texts the user edited in the context panel. */
  readonly contextEdits: readonly ContextEdit[];
  /** Message to reply to, picked by the user when the active message cannot be identified. */
  readonly replyTargetKey: string | null;
}

/**
 * Where on the email page the source text came from. Editing in the panel does not change
 * this record: the new text to process and the old range to replace in Outlook are kept
 * separately.
 */
export type SourceBinding =
  | { readonly kind: 'panel' }
  | {
      readonly kind: 'draft';
      readonly composerRef: ComposerRef;
      readonly composerRevision: number;
      readonly loadedText: string;
      readonly canReplaceBody: boolean;
      readonly canInsertIntoEmptyBody: boolean;
    }
  | {
      readonly kind: 'draft-selection';
      readonly composerRef: ComposerRef;
      readonly composerRevision: number;
      readonly selectionId: string;
      readonly loadedText: string;
    }
  | {
      readonly kind: 'received-message';
      readonly threadRef: ThreadRef;
      readonly messageKey: string;
      readonly loadedText: string;
    };

/** Why the source or target is no longer valid. */
export type StaleReason =
  'composer-changed' | 'composer-removed' | 'selection-invalid' | 'thread-changed' | 'account-changed';

export interface SessionPreview {
  readonly requestId: string;
  /** Form revision of the action record the preview belongs to. */
  readonly formRevision: number;
  /** Single source of the text to apply; reflects the user's latest edit. */
  readonly text: string;
  readonly previewRevision: number;
  readonly sample: boolean;
}

export interface AppliedChange {
  readonly applyOperationId: string;
  readonly requestId: string;
  readonly previewRevision: number;
  readonly outcome: 'applied' | 'uncertain';
  /** `null` after opening a new reply: the result went into a draft the session does not track. */
  readonly composerRef: ComposerRef | null;
  readonly undoId: string | null;
  readonly composerRevisionAfter: number | null;
}

export interface SessionState {
  readonly sessionId: string;
  readonly phase: SessionPhase;
  readonly formRevision: number;
  readonly form: SessionForm;
  /** The conversation the session is bound to; content from other conversations is never mixed in. */
  readonly thread: ThreadRef | null;
  readonly threadSnapshot: ThreadSnapshot | null;
  readonly context: ContextSnapshot | null;
  readonly contextError: AppError | null;
  /** The conversation has new content; no action is prepared with this context until it is re-read. */
  readonly contextStale: boolean;
  readonly binding: SourceBinding;
  /** Target the user picked explicitly; otherwise the target is derived from the source binding. */
  readonly explicitTarget: ApplyTarget | null;
  /** Last known revision of the target editor. */
  readonly targetComposerRevision: number | null;
  readonly action: PreparedAction | null;
  readonly preview: SessionPreview | null;
  readonly lastChange: AppliedChange | null;
  readonly staleReason: StaleReason | null;
  readonly fieldErrors: readonly AppError[];
}

export interface CreateSessionOptions {
  readonly sessionId: string;
  readonly thread: ThreadRef | null;
  readonly operation?: Operation;
  readonly defaults: { readonly targetLanguage: TargetLanguage; readonly tone: Tone };
  readonly staleReason?: StaleReason | null;
}

export function createSession(options: CreateSessionOptions): SessionState {
  return {
    sessionId: options.sessionId,
    phase: { status: 'idle' },
    formRevision: 0,
    form: {
      operation: options.operation ?? 'revise',
      sourceText: '',
      instruction: '',
      targetLanguage: options.defaults.targetLanguage,
      tone: options.defaults.tone,
      useConversation: false,
      contextSelection: DEFAULT_CONTEXT_SELECTION,
      includedBlocks: [],
      contextEdits: [],
      replyTargetKey: null,
    },
    thread: options.thread,
    threadSnapshot: null,
    context: null,
    contextError: null,
    contextStale: false,
    binding: { kind: 'panel' },
    explicitTarget: null,
    targetComposerRevision: null,
    action: null,
    preview: null,
    lastChange: null,
    staleReason: options.staleReason ?? null,
    fieldErrors: [],
  };
}

export function isPreviewCurrent(state: SessionState): boolean {
  return state.preview !== null && state.preview.formRevision === state.formRevision;
}

export function isSessionBusy(state: SessionState): boolean {
  const { status } = state.phase;
  return status === 'reading' || status === 'applying' || status === 'prepared';
}

/** Phase the session returns to when a running operation finishes or is cancelled. */
export function restingPhase(state: SessionState): SessionPhase {
  const { preview, lastChange } = state;
  if (preview !== null && isPreviewCurrent(state)) {
    const isApplied =
      lastChange?.outcome === 'applied' &&
      lastChange.requestId === preview.requestId &&
      lastChange.previewRevision === preview.previewRevision;
    return isApplied ? { status: 'applied' } : { status: 'preview' };
  }
  const hasInput =
    state.threadSnapshot !== null ||
    state.binding.kind !== 'panel' ||
    state.form.sourceText !== '' ||
    state.form.instruction !== '';
  return hasInput ? { status: 'editing' } : { status: 'idle' };
}
