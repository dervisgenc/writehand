import {
  isInstructionOperation,
  isSameComposer,
  isSameScope,
  isSameThread,
  type ComposerRef,
  type ErrorCode,
  type ErrorField,
  type MessageSnapshot,
  type PageState,
} from '@writehand/contracts';
import {
  describeContext,
  isRelatedEntry,
  normalizeContextText,
  type HistoryEntry,
  type SessionCapabilities,
  type SessionState,
  type StaleReason,
} from '@writehand/core';
import type {
  ApplyView,
  ContextMessageView,
  ContextView,
  PanelView,
  SourceReloadKind,
  StatusView,
  TargetView,
} from '@writehand/ui';

const PREVIEW_LENGTH = 160;
const RETRYABLE: readonly ErrorCode[] = [
  'READ_TIMEOUT',
  'PAGE_NOT_READY',
  'THREAD_CHANGED',
  'AI_NETWORK',
  'AI_UNAVAILABLE',
  'AI_RESPONSE_INCOMPLETE',
];

const STALE_NOTICES: Record<StaleReason, ErrorCode> = {
  'composer-changed': 'TARGET_CHANGED',
  'composer-removed': 'TARGET_MISSING',
  'selection-invalid': 'SELECTION_INVALID',
  'thread-changed': 'THREAD_CHANGED',
  'account-changed': 'ACCOUNT_CHANGED',
};

/** Transient UI state held by the panel bridge; it carries no business rules. */
export interface TransientUiState {
  readonly pendingReplace: SourceReloadKind | null;
  readonly replyReplaceComposer: ComposerRef | null;
  readonly notice:
    | { readonly kind: 'success'; readonly message: 'copied' | 'undone' }
    | { readonly kind: 'error'; readonly code: ErrorCode }
    | null;
}

export interface PanelViewInput {
  readonly state: SessionState;
  readonly capabilities: SessionCapabilities;
  readonly page: PageState;
  readonly ui: TransientUiState;
  /** Messages read during the page session. */
  readonly history: readonly HistoryEntry[];
}

function shorten(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  return singleLine.length > PREVIEW_LENGTH ? `${singleLine.slice(0, PREVIEW_LENGTH)}…` : singleLine;
}

/** The draft the session works on: the source or target record, else the conversation's only open draft. */
export function sessionComposer(state: SessionState, page: PageState): ComposerRef | null {
  const { binding } = state;
  if (binding.kind === 'draft' || binding.kind === 'draft-selection') {
    return binding.composerRef;
  }
  if (state.explicitTarget !== null) {
    return state.explicitTarget.composerRef;
  }
  const thread = state.thread;
  const candidates = page.composers.filter((composer) =>
    thread === null
      ? composer.threadKey === null
      : composer.threadKey !== null &&
        isSameThread(thread, { scope: composer.scope, threadKey: composer.threadKey }),
  );
  // With several candidates the user picks one via the draft's button; the first editor is not chosen.
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

function targetView(state: SessionState, capabilities: SessionCapabilities): TargetView {
  if (state.binding.kind === 'received-message') {
    return { kind: 'received-message' };
  }
  const target = capabilities.applyTarget;
  return target === null
    ? { kind: 'none' }
    : { kind: 'composer', isReply: target.composerRef.threadKey !== null };
}

function messageText(message: MessageSnapshot): string {
  return normalizeContextText(message.blocks.map((block) => block.text).join('\n\n'));
}

interface ListedMessage {
  readonly message: MessageSnapshot;
  readonly subject: string | null;
  readonly group: ContextMessageView['group'];
  readonly order: number;
}

/**
 * Messages to list in the context inspector: the latest read of the open conversation
 * and other messages read during the session (same account). The open conversation
 * group keeps read order; in the other group the most recently read comes first.
 */
function listedMessages(state: SessionState, history: readonly HistoryEntry[]): ListedMessage[] {
  const snapshot = state.threadSnapshot;
  if (snapshot === null) {
    return [];
  }
  const historyOrder = new Map(history.map((entry) => [entry.message.messageKey, entry.order]));
  const afterHistory = Math.max(-1, ...historyOrder.values()) + 1;
  const current = new Set(snapshot.messages.map((message) => message.messageKey));
  const listed: ListedMessage[] = [
    ...snapshot.messages.map((message) => ({
      message,
      subject: snapshot.subject,
      group: 'current' as const,
      order: historyOrder.get(message.messageKey) ?? afterHistory + message.displayOrder,
    })),
    ...history
      .filter(
        (entry) =>
          !current.has(entry.message.messageKey) && isSameScope(entry.threadRef.scope, snapshot.ref.scope),
      )
      .map((entry) => ({
        message: entry.message,
        subject: entry.subject,
        group: isRelatedEntry(entry, snapshot.ref, snapshot.subject)
          ? ('current' as const)
          : ('other' as const),
        order: entry.order,
      })),
  ];
  return listed.sort((a, b) =>
    a.group === b.group
      ? a.group === 'current'
        ? a.order - b.order
        : b.order - a.order
      : a.group === 'current'
        ? -1
        : 1,
  );
}

function contextView(
  state: SessionState,
  capabilities: SessionCapabilities,
  history: readonly HistoryEntry[],
  fieldError: ErrorCode | null,
): ContextView {
  const { threadSnapshot: snapshot, context, phase } = state;
  const isReading = phase.status === 'reading' && phase.subject === 'thread';
  const status: ContextView['status'] = isReading
    ? 'reading'
    : snapshot === null
      ? 'not-loaded'
      : state.contextStale
        ? 'stale'
        : state.contextError !== null
          ? 'error'
          : 'ready';

  const included = new Map(context?.messages.map((message) => [message.messageKey, message]) ?? []);
  const edits = new Map(state.form.contextEdits.map((edit) => [edit.messageKey, edit.text]));
  const isReply = state.form.operation === 'reply';
  const needsReplyTarget = isReply && snapshot !== null && snapshot.activeMessageKey === null;
  const replyTargetKey = snapshot?.activeMessageKey ?? state.form.replyTargetKey;
  const messages: ContextMessageView[] = listedMessages(state, history).map(({ message, subject, group }) => {
    const inContext = included.get(message.messageKey);
    const edited = edits.get(message.messageKey);
    const text =
      inContext?.text ?? (edited === undefined ? messageText(message) : normalizeContextText(edited).trim());
    return {
      messageKey: message.messageKey,
      senderLabel: message.senderLabel,
      sentAtText: message.sentAtText,
      subject,
      group,
      preview: shorten(text),
      text,
      included: inContext !== undefined,
      edited: edited !== undefined,
      locked: isReply && message.messageKey === replyTargetKey,
      isReplyTarget: message.messageKey === replyTargetKey,
      omittedBlocks: (context?.omissions ?? []).flatMap((omission) => {
        const block =
          omission.messageKey === message.messageKey && omission.blockIndex !== undefined
            ? message.blocks[omission.blockIndex]
            : undefined;
        return block !== undefined && (block.kind === 'signature' || block.kind === 'quote')
          ? [{ blockIndex: omission.blockIndex ?? 0, kind: block.kind, text: shorten(block.text) }]
          : [];
      }),
    };
  });

  return {
    status,
    required: capabilities.usesContext,
    needsReplyTarget,
    notices: context === null ? [] : describeContext(context),
    messages,
    errorCode: state.contextError?.code ?? fieldError,
  };
}

function statusView(state: SessionState, ui: TransientUiState): StatusView {
  const { phase } = state;
  switch (phase.status) {
    case 'reading':
      return { kind: 'busy', activity: 'reading' };
    case 'prepared':
      return { kind: 'busy', activity: 'preparing' };
    case 'applying':
      return { kind: 'busy', activity: phase.kind === 'undo' ? 'undoing' : 'applying' };
    case 'error':
      return { kind: 'error', code: phase.error.code, canRetry: RETRYABLE.includes(phase.error.code) };
    case 'applied':
      return { kind: 'success', message: 'applied' };
    default:
      break;
  }
  if (ui.notice !== null) {
    return ui.notice.kind === 'success'
      ? { kind: 'success', message: ui.notice.message }
      : { kind: 'error', code: ui.notice.code, canRetry: false };
  }
  const unassigned = state.fieldErrors.find((error) => error.field === undefined);
  return unassigned === undefined ? { kind: 'none' } : { kind: 'info', code: unassigned.code };
}

function applyView(input: PanelViewInput, composer: ComposerRef | null): ApplyView {
  const { state, capabilities, ui } = input;
  const { binding } = state;
  // Text written from an instruction (reply or new email) replaces a non-empty draft only after confirmation.
  const isReply = isInstructionOperation(state.form.operation);
  const draftNeedsConfirmation =
    binding.kind === 'draft' &&
    isReply &&
    state.explicitTarget === null &&
    binding.loadedText.trim() !== '' &&
    binding.canReplaceBody;

  // If this result was just written, the draft revision advanced because of the extension's own write;
  // a "draft changed" reason would be misleading (the write outcome is shown separately).
  const { lastChange, preview } = state;
  const writtenThisPreview =
    lastChange !== null &&
    preview !== null &&
    lastChange.requestId === preview.requestId &&
    lastChange.previewRevision === preview.previewRevision;
  const blocker = capabilities.applyBlocker?.code ?? null;

  return {
    mode: capabilities.applyTarget?.mode ?? null,
    canApply: !capabilities.isBusy && capabilities.applyBlocker === null,
    blocker: writtenThisPreview && blocker === 'TARGET_CHANGED' ? null : blocker,
    canCopy: capabilities.canCopy,
    canUndo: capabilities.canUndo,
    isApplying: state.phase.status === 'applying',
    canReplaceExistingReply:
      draftNeedsConfirmation ||
      (ui.replyReplaceComposer !== null &&
        composer !== null &&
        isSameComposer(ui.replyReplaceComposer, composer)),
    canUseOpenComposer:
      isReply &&
      capabilities.applyTarget === null &&
      binding.kind === 'panel' &&
      composer !== null &&
      ui.replyReplaceComposer === null,
  };
}

/**
 * If the user switched to another operation, the old operation's stale result is hidden
 * (e.g. a revise result from the card does not linger in the panel while preparing a reply).
 * A stale result of the same operation stays copyable with a "source changed" warning.
 */
function isOtherOperationsPreview(state: SessionState, capabilities: SessionCapabilities): boolean {
  return (
    capabilities.previewIsStale && state.action !== null && state.action.operation !== state.form.operation
  );
}

/**
 * Builds the panel's view data from the session state. A pure function; button
 * availability is not recomputed here, the capabilities come from `core`.
 */
export function toPanelView(input: PanelViewInput): PanelView {
  const { state, capabilities, page, ui, history } = input;
  const { form, binding, phase } = state;
  const composer = sessionComposer(state, page);
  const fieldErrors: Partial<Record<ErrorField, ErrorCode>> = {};
  for (const error of state.fieldErrors) {
    if (error.field !== undefined && fieldErrors[error.field] === undefined) {
      fieldErrors[error.field] = error.code;
    }
  }

  return {
    operation: form.operation,
    // Reply when there is a reply draft or a conversation; otherwise (new message or neither) new email.
    writeOperation:
      composer !== null
        ? composer.threadKey === null
          ? 'compose'
          : 'reply'
        : state.thread === null
          ? 'compose'
          : 'reply',
    target: targetView(state, capabilities),
    source: {
      origin: binding.kind,
      text: form.sourceText,
      instruction: form.instruction,
      edited: capabilities.sourceEdited,
      pendingReplace: ui.pendingReplace,
      canLoadDraft: composer !== null,
      canLoadSelection: composer !== null && !isInstructionOperation(form.operation),
      canLoadReceivedSelection: state.thread !== null && form.operation === 'translate',
      isReading: phase.status === 'reading',
    },
    options: {
      targetLanguage: form.targetLanguage,
      tone: form.tone,
      // The target language is chosen only for translation; reply and new message follow
      // the language of the conversation or the instruction.
      showTargetLanguage: form.operation === 'translate',
      showTone: form.operation !== 'translate',
      useConversation: form.useConversation,
      showUseConversation: !isInstructionOperation(form.operation) && state.thread !== null,
    },
    context: contextView(state, capabilities, history, fieldErrors.context ?? null),
    fieldErrors,
    prepare: {
      canPrepare: !capabilities.isBusy && capabilities.prepareBlocker === null,
      blocker: capabilities.prepareBlocker?.code ?? null,
      isPreparing: phase.status === 'prepared',
    },
    preview:
      state.preview === null || isOtherOperationsPreview(state, capabilities)
        ? null
        : {
            text: state.preview.text,
            sample: state.preview.sample,
            stale: capabilities.previewIsStale,
            unchanged: state.preview.text === form.sourceText,
          },
    refine: {
      available:
        state.preview !== null &&
        !isOtherOperationsPreview(state, capabilities) &&
        !capabilities.isBusy &&
        capabilities.prepareBlocker === null,
      // Table, list and chart are offered only for results written to the whole draft.
      rich: capabilities.applyTarget?.mode !== 'replace-selection' && binding.kind !== 'received-message',
    },
    apply: applyView(input, composer),
    status: statusView(state, ui),
    staleNotice: state.staleReason === null ? null : STALE_NOTICES[state.staleReason],
  };
}
