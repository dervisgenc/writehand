import type { PageTheme } from '@writehand/contracts';
import { isDarkBackground } from '@writehand/mail-dom';
import { createOfficeMailbox, type OfficeMailbox } from '@writehand/outlook-addin';

/** Everything the task pane takes from Office.js; the only place that touches `Office`. */
export interface OfficeHost {
  readonly mailbox: OfficeMailbox;
  /**
   * Office's namespace for this add-in's storage. Microsoft asks add-ins to key their storage
   * with it; it is undefined where storage is not partitioned (the webviews of Office on Windows).
   */
  readonly partitionKey: string | undefined;
  /** Outlook's display language (for example `tr-TR`), used for the "Automatic" interface language. */
  readonly displayLanguage: string | null;
  /** Outlook's theme colors (Mailbox 1.14); `null` where Outlook does not report them. */
  theme(): PageTheme | null;
  onThemeChanged(listener: () => void): () => void;
}

/** Office.js normally answers at once; a page opened outside Office never gets an answer. */
const READY_TIMEOUT_MS = 10_000;

function color(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const trimmed = value.trim();
  return /^[0-9a-f]{6}$/i.test(trimmed) ? `#${trimmed}` : trimmed;
}

/**
 * Waits for Office.js and returns the host, or `null` when the page does not run inside Outlook
 * (Office.js missing, another Office application, or no answer).
 */
export async function connectOffice(): Promise<OfficeHost | null> {
  if (typeof Office === 'undefined') return null;
  const info = await Promise.race([
    Office.onReady().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), READY_TIMEOUT_MS)),
  ]);
  if (info === null || info.host !== Office.HostType.Outlook || !Office.context.mailbox) return null;

  const supportsTheme = Office.context.requirements.isSetSupported('Mailbox', '1.14');
  return {
    mailbox: createOfficeMailbox(Office),
    partitionKey: Office.context.partitionKey ?? undefined,
    displayLanguage: Office.context.displayLanguage ?? null,
    theme() {
      // `isDarkTheme` is not supported in Outlook; the body colors tell light from dark.
      const theme = supportsTheme ? Office.context.officeTheme : undefined;
      const background = color(theme?.bodyBackgroundColor);
      if (theme === undefined || background === undefined) return null;
      const dark = isDarkBackground(background);
      if (dark === null) return null;
      return {
        scheme: dark ? 'dark' : 'light',
        colors: {
          background,
          text: color(theme.bodyForegroundColor),
          surface: color(theme.controlBackgroundColor),
        },
      };
    },
    onThemeChanged(listener) {
      if (!supportsTheme) return () => undefined;
      let active = true;
      Office.context.mailbox.addHandlerAsync(Office.EventType.OfficeThemeChanged, () => {
        if (active) listener();
      });
      return () => {
        active = false;
        Office.context.mailbox.removeHandlerAsync(Office.EventType.OfficeThemeChanged);
      };
    },
  };
}
