import { PRODUCT_NAME } from '@writehand/contracts';
import type { AiText } from '@writehand/ui';

export const aiEn: AiText = {
  title: 'AI connection',
  description:
    'Write emails with your own API key from Groq, OpenRouter or OpenAI, your ChatGPT plan or Claude Code on this computer.',
  chatgpt: 'ChatGPT plan',
  apiKey: 'API key',
  claudeCode: 'Claude plan',
  methodHints: {
    chatgpt: 'With your Plus, Pro or Business plan',
    'api-key': 'Groq, OpenRouter or OpenAI; free models available',
    'claude-code': 'With Claude Code on this computer',
  },
  methodLabel: 'Connection method',
  recommended: 'Recommended',
  experimental: 'Experimental',
  needsHelper: 'Needs the helper app',
  helperRequired: `This method runs in the ${PRODUCT_NAME} helper app, which is not connected yet. Install it with the setup wizard, or choose API key, which works without it.`,
  statusReady: 'Ready',
  statusSetup: 'Setup needed',
  statusAction: 'Connection needed',
  guide: {
    title: 'Connection guide',
    intro:
      'Set up one of the methods below to generate text. Each section lists what you need and the steps to follow.',
    requirementsLabel: 'You need',
    stepsLabel: 'Steps',
    notesLabel: 'Good to know',
    current: 'Selected',
    methods: {
      chatgpt: {
        title: 'ChatGPT plan',
        summary: 'Generates with the usage included in your ChatGPT plan.',
        requirements: [
          'A ChatGPT Plus or Pro subscription, or a Business, Enterprise or Edu workspace. Free accounts do not support plan usage.',
          `The ${PRODUCT_NAME} helper app on this computer.`,
        ],
        steps: [
          'Choose ChatGPT plan as the method.',
          'Select “Continue with ChatGPT”. In the page that opens, choose your account and allow access.',
          'For a Business, Enterprise or Edu workspace, select “Sign in through Codex” instead and choose the workspace.',
          'Come back to this page; the account shows “Connected · Ready to generate text”. Then choose a model.',
        ],
        notes: [
          'Usage counts against your ChatGPT plan limits. You can follow it in ChatGPT → Settings → Usage.',
          'If you just upgraded your plan, it may take a few minutes to become active.',
          'Continue with ChatGPT currently serves Plus and Pro plans; on work accounts an organization policy blocks it. Sign in through Codex uses the sign-in of OpenAI’s Codex app instead. It is experimental: OpenAI does not document it for other apps and may change it.',
          'With Sign in through Codex, usage counts against your plan’s limits, which ChatGPT shares with Codex and other work features. On Business workspaces, credits can keep you going once the weekly limit is reached; workspace owners add them in the workspace billing settings.',
          'You can remove access at any time in ChatGPT → Settings → Security and login → Sign in with ChatGPT.',
        ],
      },
      'api-key': {
        title: 'API key',
        summary:
          'Generates with your own key from Groq, OpenRouter or OpenAI, directly from this browser. No helper app is needed.',
        requirements: [
          'An API key from Groq, OpenRouter or OpenAI. Groq’s free plan and OpenRouter’s free models need no payment method.',
        ],
        steps: [
          'Choose API key as the method, then the provider.',
          'Create a key on the provider’s website (links below) and paste it.',
          'Select “Connect key” and allow the browser to connect to the provider.',
          'Choose a model. With Groq, OpenAI’s free open-weight model openai/gpt-oss-120b is selected for you.',
        ],
        notes: [
          'Groq’s free plan has rate limits per minute and per day. A long conversation can exceed them; remove some context messages or try again later.',
          'On OpenRouter, free models are listed first. Your OpenRouter privacy settings decide which providers may receive your text; some free models are only offered by providers that may keep prompts.',
          'Paid usage is billed by the provider, separately from any ChatGPT or Claude subscription. OpenAI models are always paid, so you choose the model yourself.',
          'The key is stored encrypted in this browser and sent only to its provider. It is never shown again; to change it, connect a new key.',
          'Anyone who can use your browser profile can generate text with the saved key. Prefer a key with a spending limit and remove it on shared computers.',
        ],
      },
      'claude-code': {
        title: 'Claude plan',
        summary: 'Uses Claude Code on your computer with your own Claude account.',
        requirements: [
          'A Claude Pro, Max, Team or Enterprise subscription.',
          'Claude Code installed on this computer and signed in with your Claude account.',
          `The ${PRODUCT_NAME} helper app. Installed after Claude Code, it finds Claude Code automatically.`,
        ],
        steps: [
          'Install Claude Code by following Anthropic’s official instructions.',
          'In a terminal, run `claude` and sign in to your Claude account with `/login`.',
          'Install the helper app; if you installed it earlier, install it again after Claude Code.',
          'Choose Claude plan as the method. Your account and plan appear here.',
        ],
        notes: [
          `${PRODUCT_NAME} never sees or stores your Claude password or session; you sign in and out through Claude Code.`,
          'Usage counts against your plan limit, which is shared with Claude Code.',
          'On Pro and Max plans, content may be used for model training unless you turned it off in your Claude privacy settings. Team and Enterprise plans are governed by commercial terms.',
          'If Claude Code is signed in with an API key, usage is billed to that API account.',
          'This method depends on Anthropic’s rules for third-party apps and is offered as experimental. It may stop working if those rules change.',
        ],
        linkLabel: 'Claude Code setup guide',
      },
    },
    helper: {
      title: 'What is the helper app?',
      summary:
        'A small app on your computer that the ChatGPT and Claude plans need; API keys work without it.',
      requirements: ['macOS, Linux or Windows. No other software is needed.'],
      steps: [
        'Open the setup wizard from Settings → Helper app and run the one-line command it shows.',
        'The helper app appears as connected within a few seconds; then choose a method here.',
      ],
      notes: [
        'ChatGPT sign-in details are kept in a protected file only you can access, not in the browser.',
        'The helper app runs only when you ask for text; it never reads or sends email in the background.',
      ],
    },
  },
  connect: 'Continue with ChatGPT',
  codexConnect: 'Sign in through Codex',
  codexHint:
    'For ChatGPT Business, Enterprise and Edu workspaces. Uses the sign-in of OpenAI’s Codex app; Codex does not need to be installed. Experimental.',
  codexSignIn: 'Codex sign-in',
  codexConnectionHelp:
    'This connection uses the Codex sign-in. Usage counts against your plan’s limits shared with Codex; on Business workspaces, credits can keep you going once they run out. You can end the session by removing the account here.',
  codexWarningTitle: 'Before you sign in through Codex',
  codexWarning: [
    'Use it only for a ChatGPT Business, Enterprise or Edu workspace, where an organization policy blocks Continue with ChatGPT. For Plus and Pro, use Continue with ChatGPT.',
    `${PRODUCT_NAME} signs in with the sign-in of OpenAI’s Codex app. OpenAI has not published this sign-in for other apps: it can change or stop working at any time, and OpenAI may restrict accounts that use it this way.`,
    'Your workspace’s policies apply. If you are not sure you may use it, ask your workspace admin first.',
  ],
  codexWarningContinue: 'I understand, continue',
  addAccount: 'Add a different account or workspace',
  reconnect: 'Reconnect',
  disconnect: 'Disconnect',
  account: 'ChatGPT account',
  activeAccount: 'Account in use',
  useAccount: 'Use this account',
  savedConnection: 'Account connected. Select Use this account to generate with it.',
  renameAccount: 'Rename',
  accountName: 'Connection name',
  accountNameHint:
    'For example Personal or Work · Company name. The name is local to this device; up to 80 characters.',
  saveAccountName: 'Save name',
  removeAccount: 'Remove account',
  removeAccountTitle: 'Remove this connection?',
  removeAccountBody:
    'The account record and credentials will be removed from this device; revoking the OpenAI session will be attempted if present. Pending sign-in will be cancelled. Add the account again to use it later. Your ChatGPT account will not be deleted.',
  confirmRemoveAccount: 'Remove',
  savedAccountHint:
    'Select a saved connection to rename or remove it. Sign-in buttons use the selected connection’s account and workspace. To connect another account, use the add button below.',
  model: 'Model',
  refresh: 'Refresh',
  checking: 'Checking connection…',
  signingIn: 'Complete ChatGPT sign-in in the browser window.',
  cancel: 'Cancel',
  connected: 'Connected · Ready to generate text',
  disconnected: 'Signed out',
  registrationIncomplete:
    'Account connection is incomplete; its account details have not been verified yet. Try Continue with ChatGPT again using the same account and workspace as the first attempt.',
  generationUnavailable:
    'Account verified and plan permission granted; text generation is not ready yet. Select Refresh to reload the model list.',
  planDisabled:
    'Account verified; generation is not authorized. Plan usage requires an eligible Plus/Pro account and permission to use its plan. Signing in with a free account does not grant generation access.',
  planNote:
    'Eligible Plus and Pro accounts can use their plan allowance with Continue with ChatGPT. For Business, Enterprise and Edu workspaces, use Sign in through Codex.',
  apiNote: (provider) =>
    `Your key is stored encrypted in this browser and sent only to ${provider}. Paid usage is billed by ${provider}, separately from any ChatGPT or Claude subscription.`,
  claudeNote: `Claude Code installed on this computer runs with your own Claude account; usage counts against your Claude plan limits. ${PRODUCT_NAME} does not access or store your Claude credentials. Sign in and out through Claude Code.`,
  claudeAccount: 'Claude Code account',
  claudeNotInstalled:
    'Claude Code was not found on this computer. Install Claude Code, run the helper app’s install command again, then select Refresh.',
  claudeNotLoggedIn:
    'Claude Code is not signed in. Run claude in a terminal and sign in with /login, then select Refresh.',
  claudeApiBilling:
    'Claude Code is signed in with a method other than a Claude subscription, such as an API key; usage is billed to that account.',
  claudePrivacy:
    'When you request generation, your text, instructions and selected context are sent to Anthropic through Claude Code. Claude Code runs without tools, cannot access your files and keeps no session transcript. Pro and Max plans are governed by Anthropic’s consumer terms: unless you turned off model training in your Claude privacy settings, content may be used for training. Team and Enterprise plans are governed by commercial terms.',
  provider: 'Provider',
  providerHints: {
    groq: 'Fast, with free models such as OpenAI’s GPT-OSS on its free plan.',
    openrouter: 'Hundreds of models from many providers; some are free.',
    openai: 'GPT models from OpenAI; pay as you go.',
  },
  apiKeyLabel: (provider) => `${provider} API key`,
  createKey: (provider) => `Create a ${provider} API key`,
  saveKey: 'Connect key',
  removeKey: 'Remove key',
  keySaved: (provider) => `${provider} key saved, encrypted in this browser.`,
  replaceKeyHint: 'To use another key, paste it and select Connect key; it replaces the saved one.',
  keyFromOtherProvider: (provider) =>
    `This looks like a ${provider} key, so it was not sent. Choose ${provider} above, or paste a key for the selected provider.`,
  accessNeeded: (provider) =>
    `The browser does not let ${PRODUCT_NAME} connect to ${provider}. Allow access to use the saved key.`,
  grantAccess: 'Allow access',
  freeModels: 'Free models',
  paidModels: 'Paid models',
  apiPrivacy: (provider) =>
    `When you request generation, your text, instructions and selected context are sent from this browser directly to ${provider}, under ${provider}’s terms. The key never leaves this browser except to authenticate with ${provider}.`,
  manageUsage: 'Manage usage',
  connectionHelp:
    'Manage this connection in ChatGPT Settings → Security and login → Sign in with ChatGPT. It does not appear in Plugins. Work accounts are also subject to organization policy and plan eligibility.',
  welcome: 'You’re using your ChatGPT plan',
  welcomeBody: `Eligible generation in ${PRODUCT_NAME} uses your ChatGPT plan allowance or available credits. Manage this app’s usage in ChatGPT settings.`,
  gotIt: 'Got it',
  privacy:
    'When you request generation, your text, instructions and selected context are sent to OpenAI. The extension does not save them to disk. It cannot access your ChatGPT conversation history.',
  usePlan: 'Using ChatGPT plan',
  useApi: (provider) => `Using ${provider} API key`,
  useClaude: 'Using Claude plan',
  openSettings: 'AI settings',
  notReady: 'Connect an AI account to generate text',
};
