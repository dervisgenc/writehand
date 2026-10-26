import type { ContextCoverage, ThreadRef } from './mail';

/**
 * In this file, "context" is the structured data package of the messages the user chose
 * to use in an action. It is not a prompt, a summary or AI output.
 */

export interface ContextMessage {
  readonly messageKey: string;
  readonly senderLabel: string | null;
  readonly sentAt: string | null;
  readonly sentAtText: string | null;
  /** Subject of the conversation the message was read from. */
  readonly subject: string | null;
  /**
   * `current`: from the open conversation or one with the same subject (in context by
   * default). `other`: added by the user from another conversation.
   */
  readonly conversation: 'current' | 'other';
  /** The text is the user's edit from the context panel. */
  readonly edited: boolean;
  readonly text: string;
}

export type OmissionReason =
  'user-excluded' | 'signature' | 'duplicate-quote' | 'duplicate-message' | 'message-limit' | 'size-limit';

export interface ContextOmission {
  readonly messageKey: string;
  readonly blockIndex?: number;
  readonly reason: OmissionReason;
}

export type ContextOrdering = 'sent-at' | 'display-order';

export interface ContextSnapshot {
  readonly contextId: string;
  readonly threadRef: ThreadRef;
  readonly threadRevision: number;
  /** Key of the message being replied to if it is in the context; otherwise `null`. */
  readonly activeMessageKey: string | null;
  readonly ordering: ContextOrdering;
  readonly messages: readonly ContextMessage[];
  readonly coverage: ContextCoverage;
  readonly omissions: readonly ContextOmission[];
  readonly policyVersion: number;
  readonly createdAt: string;
}

/**
 * The user's choice in the context panel, stored as exceptions to the default rule.
 * Default: messages in the open conversation and with the same subject are in context;
 * messages read from other conversations are not. This way related messages read later
 * join the context automatically.
 */
export interface ContextSelection {
  /** Messages outside the default context that the user added. */
  readonly included: readonly string[];
  /** Messages the user removed from the context. */
  readonly excluded: readonly string[];
}

export const DEFAULT_CONTEXT_SELECTION: ContextSelection = Object.freeze({ included: [], excluded: [] });

/** Message text the user edited in the context panel; the original message is unchanged. */
export interface ContextEdit {
  readonly messageKey: string;
  readonly text: string;
}

/** Brings back a signature or quote block that was removed automatically. */
export interface BlockRef {
  readonly messageKey: string;
  readonly blockIndex: number;
}

/**
 * Informational records that describe the context's coverage. They are not errors;
 * conditions that block an action are expressed separately with `AppError`.
 */
export type ContextNotice =
  | { readonly kind: 'message-count'; readonly count: number }
  | { readonly kind: 'collapsed-unread'; readonly count: number }
  | { readonly kind: 'collapsed-unknown' }
  | { readonly kind: 'coverage-unverified' }
  /** Only the open item was read: the open email, or the earlier mail quoted in the draft. */
  | { readonly kind: 'open-item-only' }
  | { readonly kind: 'virtualized-content' }
  | { readonly kind: 'read-limit' }
  | { readonly kind: 'user-excluded'; readonly count: number }
  | { readonly kind: 'other-conversations'; readonly count: number }
  | { readonly kind: 'user-edited'; readonly count: number }
  | { readonly kind: 'message-limited'; readonly count: number }
  | { readonly kind: 'size-limited'; readonly count: number }
  | { readonly kind: 'signature-removed'; readonly count: number }
  | { readonly kind: 'duplicate-quote-removed'; readonly count: number }
  | { readonly kind: 'display-order-used' };
