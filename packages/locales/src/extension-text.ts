import type { HostOperatingSystem, SiteId, Theme } from '@writehand/contracts';
import type { UiText } from '@writehand/ui';

export type PopupStatusKey =
  'ready' | 'waiting' | 'unsupported' | 'disabled' | 'not-mail-site' | 'unreachable' | 'checking';

/** All of the extension's user-facing text: panel, toolbar popup and settings. */
export interface ExtensionText {
  /** Description shown in the browser's extension list and the store (at most 132 characters). */
  readonly description: string;
  readonly ui: UiText;
  readonly popup: {
    readonly title: string;
    readonly statuses: Readonly<Record<PopupStatusKey, string>>;
    readonly openPanel: string;
    readonly openSettings: string;
    readonly siteAccessMissing: string;
    readonly developmentBuild: string;
    /** Shown while the helper app is not connected; leads to the welcome wizard. */
    readonly setupNeeded: string;
    readonly finishSetup: string;
  };
  readonly options: {
    readonly title: string;
    readonly subtitle: string;
    readonly preferencesTitle: string;
    readonly preferencesDescription: string;
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
    readonly languagesTitle: string;
    readonly languagesDescription: string;
    readonly instructionsTitle: string;
    readonly instructionsDescription: string;
    readonly instructionsLabel: string;
    readonly instructionsPlaceholder: string;
    readonly instructionsExamplesLabel: string;
    readonly instructionsExamples: readonly string[];
    readonly instructionsCount: (count: number, limit: number) => string;
    readonly tone: string;
    readonly theme: string;
    readonly themes: Readonly<Record<Theme, string>>;
    readonly themeOptions: Readonly<Record<Theme, string>>;
    readonly themeHint: string;
    /** The mail services by the names their makers use in this language. */
    readonly siteNames: Readonly<Record<SiteId, string>>;
    readonly siteEnabled: (site: string) => string;
    readonly siteEnabledHint: (site: string) => string;
    readonly unsaved: string;
    readonly save: string;
    readonly saved: string;
    readonly saving: string;
    readonly defaultsNote: string;
    readonly privacyTitle: string;
    readonly privacyDescription: string;
    readonly privacyPoints: readonly string[];
  };
  readonly welcome: WelcomeText;
}

/** One way to connect, as the wizard's first step compares them. */
export interface ConnectionOptionText {
  readonly title: string;
  readonly points: readonly string[];
}

/** Welcome wizard: choosing and setting up a connection method (with the helper app if needed) and a trial run. */
export interface WelcomeText {
  readonly title: string;
  readonly subtitle: string;
  readonly stepsLabel: string;
  readonly steps: readonly [string, string, string];
  readonly back: string;
  readonly next: string;
  readonly intro: {
    readonly title: string;
    readonly lead: string;
    /** The API key method, which works in the browser alone. */
    readonly apiKey: ConnectionOptionText;
    /** The ChatGPT and Claude plans, which need the helper app. */
    readonly plan: ConnectionOptionText;
    readonly source: string;
    readonly doesTitle: string;
    readonly does: readonly string[];
    readonly doesNotTitle: string;
    readonly doesNot: readonly string[];
  };
  readonly install: {
    readonly title: string;
    readonly lead: string;
    readonly system: string;
    readonly command: string;
    /** One sentence explaining how to open a terminal or PowerShell and run the command. */
    readonly terminal: Readonly<Record<HostOperatingSystem, string>>;
    readonly waiting: string;
    readonly connected: (version: string) => string;
    readonly whatTitle: string;
    readonly what: readonly string[];
  };
  readonly tryIt: {
    readonly title: string;
    readonly lead: string;
    readonly sampleLabel: string;
    /** A short, made-up email with typos for the revise trial. */
    readonly sample: string;
    readonly run: string;
    readonly running: string;
    readonly success: string;
    readonly resultLabel: string;
    readonly openOutlook: string;
    readonly personalOutlook: string;
    readonly openGmail: string;
    readonly openSettings: string;
  };
}
