import { DEFAULT_CONTEXT_SELECTION, type ApplyTarget } from '@writehand/contracts';
import {
  buildContext,
  deriveCapabilities,
  prepareAction,
  reduceSession,
  validateApply,
  validateUndo,
  type SessionState,
} from '@writehand/core';
import { describe, expect, it } from 'vitest';

import { meetingThread, threadA, threadB } from '../../fixtures/synthetic-mail/threads';
import { testDependencies } from '../test-dependencies';
import { newSession, reduceAll, selectionBinding } from './session-helpers';

const capabilities = (state: SessionState) => deriveCapabilities(state, { processingAvailable: true });

const replyTarget = (expectedThreadRevision = 1): ApplyTarget => ({
  mode: 'create-reply',
  threadRef: threadA,
  messageKey: 'm3',
  expectedThreadRevision,
});

/** Read mode in an Office add-in: the open email was read and a reply was generated from an instruction. */
function readModeWithReply(): SessionState {
  const snapshot = meetingThread();
  const context = buildContext(
    { expectedThread: threadA, snapshot, selection: DEFAULT_CONTEXT_SELECTION, includedBlocks: [] },
    testDependencies(),
  );
  const read = reduceAll(newSession(), [
    { type: 'form-changed', changes: { operation: 'reply', instruction: 'Perşembeyi onayla' } },
    { type: 'read-started', operationId: 'r1', subject: 'thread' },
    { type: 'thread-read', operationId: 'r1', snapshot, context },
  ]);
  const action = prepareAction(
    {
      sessionId: read.sessionId,
      formRevision: read.formRevision,
      draft: {
        operation: 'reply',
        source: { origin: 'panel', text: '' },
        instruction: read.form.instruction,
        targetLanguage: null,
        tone: read.form.tone,
        context: read.context,
        target: null,
      },
    },
    testDependencies(),
  );
  if (!action.ok) throw new Error('unexpected validation error');
  return reduceAll(read, [
    { type: 'action-prepared', action: action.value },
    {
      type: 'result-received',
      candidate: {
        requestId: action.value.requestId,
        sessionId: action.value.sessionId,
        formRevision: action.value.formRevision,
        text: 'Perşembe 14:00 bana uyar.',
        sample: true,
      },
    },
  ]);
}

describe('create-reply target (a new reply to the open email)', () => {
  it('is never derived by itself: without a draft the result has no target until the user picks one', () => {
    const state = readModeWithReply();

    expect(state.phase.status).toBe('preview');
    expect(capabilities(state).applyTarget).toBeNull();
    expect(validateApply(state)).toMatchObject({ ok: false, error: { code: 'TARGET_MISSING' } });
  });

  it('once chosen, is applied once with a stable operation ID that names the replied-to message', () => {
    const bound = reduceSession(readModeWithReply(), { type: 'target-bound', target: replyTarget() });

    const request = validateApply(bound);
    expect(request.ok && request.value.target).toEqual(replyTarget());
    expect(request.ok && request.value.applyOperationId).toMatch(/:reply:m3:1$/);
    expect(validateApply(bound)).toEqual(request);
  });

  it('is refused when the open conversation changed or was read again with other content', () => {
    const bound = reduceSession(readModeWithReply(), { type: 'target-bound', target: replyTarget() });

    const switched = reduceSession(bound, {
      type: 'mail-event',
      event: { type: 'active-thread-changed', previous: threadA, current: threadB },
    });
    expect(validateApply(switched)).toMatchObject({ ok: false, error: { code: 'THREAD_CHANGED' } });

    const otherRevision = reduceSession(readModeWithReply(), {
      type: 'target-bound',
      target: replyTarget(7),
    });
    expect(validateApply(otherRevision)).toMatchObject({ ok: false, error: { code: 'THREAD_CHANGED' } });
  });

  it('does not clear a stale conversation when it is bound', () => {
    const switched = reduceSession(readModeWithReply(), {
      type: 'mail-event',
      event: { type: 'active-thread-changed', previous: threadA, current: threadB },
    });
    const bound = reduceSession(switched, { type: 'target-bound', target: replyTarget() });

    expect(bound.staleReason).toBe('thread-changed');
    expect(validateApply(bound).ok).toBe(false);
  });

  it('may follow a result made from the received message, which never grants a draft target', () => {
    const fromMessage = reduceAll(readModeWithReply(), [
      {
        type: 'source-loaded',
        operationId: null,
        text: 'Thursday works for me.',
        binding: { kind: 'received-message', threadRef: threadA, messageKey: 'm2', loadedText: 'x' },
      },
    ]);
    const draftTarget = reduceSession(fromMessage, {
      type: 'target-bound',
      target: { mode: 'insert-empty', composerRef: selectionBinding.composerRef, expectedRevision: 1 },
    });
    expect(draftTarget.explicitTarget).toBeNull();

    const replyBound = reduceSession(fromMessage, { type: 'target-bound', target: replyTarget() });
    expect(capabilities(replyBound).applyTarget).toEqual(replyTarget());
  });

  it('records the opened reply as applied without a draft to track, so it offers no undo and is not repeated', () => {
    const bound = reduceSession(readModeWithReply(), { type: 'target-bound', target: replyTarget() });
    const request = validateApply(bound);
    if (!request.ok) throw new Error('unexpected validation error');

    const applied = reduceAll(bound, [
      { type: 'apply-started', operationId: 'a1', applyOperationId: request.value.applyOperationId },
      {
        type: 'apply-finished',
        operationId: 'a1',
        applyOperationId: request.value.applyOperationId,
        outcome: { status: 'applied', composerRevision: null, undoId: null },
      },
    ]);

    expect(applied.phase.status).toBe('applied');
    expect(applied.lastChange).toMatchObject({ outcome: 'applied', composerRef: null, undoId: null });
    expect(validateUndo(applied).ok).toBe(false);
    expect(validateApply(applied).ok).toBe(false);
  });
});
