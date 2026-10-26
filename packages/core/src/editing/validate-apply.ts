import {
  appError,
  err,
  isComposerTarget,
  isSameThread,
  ok,
  type AppError,
  type ApplyRequest,
  type ApplyTarget,
  type ReplyApplyTarget,
  type Result,
} from '@writehand/contracts';

import { ACTION_LIMITS } from '../actions/action-limits';
import type { SessionPreview, SessionState, StaleReason } from '../session/session-state';
import { effectiveApplyTarget } from './derive-apply-target';

const STALE_REASON_ERRORS: Record<StaleReason, AppError['code']> = {
  'composer-changed': 'TARGET_CHANGED',
  'composer-removed': 'TARGET_MISSING',
  'selection-invalid': 'SELECTION_INVALID',
  'thread-changed': 'THREAD_CHANGED',
  'account-changed': 'TARGET_MISSING',
};

/** Always produces the same ID for the same preview revision and target. */
export function applyOperationIdFor(preview: SessionPreview, target: ApplyTarget): string {
  const place = isComposerTarget(target)
    ? [target.composerRef.composerKey, target.expectedRevision]
    : ['reply', target.messageKey, target.expectedThreadRevision];
  return [preview.requestId, preview.previewRevision, ...place].join(':');
}

/** A new reply belongs to the message and conversation content the result was made from. */
function isReplyTargetCurrent(state: SessionState, target: ReplyApplyTarget): boolean {
  return (
    state.thread !== null &&
    state.threadSnapshot !== null &&
    isSameThread(state.thread, target.threadRef) &&
    state.threadSnapshot.revision === target.expectedThreadRevision
  );
}

function replacedText(state: SessionState): string | null {
  const { binding } = state;
  return binding.kind === 'draft' || binding.kind === 'draft-selection' ? binding.loadedText : null;
}

/**
 * Decides whether a write is allowed based on session, revision and operation rules. The
 * connector separately performs the final DOM checks (attachment, visibility, actual
 * selection); this check alone is not sufficient.
 */
export function validateApply(state: SessionState): Result<ApplyRequest, AppError> {
  const { preview } = state;
  if (preview === null) {
    return err(appError('RESULT_INVALID', { field: 'preview' }));
  }
  if (preview.formRevision !== state.formRevision) {
    return err(appError('PREVIEW_STALE', { field: 'preview' }));
  }
  const target = effectiveApplyTarget(state);
  if (target === null) {
    return err(
      appError(state.binding.kind === 'received-message' ? 'WRITE_UNSUPPORTED' : 'TARGET_MISSING', {
        field: 'target',
      }),
    );
  }
  if (state.staleReason !== null) {
    return err(appError(STALE_REASON_ERRORS[state.staleReason], { field: 'target' }));
  }
  if (isComposerTarget(target)) {
    if (state.targetComposerRevision !== target.expectedRevision) {
      // A revision mismatch is never resolved by updating the expected revision.
      return err(appError('TARGET_CHANGED', { field: 'target' }));
    }
  } else if (!isReplyTargetCurrent(state, target)) {
    return err(appError('THREAD_CHANGED', { field: 'target' }));
  }

  if (preview.text.trim().length === 0) {
    return err(appError('RESULT_INVALID', { field: 'preview' }));
  }
  if (preview.text.length > ACTION_LIMITS.maxPreviewLength) {
    return err(
      appError('RESULT_INVALID', {
        field: 'preview',
        details: { limit: ACTION_LIMITS.maxPreviewLength, length: preview.text.length },
      }),
    );
  }
  if (preview.text === replacedText(state)) {
    return err(appError('RESULT_UNCHANGED', { field: 'preview' }));
  }

  const applyOperationId = applyOperationIdFor(preview, target);
  if (state.lastChange?.applyOperationId === applyOperationId) {
    return err(
      appError(state.lastChange.outcome === 'uncertain' ? 'WRITE_UNCERTAIN' : 'TARGET_CHANGED', {
        field: 'target',
      }),
    );
  }

  return ok({ applyOperationId, target, text: preview.text });
}
