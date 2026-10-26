import type { MailConnector, ThreadSnapshot } from '@writehand/contracts';
import { EMPTY_HISTORY, recordSnapshot, type HistoryEntry, type MessageHistory } from '@writehand/core';

/** Access to the history of read messages; context building and the view use this interface. */
export interface MessageHistoryStore {
  entries(): readonly HistoryEntry[];
  /** Adds a user-requested read to the history (listeners are not notified). */
  record(snapshot: ThreadSnapshot): void;
  /** Reports the background reads made when the user opens a new message. */
  subscribe(listener: (snapshot: ThreadSnapshot) => void): () => void;
}

export interface MessageHistoryController extends MessageHistoryStore {
  dispose(): void;
}

export interface MessageHistoryDependencies {
  readonly connector: MailConnector;
  /** No message is read while the extension is disabled on this site. */
  readonly isEnabled: () => boolean;
  readonly debounceMs?: number;
  readonly readTimeoutMs?: number;
}

/**
 * Accumulates the messages the user opens in memory for the page session.
 * When the reading pane shows only the selected message, there is no other way
 * to reach messages of the same conversation opened earlier. The history is never
 * persisted or sent anywhere and is cleared when the account changes; opening a
 * message does not start an operation.
 */
export function createMessageHistory(deps: MessageHistoryDependencies): MessageHistoryController {
  const { connector } = deps;
  const debounceMs = deps.debounceMs ?? 400;
  const readTimeoutMs = deps.readTimeoutMs ?? 3_000;
  const listeners = new Set<(snapshot: ThreadSnapshot) => void>();
  let history: MessageHistory = EMPTY_HISTORY;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: AbortController | null = null;

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pending?.abort();
    pending = null;
  };

  const capture = async () => {
    timer = null;
    const thread = connector.getPageState().activeThread;
    if (thread === null || !deps.isEnabled()) {
      return;
    }
    pending?.abort();
    const abort = new AbortController();
    pending = abort;
    const timeout = setTimeout(() => abort.abort(), readTimeoutMs);
    const result = await connector.readThread(thread, abort.signal);
    clearTimeout(timeout);
    if (pending === abort) {
      pending = null;
    }
    if (!result.ok || abort.signal.aborted) {
      return;
    }
    history = recordSnapshot(history, result.value);
    for (const listener of listeners) {
      listener(result.value);
    }
  };

  const schedule = () => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => void capture(), debounceMs);
  };

  const unsubscribe = connector.subscribe((event) => {
    switch (event.type) {
      case 'account-changed':
        // Messages from the previous account must never carry over into the new account's context.
        cancel();
        history = EMPTY_HISTORY;
        break;
      case 'active-thread-changed':
        if (event.current !== null) {
          schedule();
        }
        break;
      case 'thread-content-changed':
        schedule();
        break;
      default:
        break;
    }
  });
  if (connector.getPageState().activeThread !== null) {
    schedule();
  }

  return {
    entries: () => history.entries,
    record(snapshot) {
      history = recordSnapshot(history, snapshot);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      unsubscribe();
      cancel();
      listeners.clear();
      history = EMPTY_HISTORY;
    },
  };
}
