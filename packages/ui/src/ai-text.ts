import type { AiMode, ApiProvider } from '@writehand/contracts';

/** One section of the connection guide. Text wrapped in `...` is shown as code. */
export interface AiGuideItem {
  readonly title: string;
  readonly summary: string;
  readonly requirements: readonly string[];
  readonly steps: readonly string[];
  readonly notes: readonly string[];
  /** Label of the official setup page's link (Claude Code); API key providers are linked by name. */
  readonly linkLabel?: string;
}

export interface AiGuideText {
  readonly title: string;
  readonly intro: string;
  readonly requirementsLabel: string;
  readonly stepsLabel: string;
  readonly notesLabel: string;
  readonly current: string;
  readonly methods: Readonly<Record<AiMode, AiGuideItem>>;
  readonly helper: AiGuideItem;
}

export interface AiText {
  readonly title: string;
  readonly description: string;
  readonly chatgpt: string;
  readonly apiKey: string;
  readonly claudeCode: string;
  /** Short description on each method card. */
  readonly methodHints: Readonly<Record<AiMode, string>>;
  readonly methodLabel: string;
  /** Method card badges: recommended (ChatGPT) and experimental (Claude). */
  readonly recommended: string;
  readonly experimental: string;
  /** On the ChatGPT and Claude cards: these methods run in the helper app. */
  readonly needsHelper: string;
  /** Shown in place of a helper app method's settings while the helper app is not connected. */
  readonly helperRequired: string;
  readonly statusReady: string;
  readonly statusSetup: string;
  readonly statusAction: string;
  readonly connect: string;
  /** Sign-in for work accounts that Sign in with ChatGPT does not serve (see `ChatGptSignIn`). */
  readonly codexConnect: string;
  readonly codexHint: string;
  /** Marks Codex sign-ins in the account list. */
  readonly codexSignIn: string;
  readonly codexConnectionHelp: string;
  /** Shown before a Codex sign-in starts; the user confirms or cancels it. */
  readonly codexWarningTitle: string;
  readonly codexWarning: readonly string[];
  readonly codexWarningContinue: string;
  readonly addAccount: string;
  readonly reconnect: string;
  readonly disconnect: string;
  readonly account: string;
  readonly activeAccount: string;
  readonly useAccount: string;
  readonly savedConnection: string;
  readonly renameAccount: string;
  readonly accountName: string;
  readonly accountNameHint: string;
  readonly saveAccountName: string;
  readonly removeAccount: string;
  readonly removeAccountTitle: string;
  readonly removeAccountBody: string;
  readonly confirmRemoveAccount: string;
  readonly savedAccountHint: string;
  readonly model: string;
  readonly refresh: string;
  readonly checking: string;
  readonly signingIn: string;
  readonly cancel: string;
  readonly connected: string;
  readonly disconnected: string;
  readonly registrationIncomplete: string;
  readonly generationUnavailable: string;
  readonly planDisabled: string;
  readonly planNote: string;
  readonly apiNote: (provider: string) => string;
  readonly claudeNote: string;
  readonly claudeAccount: string;
  readonly claudeNotInstalled: string;
  readonly claudeNotLoggedIn: string;
  readonly claudeApiBilling: string;
  readonly claudePrivacy: string;
  readonly provider: string;
  /** Short description below the provider choice. */
  readonly providerHints: Readonly<Record<ApiProvider, string>>;
  /** Variables are provider names, which are never translated. */
  readonly apiKeyLabel: (provider: string) => string;
  readonly createKey: (provider: string) => string;
  readonly saveKey: string;
  readonly removeKey: string;
  readonly keySaved: (provider: string) => string;
  readonly replaceKeyHint: string;
  /** The pasted key has another provider's format; it is not sent. */
  readonly keyFromOtherProvider: (provider: string) => string;
  readonly accessNeeded: (provider: string) => string;
  readonly grantAccess: string;
  /** Model groups when the provider marks free models. */
  readonly freeModels: string;
  readonly paidModels: string;
  readonly apiPrivacy: (provider: string) => string;
  readonly manageUsage: string;
  readonly connectionHelp: string;
  readonly welcome: string;
  readonly welcomeBody: string;
  readonly gotIt: string;
  readonly privacy: string;
  readonly usePlan: string;
  readonly useApi: (provider: string) => string;
  readonly useClaude: string;
  readonly openSettings: string;
  readonly notReady: string;
  readonly guide: AiGuideText;
}
