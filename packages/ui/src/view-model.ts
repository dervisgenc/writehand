import type {
  ApplyMode,
  ContextNotice,
  ErrorCode,
  ErrorField,
  TargetLanguage,
  Operation,
  SourceOrigin,
  Tone,
} from '@writehand/contracts';

/**
 * Read-only view data the panel needs to render. The extension derives it from
 * session state; components do not evaluate business rules.
 */

/** An operation requested directly from the compose toolbar. */
export type QuickActionRequest =
  | { readonly operation: 'revise' }
  /** Without a language the card asks for one; the selection is captured first. */
  | { readonly operation: 'translate'; readonly language: TargetLanguage | null }
  | { readonly operation: 'reply' }
  | { readonly operation: 'compose' };

export type TargetView =
  | { readonly kind: 'none' }
  | { readonly kind: 'composer'; readonly isReply: boolean }
  | { readonly kind: 'received-message' }
  | { readonly kind: 'new-reply' };

/** How the user picks a place for a result that has none yet. */
export type BindTargetMode = 'replace-existing-reply' | 'use-open-composer' | 'create-reply';

export type SourceReloadKind = 'draft' | 'selection' | 'received-message';

export interface SourceView {
  readonly origin: SourceOrigin;
  readonly text: string;
  readonly instruction: string;
  readonly edited: boolean;
  /** Reloading the source asks for confirmation when it would replace the current text. */
  readonly pendingReplace: SourceReloadKind | null;
  readonly canLoadDraft: boolean;
  readonly canLoadSelection: boolean;
  readonly canLoadReceivedSelection: boolean;
  readonly isReading: boolean;
}

export interface OptionsView {
  readonly targetLanguage: TargetLanguage;
  readonly tone: Tone;
  readonly showTargetLanguage: boolean;
  readonly showTone: boolean;
  readonly useConversation: boolean;
  readonly showUseConversation: boolean;
}

export interface OmittedBlockView {
  readonly blockIndex: number;
  readonly kind: 'signature' | 'quote';
  readonly text: string;
}

export interface ContextMessageView {
  readonly messageKey: string;
  readonly senderLabel: string | null;
  readonly sentAtText: string | null;
  readonly subject: string | null;
  /**
   * `current`: from the open conversation or the same subject (in context by default).
   * `other`: read from another conversation; in context only if the user adds it.
   */
  readonly group: 'current' | 'other';
  readonly preview: string;
  /** Text that goes into the context; the edited version if the user changed it. */
  readonly text: string;
  readonly included: boolean;
  readonly edited: boolean;
  /** When drafting a reply, the active message cannot be removed from the context. */
  readonly locked: boolean;
  readonly isReplyTarget: boolean;
  readonly omittedBlocks: readonly OmittedBlockView[];
}

export interface ContextView {
  readonly status: 'not-loaded' | 'reading' | 'ready' | 'stale' | 'error';
  readonly required: boolean;
  /** The active message could not be identified: the user must pick the message to reply to. */
  readonly needsReplyTarget: boolean;
  readonly notices: readonly ContextNotice[];
  readonly messages: readonly ContextMessageView[];
  readonly errorCode: ErrorCode | null;
}

export interface PreviewView {
  readonly text: string;
  readonly sample: boolean;
  readonly stale: boolean;
  readonly unchanged: boolean;
}

export interface ApplyView {
  readonly mode: ApplyMode | null;
  readonly canApply: boolean;
  readonly blocker: ErrorCode | null;
  readonly canCopy: boolean;
  readonly canUndo: boolean;
  readonly isApplying: boolean;
  /** Explicit opt-in to replace a reply draft that already has text. */
  readonly canReplaceExistingReply: boolean;
  /** Option to bind a preview without a target to the open reply draft. */
  readonly canUseOpenComposer: boolean;
  /** Option to open a new reply to the open email with the result (no draft is open). */
  readonly canCreateReply: boolean;
}

export type StatusView =
  | { readonly kind: 'none' }
  | { readonly kind: 'busy'; readonly activity: 'reading' | 'preparing' | 'applying' | 'undoing' }
  | { readonly kind: 'success'; readonly message: 'applied' | 'undone' | 'copied' }
  | { readonly kind: 'error'; readonly code: ErrorCode; readonly canRetry: boolean }
  | { readonly kind: 'info'; readonly code: ErrorCode };

export interface PanelView {
  readonly operation: Operation;
  /**
   * The write-from-instruction operation: `reply` when replying to the conversation,
   * `compose` in a new message or when there is no draft. The panel's first tab follows it.
   */
  readonly writeOperation: 'reply' | 'compose';
  readonly target: TargetView;
  readonly source: SourceView;
  readonly options: OptionsView;
  readonly context: ContextView;
  readonly fieldErrors: Partial<Record<ErrorField, ErrorCode>>;
  readonly prepare: {
    readonly canPrepare: boolean;
    readonly blocker: ErrorCode | null;
    readonly isPreparing: boolean;
  };
  readonly preview: PreviewView | null;
  /** Refining a finished result (table, list, chart, shorten, tone). */
  readonly refine: {
    readonly available: boolean;
    readonly rich: boolean;
  };
  readonly apply: ApplyView;
  readonly status: StatusView;
  readonly staleNotice: ErrorCode | null;
}
