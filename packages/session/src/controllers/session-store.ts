import { reduceSession, type SessionEvent, type SessionState } from '@writehand/core';

/**
 * Owns the state of the single panel session. State changes only through
 * `reduceSession`; starting new work recreates the session from scratch.
 */
export interface SessionStore {
  getState(): SessionState;
  dispatch(event: SessionEvent): void;
  replace(state: SessionState): void;
  subscribe(listener: (state: SessionState) => void): () => void;
}

export function createSessionStore(initial: SessionState): SessionStore {
  let state = initial;
  const listeners = new Set<(state: SessionState) => void>();

  const publish = (next: SessionState) => {
    if (next === state) {
      return;
    }
    state = next;
    for (const listener of listeners) {
      listener(state);
    }
  };

  return {
    getState: () => state,
    dispatch: (event) => publish(reduceSession(state, event)),
    replace: publish,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
