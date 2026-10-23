import type { ErrorCode } from '@writehand/contracts';
import type { AiText } from '@writehand/ui';

/**
 * Text of the Outlook add-in that the extension does not have. The panel, the settings form and
 * the trial run reuse the extension's text; `ai` and `errors` replace the sentences that speak
 * of the browser.
 */
export interface AddinOwnText {
  /** What Outlook shows for the add-in: in the add-in dialog and on the ribbon. */
  readonly manifest: {
    /** At most 250 characters. */
    readonly description: string;
    /** Ribbon group, at most 125 characters. */
    readonly groupLabel: string;
    /** Ribbon button, at most 125 characters. */
    readonly buttonLabel: string;
    /** Button tooltip, at most 250 characters. */
    readonly buttonTooltip: string;
  };
  readonly pane: {
    readonly settings: string;
    readonly back: string;
    readonly loading: string;
    /** A pinned pane while no email is selected. */
    readonly noItem: string;
    /** The page was opened outside Outlook, or Office.js did not load. */
    readonly outsideOutlook: string;
  };
  readonly firstRun: {
    readonly title: string;
    readonly lead: string;
    readonly steps: readonly [string, string];
    /** After the sample was revised. */
    readonly success: string;
    readonly start: string;
  };
  readonly ai: Pick<AiText, 'description' | 'apiNote' | 'keySaved' | 'apiPrivacy'>;
  readonly errors: Readonly<Partial<Record<ErrorCode, string>>>;
  readonly privacyPoints: readonly string[];
}
