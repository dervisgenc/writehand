import type { AppError, Result } from '@writehand/contracts';

/**
 * The small slice of Office.js the connector needs, as promises and `Result`s. The real
 * adapter over Office.js lives in `office/`; tests use an in-memory fake of Office.js behind
 * the same adapter. Nothing here keeps or reports mail content; the connector decides what to
 * read and when.
 */
export interface OfficeMailbox {
  /** `Office.context.requirements.isSetSupported('Mailbox', version)`. */
  supports(version: MailboxVersion): boolean;
  /**
   * A value that tells mailbox accounts apart (the profile's address). The connector only
   * hashes it into an opaque scope; it is never stored, shown or sent.
   */
  accountHint(): string | null;
  /** The open item; `null` in a pinned task pane while no message is selected. */
  item(): OfficeItem | null;
  /** A pinned task pane's item changed (Mailbox 1.5). Resolves to the unsubscribe function. */
  onItemChanged(listener: () => void): Promise<() => void>;
}

export type MailboxVersion = '1.1' | '1.2' | '1.3' | '1.5' | '1.8' | '1.9' | '1.10' | '1.14';

export type OfficeItem = OfficeReadItem | OfficeComposeItem;

export interface OfficeReadItem {
  readonly mode: 'read';
  /** Exchange item ID of the open message. */
  readonly itemId: string | null;
  readonly conversationId: string | null;
  readonly subject: string | null;
  /** The sender's display name; never the address. */
  readonly senderName: string | null;
  /** ISO 8601 creation time of the message. */
  readonly sentAt: string | null;
  getBodyHtml(): Promise<Result<string, AppError>>;
  /** Opens a reply form with the HTML body; it is a draft, nothing is sent (32 KB at most). */
  displayReplyForm(html: string): Promise<Result<void, AppError>>;
}

export type ComposeType = 'reply' | 'forward' | 'newMail';

export type BodyFormat = 'html' | 'text';

/** What the write puts in the body: HTML for an HTML body, `text` for a plain-text body. */
export interface BodyContent {
  readonly html: string;
  readonly text: string;
}

export interface OfficeComposeItem {
  readonly mode: 'compose';
  /** `null` for a new message until it is saved; it changes if the user edits a reply's subject. */
  readonly conversationId: string | null;
  /** Reply, forward or new message (Mailbox 1.10); `null` where unknown. */
  composeType(): Promise<ComposeType | null>;
  bodyFormat(): Promise<Result<BodyFormat, AppError>>;
  getBodyHtml(): Promise<Result<string, AppError>>;
  /** The selected text in the body or subject (Mailbox 1.2); `null` without a selection. */
  getSelectedText(): Promise<
    Result<{ readonly text: string; readonly source: 'body' | 'subject' } | null, AppError>
  >;
  /** `Body.setSelectedDataAsync`: replaces the selection, or inserts where the cursor is. */
  replaceSelection(content: BodyContent, format: BodyFormat): Promise<Result<void, AppError>>;
  /** `Body.prependAsync`: inserts at the start of the body. */
  prepend(content: BodyContent, format: BodyFormat): Promise<Result<void, AppError>>;
  /** `Body.setAsync`: replaces the whole body (only used where there is no signature or quote). */
  setBody(content: BodyContent, format: BodyFormat): Promise<Result<void, AppError>>;
}
