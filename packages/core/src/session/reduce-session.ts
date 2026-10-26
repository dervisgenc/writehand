import {
  appError,
  isComposerTarget,
  isSameComposer,
  isSameThread,
  type AppError,
  type ApplyOutcome,
  type ApplyTarget,
  type ComposerRef,
  type ContextSnapshot,
  type MailEvent,
  type PreparedAction,
  type Result,
  type ThreadSnapshot,
  type UndoOutcome,
} from '@writehand/contracts';

import { validatePreviewCandidate } from '../actions/validate-preview';
import { effectiveApplyTarget } from '../editing/derive-apply-target';
import {
  createSession,
  restingPhase,
  type SessionForm,
  type SessionState,
  type SourceBinding,
  type StaleReason,
} from './session-state';

export type SessionEvent =
  | { readonly type: 'read-started'; readonly operationId: string; readonly subject: 'thread' | 'source' }
  | { readonly type: 'read-cancelled'; readonly operationId: string }
  | { readonly type: 'read-failed'; readonly operationId: string; readonly error: AppError }
  | {
      readonly type: 'thread-read';
      readonly operationId: string;
      readonly snapshot: ThreadSnapshot;
      readonly context: Result<ContextSnapshot, AppError>;
    }
  | {
      /** The user opened another message in the conversation; new content read in the background. */
      readonly type: 'thread-refreshed';
      readonly snapshot: ThreadSnapshot;
      readonly context: Result<ContextSnapshot, AppError>;
    }
  | { readonly type: 'context-built'; readonly context: Result<ContextSnapshot, AppError> }
  | {
      readonly type: 'source-loaded';
      readonly operationId: string | null;
      readonly text: string;
      readonly binding: SourceBinding;
    }
  | { readonly type: 'form-changed'; readonly changes: Partial<SessionForm> }
  | { readonly type: 'action-prepared'; readonly action: PreparedAction }
  | { readonly type: 'action-rejected'; readonly errors: readonly AppError[] }
  | { readonly type: 'result-received'; readonly candidate: unknown }
  | { readonly type: 'processing-failed'; readonly requestId: string; readonly error: AppError }
  | { readonly type: 'preview-edited'; readonly text: string }
  | { readonly type: 'target-bound'; readonly target: ApplyTarget }
  | { readonly type: 'apply-started'; readonly operationId: string; readonly applyOperationId: string }
  | {
      readonly type: 'apply-finished';
      readonly operationId: string;
      readonly applyOperationId: string;
      readonly outcome: ApplyOutcome;
    }
  | { readonly type: 'undo-started'; readonly operationId: string }
  | { readonly type: 'undo-finished'; readonly operationId: string; readonly outcome: UndoOutcome }
  | { readonly type: 'mail-event'; readonly event: MailEvent }
  | { readonly type: 'error-dismissed' };

function isPendingRead(state: SessionState, operationId: string): boolean {
  return state.phase.status === 'reading' && state.phase.operationId === operationId;
}

function isPendingWrite(state: SessionState, operationId: string, kind: 'apply' | 'undo'): boolean {
  return (
    state.phase.status === 'applying' && state.phase.operationId === operationId && state.phase.kind === kind
  );
}

function rest(state: SessionState): SessionState {
  return { ...state, phase: restingPhase(state) };
}

function withContext(state: SessionState, context: Result<ContextSnapshot, AppError>): SessionState {
  return {
    ...state,
    context: context.ok ? context.value : null,
    contextError: context.ok ? null : context.error,
  };
}

function hasFormChanges(form: SessionForm, changes: Partial<SessionForm>): boolean {
  return (Object.keys(changes) as (keyof SessionForm)[]).some((key) => form[key] !== changes[key]);
}

/** The editor the target or source binding points to. */
function trackedComposer(state: SessionState): ComposerRef | null {
  const target = effectiveApplyTarget(state);
  if (target !== null && isComposerTarget(target)) {
    return target.composerRef;
  }
  const { binding } = state;
  return binding.kind === 'draft' || binding.kind === 'draft-selection' ? binding.composerRef : null;
}

function markStale(state: SessionState, reason: StaleReason): SessionState {
  return { ...state, staleReason: reason };
}

function staleReasonForWriteError(error: AppError): StaleReason | null {
  switch (error.code) {
    case 'TARGET_CHANGED':
      return 'composer-changed';
    case 'TARGET_MISSING':
      return 'composer-removed';
    case 'SELECTION_INVALID':
      return 'selection-invalid';
    case 'THREAD_CHANGED':
      return 'thread-changed';
    default:
      return null;
  }
}

function reduceMailEvent(state: SessionState, event: MailEvent): SessionState {
  switch (event.type) {
    case 'account-changed':
      // Clear the previous account's content and pending operations.
      return createSession({
        sessionId: state.sessionId,
        thread: null,
        operation: state.form.operation,
        defaults: { targetLanguage: state.form.targetLanguage, tone: state.form.tone },
        staleReason: 'account-changed',
      });

    case 'active-thread-changed':
      if (state.thread === null) {
        return state;
      }
      if (event.current === null || !isSameThread(state.thread, event.current)) {
        return markStale(state, 'thread-changed');
      }
      // The user returned to the work's conversation; the work is valid again.
      return state.staleReason === 'thread-changed' ? { ...state, staleReason: null } : state;

    case 'thread-content-changed':
      if (
        state.thread !== null &&
        state.threadSnapshot !== null &&
        isSameThread(state.thread, event.threadRef)
      ) {
        return { ...state, contextStale: true };
      }
      return state;

    case 'composer-removed': {
      const composer = trackedComposer(state);
      if (composer !== null && isSameComposer(composer, event.ref)) {
        return markStale(state, 'composer-removed');
      }
      return state;
    }

    case 'composer-changed': {
      const composer = trackedComposer(state);
      if (composer === null || !isSameComposer(composer, event.ref)) {
        return state;
      }
      const next = { ...state, targetComposerRevision: event.revision };
      if (state.phase.status === 'applying') {
        // The extension's own write; the result is handled by `apply-finished`.
        return next;
      }
      const target = effectiveApplyTarget(state);
      const expected = target !== null && isComposerTarget(target) ? target.expectedRevision : null;
      const isOwnWrite = state.lastChange?.composerRevisionAfter === event.revision;
      if (event.revision !== expected && !isOwnWrite && state.staleReason === null) {
        return markStale(next, 'composer-changed');
      }
      return next;
    }

    case 'composer-rebound': {
      const composer = trackedComposer(state);
      if (composer === null || !isSameComposer(composer, event.previous)) {
        return state;
      }
      const rebound = rebindComposer(state, event.ref);
      if (
        state.thread === null &&
        event.ref.threadKey !== null &&
        state.form.operation === 'compose' &&
        state.phase.status !== 'applying'
      ) {
        // A late quote proves this Write session is a reply. Keep the user's input,
        // but invalidate any generation made without the conversation.
        return rest({
          ...rebound,
          thread: { scope: event.ref.scope, threadKey: event.ref.threadKey },
          form: { ...state.form, operation: 'reply' },
          formRevision: state.formRevision + 1,
          action: null,
          preview: null,
        });
      }
      return rebound;
    }

    case 'composer-added':
    case 'page-state-changed':
      return state;
  }
}

/**
 * Undo restored the draft to the text the result was prepared from (verified by the
 * connector). For a body or empty-draft target the same result can be applied again; a
 * selection record becomes invalid on undo and the user selects the text again.
 */
function afterUndo(state: SessionState, revision: number): SessionState {
  const next: SessionState = { ...state, lastChange: null, targetComposerRevision: revision };
  const target = effectiveApplyTarget(state);
  if (target === null || !isComposerTarget(target)) {
    return next;
  }
  if (target.mode === 'replace-selection') {
    return state.staleReason === null ? markStale(next, 'selection-invalid') : next;
  }
  const { explicitTarget } = state;
  return {
    ...next,
    binding:
      state.binding.kind === 'draft' ? { ...state.binding, composerRevision: revision } : state.binding,
    explicitTarget:
      explicitTarget === null || !isComposerTarget(explicitTarget)
        ? explicitTarget
        : { ...explicitTarget, expectedRevision: revision },
  };
}

function rebindComposer(state: SessionState, ref: ComposerRef): SessionState {
  const { binding, explicitTarget, lastChange } = state;
  const matches = (current: ComposerRef) => isSameComposer(current, ref);
  return {
    ...state,
    binding:
      (binding.kind === 'draft' || binding.kind === 'draft-selection') && matches(binding.composerRef)
        ? { ...binding, composerRef: ref }
        : binding,
    explicitTarget:
      explicitTarget !== null && isComposerTarget(explicitTarget) && matches(explicitTarget.composerRef)
        ? { ...explicitTarget, composerRef: ref }
        : explicitTarget,
    lastChange:
      lastChange !== null && lastChange.composerRef !== null && matches(lastChange.composerRef)
        ? { ...lastChange, composerRef: ref }
        : lastChange,
  };
}

/**
 * Applies session events as a pure function. Late events with a mismatched ID or from
 * cancelled operations leave the state unchanged.
 */
export function reduceSession(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case 'read-started':
      if (state.phase.status === 'reading' || state.phase.status === 'applying') {
        return state;
      }
      return {
        ...state,
        phase: { status: 'reading', operationId: event.operationId, subject: event.subject },
      };

    case 'read-cancelled':
      return isPendingRead(state, event.operationId) ? rest(state) : state;

    case 'read-failed':
      return isPendingRead(state, event.operationId)
        ? { ...state, phase: { status: 'error', error: event.error } }
        : state;

    case 'thread-read': {
      if (!isPendingRead(state, event.operationId)) {
        return state;
      }
      if (state.thread === null || !isSameThread(state.thread, event.snapshot.ref)) {
        // The conversation changed during the read: drop the partial context, keep the input.
        return { ...state, phase: { status: 'error', error: appError('THREAD_CHANGED') } };
      }
      const next = withContext(
        {
          ...state,
          threadSnapshot: event.snapshot,
          contextStale: false,
          formRevision: state.formRevision + 1,
        },
        event.context,
      );
      return rest(next);
    }

    case 'thread-refreshed': {
      // Refresh the context silently only while it is in use and the user is not working
      // on a result. Changing the context under a preview would make the preview stale;
      // in that case the "context is stale" warning (contextStale) stays.
      const isIdle = state.phase.status === 'idle' || state.phase.status === 'editing';
      if (
        !isIdle ||
        state.threadSnapshot === null ||
        state.thread === null ||
        !isSameThread(state.thread, event.snapshot.ref)
      ) {
        return state;
      }
      return rest(
        withContext(
          {
            ...state,
            threadSnapshot: event.snapshot,
            contextStale: false,
            formRevision: state.formRevision + 1,
          },
          event.context,
        ),
      );
    }

    case 'context-built':
      return withContext({ ...state, formRevision: state.formRevision + 1 }, event.context);

    case 'source-loaded': {
      if (event.operationId !== null && !isPendingRead(state, event.operationId)) {
        return state;
      }
      if (state.phase.status === 'applying') {
        return state;
      }
      const revision =
        event.binding.kind === 'draft' || event.binding.kind === 'draft-selection'
          ? event.binding.composerRevision
          : null;
      // The preview goes stale only if the source text actually changed. When the same text
      // is loaded again (e.g. the card is reopened with the same button), only the draft's
      // current revision is recorded; the finished result stays applicable to it.
      const sourceChanged = event.text !== state.form.sourceText;
      return rest({
        ...state,
        form: { ...state.form, sourceText: event.text },
        formRevision: sourceChanged ? state.formRevision + 1 : state.formRevision,
        binding: event.binding,
        explicitTarget: null,
        targetComposerRevision: revision,
        staleReason: state.staleReason === 'thread-changed' ? state.staleReason : null,
        fieldErrors: [],
      });
    }

    case 'form-changed': {
      if (state.phase.status === 'applying' || !hasFormChanges(state.form, event.changes)) {
        return state;
      }
      // A form change makes the prepared action and the preview stale; a late result is
      // rejected because its form revision no longer matches.
      return rest({
        ...state,
        form: { ...state.form, ...event.changes },
        formRevision: state.formRevision + 1,
        fieldErrors: [],
      });
    }

    case 'action-prepared':
      if (
        event.action.sessionId !== state.sessionId ||
        event.action.formRevision !== state.formRevision ||
        state.phase.status === 'reading' ||
        state.phase.status === 'applying'
      ) {
        return state;
      }
      return {
        ...state,
        action: event.action,
        fieldErrors: [],
        phase: { status: 'prepared', requestId: event.action.requestId },
      };

    case 'action-rejected':
      return rest({ ...state, fieldErrors: event.errors });

    case 'result-received': {
      const { phase, action } = state;
      if (
        phase.status !== 'prepared' ||
        action === null ||
        phase.requestId !== action.requestId ||
        action.formRevision !== state.formRevision
      ) {
        return state;
      }
      const decision = validatePreviewCandidate(event.candidate, action);
      if (decision.status === 'ignored') {
        return state;
      }
      if (decision.status === 'rejected') {
        return { ...state, phase: { status: 'error', error: decision.error } };
      }
      const { candidate } = decision;
      return {
        ...state,
        preview: {
          requestId: candidate.requestId,
          formRevision: candidate.formRevision,
          text: candidate.text,
          previewRevision: 1,
          sample: candidate.sample,
        },
        phase: { status: 'preview' },
      };
    }

    case 'processing-failed':
      if (state.phase.status !== 'prepared' || state.phase.requestId !== event.requestId) {
        return state;
      }
      return { ...state, phase: { status: 'error', error: event.error } };

    case 'preview-edited':
      if (state.preview === null || state.phase.status === 'applying' || state.preview.text === event.text) {
        return state;
      }
      // Editing the preview is not a new generation; only the preview revision increases.
      return rest({
        ...state,
        preview: {
          ...state.preview,
          text: event.text,
          previewRevision: state.preview.previewRevision + 1,
        },
      });

    case 'target-bound': {
      const { target } = event;
      if (state.phase.status === 'applying') {
        return state;
      }
      if (!isComposerTarget(target)) {
        // A new reply overwrites nothing, so any source may use it; a stale conversation stays stale.
        return { ...state, explicitTarget: target };
      }
      if (state.binding.kind === 'received-message') {
        return state;
      }
      return {
        ...state,
        explicitTarget: target,
        targetComposerRevision: target.expectedRevision,
        staleReason: null,
      };
    }

    case 'apply-started':
      if (state.phase.status !== 'preview') {
        return state;
      }
      return {
        ...state,
        phase: { status: 'applying', operationId: event.operationId, kind: 'apply' },
      };

    case 'apply-finished': {
      if (!isPendingWrite(state, event.operationId, 'apply') || state.preview === null) {
        return state;
      }
      const target = effectiveApplyTarget(state);
      const { outcome } = event;
      if (outcome.status === 'rejected') {
        const reason = staleReasonForWriteError(outcome.error);
        return {
          ...state,
          staleReason: reason ?? state.staleReason,
          phase: { status: 'error', error: outcome.error },
        };
      }
      if (target === null) {
        return { ...state, phase: { status: 'error', error: appError('TARGET_MISSING') } };
      }
      const base = {
        applyOperationId: event.applyOperationId,
        requestId: state.preview.requestId,
        previewRevision: state.preview.previewRevision,
        composerRef: isComposerTarget(target) ? target.composerRef : null,
      };
      if (outcome.status === 'uncertain') {
        // The same write is never retried automatically; the preview is kept.
        return {
          ...state,
          lastChange: { ...base, outcome: 'uncertain', undoId: null, composerRevisionAfter: null },
          phase: { status: 'error', error: outcome.error },
        };
      }
      return {
        ...state,
        lastChange: {
          ...base,
          outcome: 'applied',
          undoId: outcome.undoId,
          composerRevisionAfter: outcome.composerRevision,
        },
        targetComposerRevision: outcome.composerRevision ?? state.targetComposerRevision,
        phase: { status: 'applied' },
      };
    }

    case 'undo-started':
      if (state.phase.status === 'reading' || state.phase.status === 'applying') {
        return state;
      }
      return {
        ...state,
        phase: { status: 'applying', operationId: event.operationId, kind: 'undo' },
      };

    case 'undo-finished': {
      if (!isPendingWrite(state, event.operationId, 'undo')) {
        return state;
      }
      const { outcome } = event;
      if (outcome.status === 'undone') {
        return rest(afterUndo(state, outcome.composerRevision));
      }
      return {
        ...state,
        lastChange: state.lastChange === null ? null : { ...state.lastChange, undoId: null },
        phase: { status: 'error', error: outcome.error },
      };
    }

    case 'mail-event':
      return reduceMailEvent(state, event.event);

    case 'error-dismissed':
      return state.phase.status === 'error' ? rest(state) : state;
  }
}
