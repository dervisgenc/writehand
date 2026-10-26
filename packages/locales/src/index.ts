import {
  PRODUCT_NAME,
  resolveUiLanguage,
  UI_LANGUAGES,
  type UiLanguage,
  type UiLanguagePreference,
} from '@writehand/contracts';

import { addinDe } from './addin-de';
import { addinEn } from './addin-en';
import { addinEs } from './addin-es';
import { addinFr } from './addin-fr';
import type { AddinOwnText } from './addin-text';
import { addinTr } from './addin-tr';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import type { ExtensionText } from './extension-text';
import { fr } from './fr';
import { tr } from './tr';

const TEXTS: Readonly<Record<UiLanguage, ExtensionText>> = { tr, en, de, fr, es };
const ADDIN_TEXTS: Readonly<Record<UiLanguage, AddinOwnText>> = {
  tr: addinTr,
  en: addinEn,
  de: addinDe,
  fr: addinFr,
  es: addinEs,
};

/** The UI language for the stored preference (including `auto`) and the browser languages. */
export function uiLanguageFor(
  preference: UiLanguagePreference,
  browserLanguages: readonly string[] = globalThis.navigator?.languages ?? [],
): UiLanguage {
  return resolveUiLanguage(preference, browserLanguages);
}

export function textFor(preference: UiLanguagePreference): ExtensionText {
  return TEXTS[uiLanguageFor(preference)];
}

type ManifestMessages = Record<'extName' | 'extDescription', { readonly message: string }>;

/**
 * Translations of the manifest name and description (`_locales/<language>/messages.json`).
 * The browser picks them by its own language; the build generates these files from here.
 */
export function manifestMessages(): Record<UiLanguage, ManifestMessages> {
  const messages = {} as Record<UiLanguage, ManifestMessages>;
  for (const language of UI_LANGUAGES) {
    messages[language] = {
      extName: { message: PRODUCT_NAME },
      extDescription: { message: TEXTS[language].description },
    };
  }
  return messages;
}

/** All of the Outlook add-in's user-facing text. */
export interface AddinText {
  /** The panel's text, with the API key and error sentences that speak of the browser replaced. */
  readonly ui: ExtensionText['ui'];
  /** The shared settings form and the save bar. */
  readonly options: ExtensionText['options'];
  /** The trial run on a made-up email, as in the extension's welcome wizard. */
  readonly tryIt: ExtensionText['welcome']['tryIt'];
  readonly addin: AddinOwnText;
}

/** `languages`: Outlook's display language first, then the webview's languages, for "Automatic". */
export function addinTextFor(preference: UiLanguagePreference, languages?: readonly string[]): AddinText {
  const language = uiLanguageFor(preference, languages);
  const base = TEXTS[language];
  const addin = ADDIN_TEXTS[language];
  return {
    ui: {
      ...base.ui,
      ai: { ...base.ui.ai, ...addin.ai },
      errors: { ...base.ui.errors, ...addin.errors },
    },
    options: base.options,
    tryIt: base.welcome.tryIt,
    addin,
  };
}

export type { AddinOwnText } from './addin-text';
export type { ExtensionText, PopupStatusKey } from './extension-text';
export { countWith } from './plural';
export { de, en, es, fr, tr };
