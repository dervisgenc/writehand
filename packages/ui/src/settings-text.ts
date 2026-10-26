import type { Theme } from '@writehand/contracts';

/** Text of the shared settings form: languages, standing writing instructions and preferences. */
export interface SettingsFormText {
  readonly languagesTitle: string;
  readonly languagesDescription: string;
  readonly uiLanguage: string;
  /** The "Automatic" option; languages are shown by their native names (`UI_LANGUAGE_NAMES`). */
  readonly uiLanguageAuto: string;
  readonly targetLanguage: string;
  readonly targetLanguageHint: string;
  readonly favoriteLanguages: string;
  readonly favoriteLanguagesHint: string;
  readonly addLanguage: string;
  readonly removeLanguage: (language: string) => string;
  readonly favoritesFull: string;
  readonly instructionsTitle: string;
  readonly instructionsDescription: string;
  readonly instructionsLabel: string;
  readonly instructionsPlaceholder: string;
  readonly instructionsExamplesLabel: string;
  readonly instructionsExamples: readonly string[];
  readonly instructionsCount: (count: number, limit: number) => string;
  readonly preferencesTitle: string;
  readonly preferencesDescription: string;
  readonly tone: string;
  readonly theme: string;
  readonly themeOptions: Readonly<Record<Theme, string>>;
  readonly themeHint: string;
  readonly defaultsNote: string;
}
