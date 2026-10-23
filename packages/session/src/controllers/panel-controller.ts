import {
  isInstructionOperation,
  isSameThread,
  type ComposerRef,
  type TargetLanguage,
  type MailConnector,
  type MailEvent,
  type Operation,
  type Settings,
  type ThreadRef,
} from '@writehand/contracts';
import { createSession, usesConversationContext, type IdGenerator, type SessionState } from '@writehand/core';

import type { ActionController } from './action-controller';
import type { SessionStore } from './session-store';

export type OpenRequest =
  | { readonly origin: 'toolbar' }
  | { readonly origin: 'thread-launcher'; readonly thread: ThreadRef }
  | { readonly origin: 'composer-launcher'; readonly composer: ComposerRef };

/** An operation started directly from the toolbar on the compose area. */
export type QuickAction =
  | { readonly operation: 'revise' }
  /** Without a language the card asks for one; the selection and draft are captured first. */
  | { readonly operation: 'translate'; readonly language: TargetLanguage | null }
  | { readonly operation: 'reply' }
  | { readonly operation: 'compose' };

/**
 * Where the session is shown. The same session appears in the right-hand panel or
 * in the small card next to the compose area; never both at once.
 */
export type PanelSurface =
  | { readonly kind: 'closed' }
  | { readonly kind: 'panel' }
  | { readonly kind: 'inline'; readonly composerKey: string };

export interface PanelControllerDependencies {
  readonly store: SessionStore;
  readonly connector: MailConnector;
  readonly actions: ActionController;
  readonly ids: IdGenerator;
  readonly settings: () => Settings;
}

export interface PanelController {
  isOpen(): boolean;
  surface(): PanelSurface;
  open(request: OpenRequest): void;
  /**
   * Starts the operation directly from the compose area button and shows the result
   * in the card next to the draft. Revise and translate take the draft or selection
   * and run right away; for reply and new email the card waits for an instruction.
   */
  runQuickAction(composer: ComposerRef, action: QuickAction): Promise<void>;
  /** Continues the card's work in the right-hand panel. */
  expandToPanel(): void;
  close(): void;
  changeOperation(operation: Operation): void;
  setUseConversation(enabled: boolean): void;
  onSurfaceChange(listener: (surface: PanelSurface) => void): () => void;
  dispose(): void;
}

/** Does the session hold any of the user's content? */
function hasUserWork(state: SessionState): boolean {
  return (
    state.form.sourceText.trim() !== '' ||
    state.form.instruction.trim() !== '' ||
    state.preview !== null ||
    state.binding.kind !== 'panel'
  );
}

function threadOfComposer(composer: ComposerRef): ThreadRef | null {
  return composer.threadKey === null ? null : { scope: composer.scope, threadKey: composer.threadKey };
}

function isSameOptionalThread(a: ThreadRef | null, b: ThreadRef | null): boolean {
  return a === null || b === null ? a === b : isSameThread(a, b);
}

/**
 * Coordinates opening the panel, target selection and page events. The panel
 * opens only when the user presses a button; opening an email does not by itself
 * start a read or an operation.
 */
export function createPanelController(deps: PanelControllerDependencies): PanelController {
  const { store, connector, actions, ids } = deps;
  let surface: PanelSurface = { kind: 'closed' };
  const listeners = new Set<(surface: PanelSurface) => void>();

  const setSurface = (next: PanelSurface) => {
    const changed =
      next.kind !== surface.kind ||
      (next.kind === 'inline' && surface.kind === 'inline' && next.composerKey !== surface.composerKey);
    if (changed) {
      surface = next;
      for (const listener of listeners) {
        listener(surface);
      }
    }
  };

  const freshSession = (thread: ThreadRef | null, operation: Operation) => {
    const settings = deps.settings();
    store.replace(
      createSession({
        sessionId: ids.next(),
        thread,
        operation,
        defaults: { targetLanguage: settings.targetLanguage, tone: settings.tone },
      }),
    );
  };

  /**
   * Reads the conversation when the user asks for it (reply or "Also use the conversation").
   * A read cannot start while the session is busy, so this is called after the draft is read.
   */
  const readThreadIfNeeded = async () => {
    const state = store.getState();
    if (state.thread !== null && state.threadSnapshot === null && usesConversationContext(state)) {
      await actions.readThread();
    }
  };

  /**
   * Work belongs to the email the user is currently looking at. Switching to another
   * email restarts the session with that email; the user is not asked to confirm
   * "new work". The previous email's text and result are dropped.
   */
  const followThread = (thread: ThreadRef | null, operation: Operation): void => {
    const state = store.getState();
    if (isSameOptionalThread(state.thread, thread) && state.staleReason !== 'account-changed') {
      return;
    }
    actions.cancelPending();
    // Composing a new message belongs to no conversation; on moving to a conversation it becomes a reply.
    freshSession(thread, thread !== null && operation === 'compose' ? 'reply' : operation);
  };

  /**
   * Did the user switch to another email? If the session is not tied to a conversation
   * (e.g. a new message is being composed) and holds work, that work is kept.
   */
  const isNewConversation = (current: ThreadRef): boolean => {
    const state = store.getState();
    return state.thread !== null ? !isSameThread(state.thread, current) : !hasUserWork(state);
  };

  const unsubscribe = connector.subscribe((event: MailEvent) => {
    if (event.type === 'account-changed') {
      actions.cancelPending();
    }
    if (
      event.type === 'active-thread-changed' &&
      event.current !== null &&
      isNewConversation(event.current)
    ) {
      followThread(event.current, store.getState().form.operation);
      if (surface.kind === 'inline') {
        // The card belonged to the previous email's draft.
        setSurface({ kind: 'closed' });
      } else if (surface.kind === 'panel') {
        void readThreadIfNeeded();
      }
      return;
    }
    const previousOperation = store.getState().form.operation;
    store.dispatch({ type: 'mail-event', event });
    if (
      event.type === 'composer-rebound' &&
      previousOperation === 'compose' &&
      store.getState().form.operation === 'reply'
    ) {
      void readThreadIfNeeded();
    }
  });

  return {
    isOpen: () => surface.kind !== 'closed',
    surface: () => surface,

    open(request) {
      switch (request.origin) {
        case 'toolbar': {
          const { activeThread } = connector.getPageState();
          if (activeThread !== null) {
            followThread(activeThread, store.getState().form.operation);
          }
          break;
        }
        case 'thread-launcher':
          followThread(request.thread, 'reply');
          store.dispatch({ type: 'form-changed', changes: { operation: 'reply' } });
          break;
        case 'composer-launcher':
          followThread(threadOfComposer(request.composer), store.getState().form.operation);
          setSurface({ kind: 'panel' });
          // Capture the selection before focus moves to the panel and before the first await.
          void actions.loadFromComposer(request.composer).then(readThreadIfNeeded);
          return;
      }
      setSurface({ kind: 'panel' });
      void readThreadIfNeeded();
    },

    async runQuickAction(composer, action) {
      // Write belongs to this editor. A stale toolbar label must not suppress reply context.
      const operation =
        action.operation === 'compose' && composer.threadKey !== null ? 'reply' : action.operation;
      followThread(threadOfComposer(composer), operation);
      const language = action.operation === 'translate' ? action.language : null;
      store.dispatch({
        type: 'form-changed',
        changes: { operation, ...(language === null ? {} : { targetLanguage: language }) },
      });
      setSurface({ kind: 'inline', composerKey: composer.composerKey });
      // Capture the selection before focus moves to the card and before the first await.
      const loaded = await actions.loadFromComposer(composer);
      if (loaded !== 'loaded') {
        return;
      }
      // The quote may arrive during the asynchronous source read, before the session
      // has a binding to receive composer-rebound. Reconcile the returned snapshot too.
      const { binding } = store.getState();
      if (
        operation === 'compose' &&
        (binding.kind === 'draft' || binding.kind === 'draft-selection') &&
        binding.composerRef.threadKey !== null
      ) {
        store.dispatch({
          type: 'mail-event',
          event: { type: 'composer-rebound', previous: composer, ref: binding.composerRef },
        });
      }
      await readThreadIfNeeded();
      // The card waits for an instruction (reply, new email) or a language (translate without one).
      const awaitsInput =
        isInstructionOperation(operation) || (action.operation === 'translate' && action.language === null);
      if (!awaitsInput) {
        await actions.prepare();
      }
    },

    expandToPanel() {
      if (surface.kind === 'inline') {
        setSurface({ kind: 'panel' });
        void readThreadIfNeeded();
      }
    },

    close() {
      // Form data stays in memory; only the in-progress read and wait are cancelled.
      actions.cancelPending();
      setSurface({ kind: 'closed' });
    },

    changeOperation(operation) {
      store.dispatch({ type: 'form-changed', changes: { operation } });
      void readThreadIfNeeded();
    },

    setUseConversation(enabled) {
      store.dispatch({ type: 'form-changed', changes: { useConversation: enabled } });
      void readThreadIfNeeded();
    },

    onSurfaceChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    dispose() {
      unsubscribe();
      listeners.clear();
    },
  };
}
