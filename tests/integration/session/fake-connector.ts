import {
  appError,
  err,
  isComposerTarget,
  ok,
  type ApplyRequest,
  type ComposerRef,
  type MailConnector,
  type MailEvent,
  type MailScope,
  type PageFeatures,
  type PageState,
  type ThreadRef,
  type ThreadSnapshot,
} from '@writehand/contracts';

import { meetingThread, scopeA, threadA } from '../../fixtures/synthetic-mail/threads';

/**
 * An in-memory fake mail connector. Used to verify that the controllers follow
 * the contract without a real page.
 */
export class FakeConnector implements MailConnector {
  readonly providerId = 'fake';
  readonly listeners = new Set<(event: MailEvent) => void>();
  readonly applied: ApplyRequest[] = [];
  scope: MailScope = scopeA;
  thread: ThreadRef | null = threadA;
  composer: ComposerRef = { scope: scopeA, composerKey: 'c1', threadKey: threadA.threadKey };
  draftText = 'toplantı yarın olsun mu';
  revision = 3;
  selection: { start: number; end: number } | null = { start: 0, end: 8 };
  threadSnapshot: ThreadSnapshot = meetingThread();
  readDelayMs = 0;
  /** Read mode in an Office add-in: no draft is open. */
  hasComposer = true;
  features: PageFeatures | undefined = undefined;

  getPageState(): PageState {
    return {
      support: 'ready',
      scope: this.scope,
      activeThread: this.thread,
      composers: this.hasComposer ? [this.composer] : [],
      ...(this.features === undefined ? {} : { features: this.features }),
    };
  }

  async readThread(ref: ThreadRef, signal: { aborted: boolean }) {
    if (this.readDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.readDelayMs));
    }
    if (signal.aborted) {
      return err(appError('READ_CANCELLED'));
    }
    if (this.thread === null || ref.threadKey !== this.thread.threadKey) {
      return err(appError('THREAD_CHANGED'));
    }
    return ok({ ...this.threadSnapshot, ref });
  }

  async readComposer(ref: ComposerRef) {
    if (ref.composerKey !== this.composer.composerKey) {
      return err(appError('TARGET_MISSING'));
    }
    return ok({
      ref,
      revision: this.revision,
      capturedAt: '2026-10-13T10:00:00.000Z',
      editableText: this.draftText,
      canReplaceBody: true,
      canReplaceSelection: true,
      canInsertIntoEmptyBody: this.draftText.trim() === '',
      containsRichContent: false,
    });
  }

  async captureDraftSelection(ref: ComposerRef) {
    if (this.selection === null) {
      return ok(null);
    }
    return ok({
      selectionId: 'sel-1',
      composerRef: ref,
      composerRevision: this.revision,
      start: this.selection.start,
      end: this.selection.end,
      text: this.draftText.slice(this.selection.start, this.selection.end),
    });
  }

  async readSelectedMessageText(ref: ThreadRef) {
    return ok({ threadRef: ref, messageKey: 'm2', text: 'Thursday works for me.' });
  }

  subscribe(listener: (event: MailEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: MailEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /** Simulates the user typing in the draft. */
  userTypes(text: string) {
    this.draftText += text;
    this.revision += 1;
    this.emit({ type: 'composer-changed', ref: this.composer, revision: this.revision });
  }

  async applyText(request: ApplyRequest) {
    if (!isComposerTarget(request.target)) {
      if (this.features?.createReply !== true) {
        return { status: 'rejected' as const, error: appError('WRITE_UNSUPPORTED') };
      }
      this.applied.push(request);
      return { status: 'applied' as const, composerRevision: null, undoId: null };
    }
    if (request.target.expectedRevision !== this.revision) {
      return { status: 'rejected' as const, error: appError('TARGET_CHANGED') };
    }
    this.applied.push(request);
    this.revision += 1;
    this.emit({ type: 'composer-changed', ref: this.composer, revision: this.revision });
    return { status: 'applied' as const, composerRevision: this.revision, undoId: 'undo-1' };
  }

  async undoChange() {
    this.revision += 1;
    return { status: 'undone' as const, composerRevision: this.revision };
  }

  dispose() {
    this.listeners.clear();
  }
}
