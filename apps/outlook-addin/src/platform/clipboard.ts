import { appError, err, ok, type AppError, type Result } from '@writehand/contracts';

interface ClipboardContent {
  readonly text: string;
  readonly html: string | null;
}

/**
 * Writes to the clipboard on a user click: plain text, plus HTML for formatted content. The new
 * Outlook refuses the Clipboard API to add-in frames, so the older copy command, which needs only
 * the click, is tried next. If both fail, the result stays selectable in the pane and the user
 * copies it with Ctrl+C.
 */
export async function copyText(content: ClipboardContent): Promise<Result<void, AppError>> {
  if (await writeClipboard(content)) return ok(undefined);
  return copyCommand(content) ? ok(undefined) : err(appError('CLIPBOARD_UNAVAILABLE'));
}

async function writeClipboard(content: ClipboardContent): Promise<boolean> {
  if (typeof navigator === 'undefined' || navigator.clipboard === undefined) return false;
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
    return true;
  } catch {
    return false;
  }
}

/**
 * `execCommand('copy')` raises a copy event whose data the pane fills in; nothing is inserted into
 * the page or selected. The API is deprecated, but it is the clipboard write add-in frames allow.
 */
function copyCommand(content: ClipboardContent): boolean {
  if (typeof document === 'undefined') return false;
  let written = false;
  const fill = (event: ClipboardEvent) => {
    if (event.clipboardData === null) return;
    event.clipboardData.setData('text/plain', content.text);
    if (content.html !== null) event.clipboardData.setData('text/html', content.html);
    event.preventDefault();
    written = true;
  };
  document.addEventListener('copy', fill);
  try {
    return document.execCommand('copy') && written;
  } catch {
    return false;
  } finally {
    document.removeEventListener('copy', fill);
  }
}
