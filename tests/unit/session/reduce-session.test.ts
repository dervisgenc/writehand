import { appError, DEFAULT_CONTEXT_SELECTION } from '@writehand/contracts';
import {
  buildContext,
  deriveCapabilities,
  reduceSession,
  validateApply,
  type SessionState,
} from '@writehand/core';
import { describe, expect, it } from 'vitest';

import { meetingThread, threadA, threadB } from '../../fixtures/synthetic-mail/threads';
import { testDependencies } from '../test-dependencies';
import {
  composerRef,
  newSession,
  prepareFrom,
  reduceAll,
  selectionBinding,
  sessionWithPreview,
} from './session-helpers';

const capabilities = (state: Parameters<typeof deriveCapabilities>[0]) =>
  deriveCapabilities(state, { processingAvailable: true });

describe('reduceSession — revisions and late results', () => {
  it('does not show the first result when it arrives after the second action has started', () => {
    const loaded = reduceAll(newSession(), [{ type: 'form-changed', changes: { sourceText: 'ilk metin' } }]);
    const first = prepareFrom(loaded);
    const afterFirst = reduceSession(loaded, { type: 'action-prepared', action: first });
    const edited = reduceSession(afterFirst, {
      type: 'form-changed',
      changes: { sourceText: 'ikinci metin' },
    });
    const second = prepareFrom(edited);
    const afterSecond = reduceSession(edited, { type: 'action-prepared', action: second });

    const late = reduceSession(afterSecond, {
      type: 'result-received',
      candidate: {
        requestId: first.requestId,
        sessionId: 's1',
        formRevision: first.formRevision,
        text: 'eski',
        sample: true,
      },
    });

    expect(late).toBe(afterSecond);
    expect(late.preview).toBeNull();
  });

  it("keeps the preview fresh when the source is reloaded with the same text, and applies it to the draft's new revision", () => {
    const preview = sessionWithPreview();
    const reloaded = reduceSession(preview, {
      type: 'source-loaded',
      operationId: null,
      text: selectionBinding.loadedText,
      binding: { ...selectionBinding, composerRevision: 6 },
    });

    expect(reloaded.phase.status).toBe('preview');
    expect(capabilities(reloaded).previewIsStale).toBe(false);
    const request = validateApply(reloaded);
    expect(request.ok && request.value.target).toMatchObject({ expectedRevision: 6 });
  });

  it('marks the preview stale when the source text changes, so it cannot be applied to the draft', () => {
    const changed = reduceSession(sessionWithPreview(), {
      type: 'source-loaded',
      operationId: null,
      text: 'başka metin',
      binding: { ...selectionBinding, loadedText: 'başka metin', composerRevision: 7 },
    });

    expect(capabilities(changed).previewIsStale).toBe(true);
    expect(validateApply(changed)).toMatchObject({ ok: false, error: { code: 'PREVIEW_STALE' } });
  });

  it('does not activate the result of a cancelled action even if it arrives later', () => {
    const loaded = reduceAll(newSession(), [{ type: 'form-changed', changes: { sourceText: 'metin' } }]);
    const action = prepareFrom(loaded);
    const prepared = reduceSession(loaded, { type: 'action-prepared', action });
    const cancelled = reduceSession(prepared, { type: 'form-changed', changes: { tone: 'formal' } });

    const late = reduceSession(cancelled, {
      type: 'result-received',
      candidate: {
        requestId: action.requestId,
        sessionId: 's1',
        formRevision: action.formRevision,
        text: 'x',
        sample: true,
      },
    });

    expect(late.preview).toBeNull();
    expect(late.phase.status).toBe('editing');
  });

  it('keeps the source when the preview is edited by hand, and only bumps the preview revision', () => {
    const state = sessionWithPreview();
    const edited = reduceSession(state, { type: 'preview-edited', text: 'Toplantıyı yarın yapalım.' });

    expect(edited.preview?.previewRevision).toBe(2);
    expect(edited.form.sourceText).toBe(state.form.sourceText);
    expect(edited.formRevision).toBe(state.formRevision);
  });

  it('marks the preview stale when the source changes: it can be copied but not applied', () => {
    const state = reduceSession(sessionWithPreview(), {
      type: 'form-changed',
      changes: { sourceText: 'yeni kaynak' },
    });
    const caps = capabilities(state);

    expect(caps.previewIsStale).toBe(true);
    expect(caps.canCopy).toBe(true);
    expect(caps.applyBlocker?.code).toBe('PREVIEW_STALE');
  });
});

describe('reduceSession — external changes', () => {
  it('invalidates the target when the user changes the draft', () => {
    const state = reduceSession(sessionWithPreview(), {
      type: 'mail-event',
      event: { type: 'composer-changed', ref: composerRef, revision: 6 },
    });

    expect(state.staleReason).toBe('composer-changed');
    expect(capabilities(state).applyBlocker?.code).toBe('TARGET_CHANGED');
  });

  it("disables the previous work's apply button when the active conversation changes, keeping the text", () => {
    const state = reduceSession(sessionWithPreview(), {
      type: 'mail-event',
      event: { type: 'active-thread-changed', previous: threadA, current: threadB },
    });

    expect(capabilities(state).applyBlocker?.code).toBe('THREAD_CHANGED');
    expect(state.preview?.text).toBe('Toplantıyı yarın yapabiliriz.');
  });

  it('loses the target when the draft closes', () => {
    const state = reduceSession(sessionWithPreview(), {
      type: 'mail-event',
      event: { type: 'composer-removed', ref: composerRef },
    });

    expect(capabilities(state).applyBlocker?.code).toBe('TARGET_MISSING');
  });

  it('keeps the work valid and applies it with the new ref when the same draft is later bound to a conversation', () => {
    const rebound = { ...composerRef, threadKey: 'thread-late' };
    const state = reduceSession(sessionWithPreview(), {
      type: 'mail-event',
      event: { type: 'composer-rebound', previous: composerRef, ref: rebound },
    });

    expect(state.staleReason).toBeNull();
    expect(capabilities(state).applyBlocker).toBeNull();
    const request = validateApply(state);
    expect(request.ok && request.value.target).toMatchObject({ composerRef: rebound });

    // Rebinding another draft does not affect this work.
    const other = reduceSession(sessionWithPreview(), {
      type: 'mail-event',
      event: {
        type: 'composer-rebound',
        previous: { ...composerRef, composerKey: 'c2' },
        ref: { ...composerRef, composerKey: 'c2', threadKey: 'thread-late' },
      },
    });
    const otherRequest = validateApply(other);
    expect(otherRequest.ok && otherRequest.value.target).toMatchObject({ composerRef });
  });

  it('clears the content when the account changes', () => {
    const state = reduceSession(sessionWithPreview(), {
      type: 'mail-event',
      event: { type: 'account-changed' },
    });

    expect(state.preview).toBeNull();
    expect(state.form.sourceText).toBe('');
    expect(state.thread).toBeNull();
    expect(state.staleReason).toBe('account-changed');
  });

  it('prepares no action after new content arrives in the conversation until the context is read again', () => {
    const snapshot = meetingThread();
    const context = buildContext(
      { expectedThread: threadA, snapshot, selection: DEFAULT_CONTEXT_SELECTION, includedBlocks: [] },
      testDependencies(),
    );
    const state = reduceAll(newSession(), [
      { type: 'form-changed', changes: { operation: 'reply', instruction: 'Onayla' } },
      { type: 'read-started', operationId: 'r1', subject: 'thread' },
      { type: 'thread-read', operationId: 'r1', snapshot, context },
      { type: 'mail-event', event: { type: 'thread-content-changed', threadRef: threadA } },
    ]);

    expect(state.contextStale).toBe(true);
    expect(capabilities(state).prepareBlocker?.code).toBe('CONTEXT_STALE');
  });

  it('refreshes the context with new content read in the background unless the user is working on a result', () => {
    const snapshot = meetingThread();
    const context = buildContext(
      { expectedThread: threadA, snapshot, selection: DEFAULT_CONTEXT_SELECTION, includedBlocks: [] },
      testDependencies(),
    );
    const refreshed = { ...snapshot, revision: 2 };
    const editing = reduceAll(newSession(), [
      { type: 'form-changed', changes: { operation: 'reply', instruction: 'Onayla' } },
      { type: 'read-started', operationId: 'r1', subject: 'thread' },
      { type: 'thread-read', operationId: 'r1', snapshot, context },
      { type: 'mail-event', event: { type: 'thread-content-changed', threadRef: threadA } },
      { type: 'thread-refreshed', snapshot: refreshed, context },
    ]);

    expect(editing.contextStale).toBe(false);
    expect(editing.threadSnapshot?.revision).toBe(2);
    expect(capabilities(editing).prepareBlocker).toBeNull();

    // While a preview exists, the context does not change silently; the preview stays valid and a "context is stale" warning appears.
    const read = reduceAll(newSession(), [
      { type: 'read-started', operationId: 'r1', subject: 'thread' },
      { type: 'thread-read', operationId: 'r1', snapshot, context },
      {
        type: 'source-loaded',
        operationId: null,
        text: selectionBinding.loadedText,
        binding: selectionBinding,
      },
    ]);
    const action = prepareFrom(read);
    const withPreview = reduceAll(read, [
      { type: 'action-prepared', action },
      {
        type: 'result-received',
        candidate: {
          requestId: action.requestId,
          sessionId: action.sessionId,
          formRevision: action.formRevision,
          text: 'Sonuç',
          sample: true,
        },
      },
      { type: 'mail-event', event: { type: 'thread-content-changed', threadRef: threadA } },
      { type: 'thread-refreshed', snapshot: refreshed, context },
    ]);
    expect(withPreview.phase.status).toBe('preview');
    expect(withPreview.threadSnapshot?.revision).toBe(1);
    expect(withPreview.contextStale).toBe(true);
  });

  it('clears the "conversation changed" warning when the user returns to the conversation the work belongs to', () => {
    const away = reduceAll(newSession(), [
      { type: 'form-changed', changes: { instruction: 'Taslak talimat' } },
      { type: 'mail-event', event: { type: 'active-thread-changed', previous: threadA, current: null } },
    ]);
    expect(away.staleReason).toBe('thread-changed');

    const back = reduceAll(away, [
      { type: 'mail-event', event: { type: 'active-thread-changed', previous: null, current: threadA } },
    ]);
    expect(back.staleReason).toBeNull();
    expect(back.form.instruction).toBe('Taslak talimat');
  });

  it('discards a partial context when the conversation changed during the read, keeping the user input', () => {
    const snapshot = { ...meetingThread(), ref: threadB };
    const state = reduceAll(newSession(), [
      { type: 'form-changed', changes: { instruction: 'Taslak talimat' } },
      { type: 'read-started', operationId: 'r1', subject: 'thread' },
      {
        type: 'thread-read',
        operationId: 'r1',
        snapshot,
        context: { ok: false, error: appError('THREAD_CHANGED') },
      },
    ]);

    expect(state.phase).toEqual({
      status: 'error',
      error: expect.objectContaining({ code: 'THREAD_CHANGED' }),
    });
    expect(state.threadSnapshot).toBeNull();
    expect(state.form.instruction).toBe('Taslak talimat');
  });

  it('does not bring back the result of a cancelled read', () => {
    const state = reduceAll(newSession(), [
      { type: 'read-started', operationId: 'r1', subject: 'thread' },
      { type: 'read-cancelled', operationId: 'r1' },
      {
        type: 'thread-read',
        operationId: 'r1',
        snapshot: meetingThread(),
        context: { ok: false, error: appError('CONTEXT_REQUIRED') },
      },
    ]);

    expect(state.threadSnapshot).toBeNull();
  });
});

describe('reduceSession — applying to the draft and undoing', () => {
  function applyOnce() {
    const state = sessionWithPreview();
    const request = validateApply(state);
    if (!request.ok) throw new Error(`cannot apply: ${request.error.code}`);
    const applying = reduceSession(state, {
      type: 'apply-started',
      operationId: 'w1',
      applyOperationId: request.value.applyOperationId,
    });
    return { state, request: request.value, applying };
  }

  it('validates the target for a selection replacement and creates a single apply request', () => {
    const { request } = applyOnce();

    expect(request.target).toEqual({
      mode: 'replace-selection',
      composerRef,
      expectedRevision: 5,
      selectionId: 'sel-1',
    });
    expect(request.text).toBe('Toplantıyı yarın yapabiliriz.');
  });

  it('does not start a second apply while one is in progress', () => {
    const { applying, request } = applyOnce();
    const again = reduceSession(applying, {
      type: 'apply-started',
      operationId: 'w2',
      applyOperationId: request.applyOperationId,
    });

    expect(again).toBe(applying);
    expect(capabilities(applying).isBusy).toBe(true);
  });

  it('enables undo after a successful write and disables it once the user types again', () => {
    const { applying, request } = applyOnce();
    const applied = reduceAll(applying, [
      { type: 'mail-event', event: { type: 'composer-changed', ref: composerRef, revision: 6 } },
      {
        type: 'apply-finished',
        operationId: 'w1',
        applyOperationId: request.applyOperationId,
        outcome: { status: 'applied', composerRevision: 6, undoId: 'u1' },
      },
    ]);

    expect(applied.phase.status).toBe('applied');
    expect(applied.staleReason).toBeNull();
    expect(capabilities(applied).canUndo).toBe(true);
    // The same preview cannot be written to the same target twice.
    expect(capabilities(applied).applyBlocker).not.toBeNull();

    const typed = reduceSession(applied, {
      type: 'mail-event',
      event: { type: 'composer-changed', ref: composerRef, revision: 7 },
    });
    expect(capabilities(typed).canUndo).toBe(false);
  });

  it('requires a new selection for a selection target after undo, while the same result can be reapplied to a body target', () => {
    const undo = (state: SessionState) => {
      const request = validateApply(state);
      if (!request.ok) throw new Error(request.error.code);
      return reduceAll(state, [
        { type: 'apply-started', operationId: 'w1', applyOperationId: request.value.applyOperationId },
        {
          type: 'apply-finished',
          operationId: 'w1',
          applyOperationId: request.value.applyOperationId,
          outcome: { status: 'applied', composerRevision: 6, undoId: 'u1' },
        },
        { type: 'undo-started', operationId: 'u-op' },
        { type: 'undo-finished', operationId: 'u-op', outcome: { status: 'undone', composerRevision: 7 } },
      ]);
    };

    const selection = undo(sessionWithPreview());
    expect(capabilities(selection).applyBlocker?.code).toBe('SELECTION_INVALID');

    const body = undo(
      reduceSession(sessionWithPreview(), {
        type: 'source-loaded',
        operationId: null,
        text: selectionBinding.loadedText,
        binding: {
          kind: 'draft',
          composerRef,
          composerRevision: 5,
          loadedText: selectionBinding.loadedText,
          canReplaceBody: true,
          canInsertIntoEmptyBody: false,
        },
      }),
    );
    const again = validateApply(body);
    expect(again.ok && again.value.target).toEqual({
      mode: 'replace-body',
      composerRef,
      expectedRevision: 7,
    });
  });

  it('does not retry the same action automatically after an uncertain write', () => {
    const { applying, request } = applyOnce();
    const uncertain = reduceSession(applying, {
      type: 'apply-finished',
      operationId: 'w1',
      applyOperationId: request.applyOperationId,
      outcome: { status: 'uncertain', error: appError('WRITE_UNCERTAIN') },
    });
    const dismissed = reduceSession(uncertain, { type: 'error-dismissed' });

    expect(uncertain.phase).toEqual({
      status: 'error',
      error: expect.objectContaining({ code: 'WRITE_UNCERTAIN' }),
    });
    expect(dismissed.preview?.text).toBe('Toplantıyı yarın yapabiliriz.');
    expect(validateApply(dismissed)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'WRITE_UNCERTAIN' }),
    });
  });

  it('skips a needless write when the preview equals the source', () => {
    const state = sessionWithPreview(selectionBinding.loadedText);

    expect(validateApply(state)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'RESULT_UNCHANGED' }),
    });
  });

  it('does not let text typed in the panel be written to the open draft automatically', () => {
    const loaded = reduceAll(newSession(), [
      { type: 'form-changed', changes: { sourceText: 'panel metni' } },
    ]);
    const action = prepareFrom(loaded);
    const state = reduceAll(loaded, [
      { type: 'action-prepared', action },
      {
        type: 'result-received',
        candidate: {
          requestId: action.requestId,
          sessionId: 's1',
          formRevision: action.formRevision,
          text: 'Panel metni.',
          sample: true,
        },
      },
    ]);

    expect(capabilities(state).applyTarget).toBeNull();
    expect(capabilities(state).applyBlocker?.code).toBe('TARGET_MISSING');
  });
});
