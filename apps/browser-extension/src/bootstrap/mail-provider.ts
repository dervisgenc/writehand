import type {
  ComposerRef,
  MailConnector,
  PageTheme,
  SelectorReport,
  SiteId,
  ThreadRef,
} from '@writehand/contracts';
import type { UiSkin } from '@writehand/session';

/** Marks the extension's own UI roots so they are excluded from page observation. */
export const OWN_UI_ATTRIBUTE = 'data-writehand-ui';
export const OWN_UI_SELECTOR = `[${OWN_UI_ATTRIBUTE}]`;

/**
 * A verified UI region next to which a launcher button is placed.
 * The button is not inserted into Outlook's DOM tree; it floats in the page body
 * relative to this element's position. `element` is used only by mounting code; it is
 * never passed to `core`, operation records or storage.
 */
export interface LauncherAnchor {
  readonly key: string;
  readonly element: HTMLElement;
  /** The button's corner relative to the element. */
  readonly placement: 'top-end' | 'bottom-end';
  /** The mail app's own controls at the end of the region; the button is placed before them. */
  readonly obstacles?: readonly HTMLElement[];
  readonly target:
    | { readonly kind: 'thread'; readonly thread: ThreadRef }
    | { readonly kind: 'composer'; readonly composer: ComposerRef };
}

/** Everything a mail environment provides to the extension: the connector and button positions. */
export interface MailPageProvider {
  readonly siteId: SiteId;
  readonly connector: MailConnector;
  locateLauncherAnchors(): readonly LauncherAnchor[];
  /** Content-free match counts for verifying selectors on the real page. */
  selectorReport(): readonly SelectorReport['entries'][number][];
  /** The mail app's current theme colors; `null` if they cannot be read. */
  readTheme(): PageTheme | null;
  /** The design language the extension UI follows on this mail service (default `fluent`). */
  readonly skin?: UiSkin;
}
