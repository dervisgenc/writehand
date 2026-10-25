import type { QuickAction } from '@writehand/session';

/**
 * The compose ribbon menu's commands. Each opens the task pane at `taskpane.html?command=<name>`
 * and the pane starts that operation on the draft, as the extension's toolbar buttons do: an
 * Outlook task pane has no other way to learn which command opened it.
 */
export const PANE_COMMANDS = {
  revise: { operation: 'revise' },
  // The pane waits for a language; the menu cannot list the user's favourites.
  translate: { operation: 'translate', language: null },
  // A reply draft makes this a reply.
  write: { operation: 'compose' },
} as const satisfies Readonly<Record<string, QuickAction>>;

export type PaneCommand = keyof typeof PANE_COMMANDS;

export const PANE_COMMAND_PARAMETER = 'command';

/** The operation the pane's address asks for; Outlook adds parameters of its own, which are ignored. */
export function paneCommand(search: string): QuickAction | null {
  const name = new URLSearchParams(search).get(PANE_COMMAND_PARAMETER);
  return name !== null && Object.hasOwn(PANE_COMMANDS, name) ? PANE_COMMANDS[name as PaneCommand] : null;
}
