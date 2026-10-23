/**
 * Data that email connectors convert into a common shape. The IDs here are not
 * authorization tokens; they are local references that prevent using the wrong target.
 * DOM references stay inside the connector module.
 */

export interface MailScope {
  readonly providerId: string;
  /** Local, opaque ID that distinguishes the open mailbox account. Not an email address. */
  readonly accountScopeId: string;
  /** Changes when the page reloads; tabs never share the same value. */
  readonly documentInstanceId: string;
}

export interface ThreadRef {
  readonly scope: MailScope;
  readonly threadKey: string;
}

export interface ComposerRef {
  readonly scope: MailScope;
  /** Gets a new key if the editor is removed and recreated. */
  readonly composerKey: string;
  readonly threadKey: string | null;
}

export type TextBlockKind = 'body' | 'quote' | 'signature' | 'unknown';

export interface TextBlock {
  readonly kind: TextBlockKind;
  readonly text: string;
  readonly certainty: 'certain' | 'uncertain';
}

export type CoverageReason =
  'collapsed-messages' | 'virtualized-content' | 'read-limit' | 'unverified-history';

export interface MessageSnapshot {
  readonly messageKey: string;
  readonly senderLabel: string | null;
  /** ISO date only if it could be read reliably; otherwise `null`. */
  readonly sentAt: string | null;
  /** Date text as shown on screen. Never parsed and never used for ordering. */
  readonly sentAtText: string | null;
  readonly displayOrder: number;
  readonly blocks: readonly TextBlock[];
}

/**
 * Reading from the DOM does not prove access to the whole mail history, so there is
 * deliberately no `complete` coverage value. `visible-dom`: the messages a web mail page shows;
 * `item-body`: only the open item (the open email, or the earlier mail quoted in a draft), as
 * an Office add-in reads it.
 */
export interface ContextCoverage {
  readonly source: 'visible-dom' | 'item-body';
  readonly status: 'partial' | 'unknown';
  readonly readableMessageCount: number;
  readonly knownUnreadableMessageCount: number | null;
  readonly reasons: readonly CoverageReason[];
}

export interface ThreadSnapshot {
  readonly ref: ThreadRef;
  readonly revision: number;
  readonly capturedAt: string;
  readonly subject: string | null;
  readonly activeMessageKey: string | null;
  readonly messages: readonly MessageSnapshot[];
  readonly coverage: ContextCoverage;
}

export interface ComposerSnapshot {
  readonly ref: ComposerRef;
  readonly revision: number;
  readonly capturedAt: string;
  /** The region the user wrote that can be edited safely. */
  readonly editableText: string;
  readonly canReplaceBody: boolean;
  readonly canReplaceSelection: boolean;
  readonly canInsertIntoEmptyBody: boolean;
  readonly containsRichContent: boolean;
}

/** Ranges are UTF-16 indices into `editableText`. */
export interface DraftSelection {
  readonly selectionId: string;
  readonly composerRef: ComposerRef;
  readonly composerRevision: number;
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/** Selection from a read-only received message; grants no write access. */
export interface ReceivedMessageSelection {
  readonly threadRef: ThreadRef;
  readonly messageKey: string;
  readonly text: string;
}

export function isSameScope(a: MailScope, b: MailScope): boolean {
  return (
    a.providerId === b.providerId &&
    a.accountScopeId === b.accountScopeId &&
    a.documentInstanceId === b.documentInstanceId
  );
}

export function isSameThread(a: ThreadRef, b: ThreadRef): boolean {
  return a.threadKey === b.threadKey && isSameScope(a.scope, b.scope);
}

export function isSameComposer(a: ComposerRef, b: ComposerRef): boolean {
  return a.composerKey === b.composerKey && isSameScope(a.scope, b.scope);
}
