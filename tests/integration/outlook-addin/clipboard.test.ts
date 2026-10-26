import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyText } from '../../../apps/outlook-addin/src/platform/clipboard';

const RESULT = { text: 'Thursday at 14:00 works for me.', html: null };
const RICH = { text: 'Day | Time', html: '<table><tr><td>Day</td><td>Time</td></tr></table>' };

/** The new Outlook's add-in frame: the Clipboard API rejects every write. */
function refuseClipboardApi() {
  const denied = () => Promise.reject(new DOMException('Write permission denied.', 'NotAllowedError'));
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(denied), write: vi.fn(denied) },
  });
}

/** `execCommand('copy')` as Chromium runs it: a cancelable copy event, then the event's data is written. */
function installCopyCommand(allowed: boolean) {
  const written = new Map<string, string>();
  const execCommand = vi.fn((command: string) => {
    if (command !== 'copy' || !allowed) return false;
    const data = new Map<string, string>();
    const event = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { setData: (type: string, value: string) => data.set(type, value) },
    });
    document.body.dispatchEvent(event);
    if (event.defaultPrevented) data.forEach((value, type) => written.set(type, value));
    return true;
  });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
  return { written, execCommand };
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(document, 'execCommand');
});

describe('the task pane clipboard', () => {
  it('writes with the Clipboard API where the host allows it, without the copy command', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { execCommand } = installCopyCommand(true);

    expect(await copyText(RESULT)).toEqual({ ok: true, value: undefined });
    expect(writeText).toHaveBeenCalledWith(RESULT.text);
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('falls back to the copy command when the add-in frame refuses the Clipboard API', async () => {
    refuseClipboardApi();
    const { written } = installCopyCommand(true);

    expect(await copyText(RESULT)).toEqual({ ok: true, value: undefined });
    expect(Object.fromEntries(written)).toEqual({ 'text/plain': RESULT.text });
  });

  it('keeps formatted content as HTML through the copy command, with the plain text beside it', async () => {
    refuseClipboardApi();
    const { written } = installCopyCommand(true);

    await copyText(RICH);
    expect(Object.fromEntries(written)).toEqual({ 'text/plain': RICH.text, 'text/html': RICH.html });
  });

  it('reports the clipboard as unavailable when both ways are refused, and leaves no listener behind', async () => {
    refuseClipboardApi();
    installCopyCommand(false);
    const removed = vi.spyOn(document, 'removeEventListener');

    const result = await copyText(RESULT);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('CLIPBOARD_UNAVAILABLE');
    expect(removed).toHaveBeenCalledWith('copy', expect.any(Function));
    // A later copy anywhere in the pane is not taken over by the old content.
    const later = new Event('copy', { cancelable: true });
    Object.defineProperty(later, 'clipboardData', { value: { setData: vi.fn() } });
    document.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
  });
});
