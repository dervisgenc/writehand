import {
  appError,
  isSameThread,
  type AppError,
  type ApplyTarget,
  type ComposerRef,
  type MailConnector,
  type Result,
} from '@writehand/contracts';
import { isSessionBusy, validateApply, validateUndo, type IdGenerator } from '@writehand/core';

import { clipboardContent, withRichContent, type ClipboardContent } from './rich-content';
import type { SessionStore } from './session-store';

export interface ApplyControllerDependencies {
  readonly store: SessionStore;
  readonly connector: MailConnector;
  readonly ids: IdGenerator;
  readonly copyText: (content: ClipboardContent) => Promise<Result<void, AppError>>;
}

export type BindResult =
  | { readonly status: 'bound' }
  /** The draft has text: a separate "Replace the existing reply text" confirmation is required. */
  | { readonly status: 'needs-replace-confirmation'; readonly composer: ComposerRef }
  | { readonly status: 'failed'; readonly error: AppError };

export interface ApplyController {
  apply(): Promise<void>;
  undo(): Promise<void>;
  copy(): Promise<Result<void, AppError>>;
  /** Binds a reply preview without a target to an open draft in the same conversation. */
  bindComposer(composer: ComposerRef, allowReplace: boolean): Promise<BindResult>;
}

/**
 * Has the connector carry out writes and undos according to the rules. Knows
 * nothing about the DOM; the connector performs its own final validation.
 */
export function createApplyController(deps: ApplyControllerDependencies): ApplyController {
  const { store, connector, ids } = deps;

  return {
    async apply() {
      const state = store.getState();
      if (isSessionBusy(state)) {
        return;
      }
      const request = validateApply(state);
      if (!request.ok) {
        return;
      }
      const operationId = ids.next();
      store.dispatch({
        type: 'apply-started',
        operationId,
        applyOperationId: request.value.applyOperationId,
      });
      const outcome = await connector.applyText(withRichContent(request.value));
      store.dispatch({
        type: 'apply-finished',
        operationId,
        applyOperationId: request.value.applyOperationId,
        outcome,
      });
    },

    async undo() {
      const state = store.getState();
      if (isSessionBusy(state)) {
        return;
      }
      const request = validateUndo(state);
      if (!request.ok) {
        return;
      }
      const operationId = ids.next();
      store.dispatch({ type: 'undo-started', operationId });
      const outcome = await connector.undoChange(request.value.undoId);
      store.dispatch({ type: 'undo-finished', operationId, outcome });
    },

    copy() {
      const preview = store.getState().preview;
      if (preview === null || preview.text.trim().length === 0) {
        return Promise.resolve({ ok: false, error: appError('RESULT_INVALID') });
      }
      return deps.copyText(clipboardContent(preview.text));
    },

    async bindComposer(composer, allowReplace) {
      const state = store.getState();
      // A matching subject is not enough: the account and conversation relationship must be verified.
      if (
        state.thread === null ||
        composer.threadKey === null ||
        !isSameThread(state.thread, { scope: composer.scope, threadKey: composer.threadKey })
      ) {
        return { status: 'failed', error: appError('THREAD_CHANGED') };
      }
      const snapshot = await connector.readComposer(composer);
      if (!snapshot.ok) {
        return { status: 'failed', error: snapshot.error };
      }
      const { value } = snapshot;
      const isEmpty = value.editableText.trim().length === 0;
      let target: ApplyTarget;
      if (isEmpty && value.canInsertIntoEmptyBody) {
        target = { mode: 'insert-empty', composerRef: value.ref, expectedRevision: value.revision };
      } else if (!isEmpty && !allowReplace) {
        return { status: 'needs-replace-confirmation', composer };
      } else if (!isEmpty && value.canReplaceBody) {
        target = { mode: 'replace-body', composerRef: value.ref, expectedRevision: value.revision };
      } else {
        return { status: 'failed', error: appError('WRITE_UNSUPPORTED') };
      }
      store.dispatch({ type: 'target-bound', target });
      return { status: 'bound' };
    },
  };
}
