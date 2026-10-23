import {
  PRODUCT_NAME,
  resolveUiLanguage,
  UI_LANGUAGES,
  type UiLanguage,
  type UiLanguagePreference,
} from '@writehand/contracts';

import { de } from './de';
import { en } from './en';
import { es } from './es';
import type { ExtensionText } from './extension-text';
import { fr } from './fr';
import { tr } from './tr';

const TEXTS: Readonly<Record<UiLanguage, ExtensionText>> = { tr, en, de, fr, es };

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

export type { ExtensionText, PopupStatusKey } from './extension-text';
export { countWith } from './plural';
export { de, en, es, fr, tr };
