import { appError, err, ok, type AppError, type Result } from '@writehand/contracts';

/**
 * Writes to the clipboard on a user click: plain text, plus HTML for formatted content. Outlook
 * on the web blocks the Clipboard API in add-in frames; then the result stays selectable in the
 * pane and the user copies it with Ctrl+C.
 */
export async function copyText(content: {
  text: string;
  html: string | null;
}): Promise<Result<void, AppError>> {
  if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
    return err(appError('CLIPBOARD_UNAVAILABLE'));
  }
  try {
    if (content.html !== null && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([content.text], { type: 'text/plain' }),
          'text/html': new Blob([content.html], { type: 'text/html' }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(content.text);
    }
    return ok(undefined);
  } catch {
    return err(appError('CLIPBOARD_UNAVAILABLE'));
  }
}
