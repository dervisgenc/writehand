const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for HTML; the result never contains markup from the text. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

/** Plain text as HTML for a selection: escaped, with line breaks kept. */
export function inlineHtml(text: string): string {
  return text.split(/\r?\n/).map(escapeHtml).join('<br>');
}

/** Plain text as the block HTML Outlook's editor uses: one `<div>` per line, empty lines kept. */
export function blockHtml(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `<div>${line === '' ? '<br>' : escapeHtml(line)}</div>`)
    .join('');
}

/** UTF-8 size, as Office.js limits are stated in bytes (32 KB for a reply form). */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
