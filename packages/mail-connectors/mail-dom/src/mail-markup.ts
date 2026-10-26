import type { ElementRole } from './extract-text-blocks';

/**
 * Markers that mail clients write into the email HTML itself, not into their interface: where
 * earlier mail starts in a reply and where the signature is. Both Outlook connectors read them,
 * on the page (`outlook-web`) and in the body HTML Office.js returns (`outlook-addin`).
 *
 * When displaying mail, Outlook prefixes ids in the email HTML with `x_` (`x_x_` inside a
 * quote), so ids are matched by suffix. Whether a marker was checked on a real client is
 * recorded where it is used (`outlook-web/src/discovery/selectors.ts`, `docs/OUTLOOK_ADDIN.md`).
 */
export const MAIL_QUOTE_START_SELECTORS: readonly string[] = [
  '[id$="divRplyFwdMsg"]',
  '[id$="appendonsend"]',
  '[id*="OLK_SRC_BODY_SECTION"]',
  '[class*="mail-editor-reference-message-container"]',
  '.gmail_quote',
  '.x_gmail_quote',
  'blockquote[type="cite"]',
  '.moz-cite-prefix',
  '.x_moz-cite-prefix',
  '.yahoo_quoted',
  '.x_yahoo_quoted',
];

export const MAIL_SIGNATURE_SELECTORS: readonly string[] = [
  '#Signature',
  '[id$="x_Signature"]',
  '[id$="ms-outlook-mobile-signature"]',
  '.ms-outlook-signature',
  '.gmail_signature',
  '.x_gmail_signature',
];

/**
 * Bookmarks classic Outlook for Windows (Word's HTML) puts into a draft: the end of the part
 * the user writes, the start of the original message, and the automatic signature. Candidates
 * from Word's HTML output; not yet checked in a real classic Outlook.
 */
export const WORD_MAIL_QUOTE_START_SELECTORS: readonly string[] = [
  'a[name="_MailEndCompose"]',
  'a[name="_MailOriginal"]',
];

export const WORD_MAIL_SIGNATURE_SELECTORS: readonly string[] = ['a[name="_MailAutoSig"]'];

export interface MailMarkup {
  readonly quoteStart: readonly string[];
  readonly signature: readonly string[];
}

/** Classifies an element of email HTML by the markers above: quote start, signature or neither. */
export function createMailMarkupClassifier(markup: MailMarkup): (element: Element) => ElementRole {
  const quoteStart = markup.quoteStart.join(', ');
  const signature = markup.signature.join(', ');
  return (element) => {
    if (quoteStart !== '' && element.matches(quoteStart)) {
      return 'quote-start';
    }
    if (signature !== '' && element.matches(signature)) {
      return 'signature';
    }
    return null;
  };
}
