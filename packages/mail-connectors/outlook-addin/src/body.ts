import type { TextBlock } from '@writehand/contracts';
import {
  composerFingerprint,
  createMailMarkupClassifier,
  extractTextBlocks,
  MAIL_QUOTE_START_SELECTORS,
  MAIL_SIGNATURE_SELECTORS,
  readComposerAnatomy,
  WORD_MAIL_QUOTE_START_SELECTORS,
  WORD_MAIL_SIGNATURE_SELECTORS,
  type ComposerAnatomy,
} from '@writehand/mail-dom';

/** The same reading budget as the web connectors. */
export const MAX_TEXT_LENGTH = 250_000;

/**
 * Outlook's markers in the HTML dialects the clients return: the web and the new Outlook (the
 * same editor), and Word's HTML in classic Outlook for Windows.
 */
export const classifyBody = createMailMarkupClassifier({
  quoteStart: [...MAIL_QUOTE_START_SELECTORS, ...WORD_MAIL_QUOTE_START_SELECTORS],
  signature: [...MAIL_SIGNATURE_SELECTORS, ...WORD_MAIL_SIGNATURE_SELECTORS],
});

/** Style blocks of email HTML; the text readers skip them anyway. */
const STYLE_BLOCK = /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi;

/**
 * Parses body HTML from Office.js into a detached document. Scripts in it never run and its
 * images and links are never loaded; nothing of it is inserted into the task pane. Style blocks
 * are dropped first: the pane's Content Security Policy refuses them even in a detached document
 * and would report every email's styles as a violation.
 */
export function parseBody(html: string): HTMLElement {
  return new DOMParser().parseFromString(html.replace(STYLE_BLOCK, ''), 'text/html').body;
}

export interface DraftBody {
  readonly anatomy: ComposerAnatomy;
  /** Changes only when the user's region changes (text or the number of tables and images). */
  readonly fingerprint: string;
}

export function readDraftBody(html: string, isReply: boolean): DraftBody {
  const body = parseBody(html);
  return {
    anatomy: readComposerAnatomy(body, { classify: classifyBody, isReply }),
    fingerprint: composerFingerprint(body, classifyBody),
  };
}

export interface ReadBlocks {
  readonly blocks: readonly TextBlock[];
  readonly truncated: boolean;
}

/** The blocks of body HTML: the text, the signature and the earlier mail it quotes. */
export function readBlocks(html: string): ReadBlocks {
  const extraction = extractTextBlocks(parseBody(html), {
    classify: classifyBody,
    maxLength: MAX_TEXT_LENGTH,
  });
  return {
    blocks: extraction.blocks.map(({ kind, text, certainty }) => ({ kind, text, certainty })),
    truncated: extraction.truncated,
  };
}
