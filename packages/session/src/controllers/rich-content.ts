import type { ApplyRequest } from '@writehand/contracts';
import {
  isRichDocument,
  parseEmailMarkdown,
  renderEmailHtml,
  renderPlainText,
  renderVisibleText,
} from '@writehand/email-format';

/** Content sent to the clipboard or the draft: always plain text, plus HTML when formatted. */
export interface ClipboardContent {
  readonly text: string;
  readonly html: string | null;
}

/** The preview text (limited Markdown) in the form copied to the clipboard. */
export function clipboardContent(previewText: string): ClipboardContent {
  const document = parseEmailMarkdown(previewText);
  return {
    text: renderPlainText(document),
    html: isRichDocument(document) ? renderEmailHtml(document) : null,
  };
}

/**
 * Prepares the write request for its target. A selection within a sentence is written
 * as-is as plain text; when writing the whole draft, Markdown markers are stripped and
 * formatted content (lists, tables, charts) is supplied as HTML.
 */
export function withRichContent(request: ApplyRequest): ApplyRequest {
  if (request.target.mode === 'replace-selection') return request;
  const document = parseEmailMarkdown(request.text);
  const text = renderPlainText(document);
  if (!isRichDocument(document)) return { ...request, text };
  return {
    ...request,
    text,
    rich: { html: renderEmailHtml(document), visibleText: renderVisibleText(document) },
  };
}
