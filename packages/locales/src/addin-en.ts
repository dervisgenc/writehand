import { PRODUCT_NAME } from '@writehand/contracts';

import type { AddinOwnText } from './addin-text';

export const addinEn: AddinOwnText = {
  manifest: {
    description:
      'Revise, translate, reply to and write emails in Outlook with your ChatGPT or Claude plan through the Writehand helper app, or your own API key. Results appear as a preview; nothing is written to your draft without your approval.',
    groupLabel: PRODUCT_NAME,
    buttonLabel: PRODUCT_NAME,
    buttonTooltip: `Open ${PRODUCT_NAME} to revise, translate or write this email. Nothing is written or sent without your approval.`,
    commands: {
      reviseTooltip: `Revise the selected text or the draft in the ${PRODUCT_NAME} pane. You see a preview before anything is written.`,
      translateTooltip: `Translate the selected text or the draft in the ${PRODUCT_NAME} pane into the language you choose.`,
      writeTooltip: `Describe what you want to say in the ${PRODUCT_NAME} pane; it writes the email or the reply as a preview.`,
      open: `Open ${PRODUCT_NAME}`,
    },
  },
  pane: {
    settings: 'Settings',
    back: 'Back',
    loading: 'Loading…',
    noItem: 'Select an email or open a draft to start.',
    outsideOutlook: `${PRODUCT_NAME} runs inside Outlook. Open it with the ${PRODUCT_NAME} button of an email or a draft.`,
    helperUnavailable:
      'The ChatGPT and Claude plans run in the Writehand helper app, which serves this pane, but it did not answer. Run writehand outlook status in a terminal, or use an API key.',
  },
  firstRun: {
    title: `Welcome to ${PRODUCT_NAME}`,
    lead: 'Choose how to connect, once in this Outlook app: your ChatGPT or Claude plan through the helper app, or your own API key (Groq and OpenRouter offer free models).',
    steps: ['Choose a connection', 'Try it'],
    success: 'Everything works. Select an email or open a draft and choose what to do.',
    start: 'Start',
  },
  ai: {
    description:
      'Write emails with your ChatGPT or Claude plan through the helper app, or with your own API key from Groq, OpenRouter or OpenAI.',
    apiNote: (provider) =>
      `Your key is stored encrypted in this Outlook app and sent only to ${provider}. Paid usage is billed by ${provider}.`,
    keySaved: (provider) => `${provider} key saved, encrypted in this Outlook app.`,
    apiPrivacy: (provider) =>
      `When you request generation, your text, instructions and selected context are sent from this Outlook app directly to ${provider}, under ${provider}’s terms. The key never leaves this Outlook app except to authenticate with ${provider}.`,
  },
  errors: {
    CLIPBOARD_UNAVAILABLE:
      'Outlook did not allow writing to the clipboard. Select the text and press Ctrl+C.',
    AI_KEY_STORAGE_FAILED:
      'This Outlook app could not store or read the key securely, so nothing was saved. Try again; if it keeps failing, Outlook does not keep data for add-ins on this computer.',
    AI_HOST_UNAVAILABLE:
      'The Writehand helper app did not answer. Check that it runs (writehand outlook status), or connect an API key.',
  },
  privacyPoints: [
    `${PRODUCT_NAME}’s pane is served by its helper app on this computer; only Microsoft’s Office.js is loaded from the internet. No email content or key is sent to Microsoft.`,
    'Your preferences and an encrypted API key are stored only in this Outlook app on this device. ChatGPT sign-ins stay in the helper app on this computer, which the browser extension uses too. Nothing is stored in your mailbox.',
    `${PRODUCT_NAME} reads only the open email or draft, while you use it, and keeps it in memory.`,
    'Text is sent only when you select Revise, Translate, Write or Draft reply, and only to the method you chose: ChatGPT or Claude through the helper app, or Groq, OpenRouter or OpenAI with your key.',
    'Results appear as a preview first and are written to your draft only after you approve them.',
    `${PRODUCT_NAME} never sends email; a reply it opens is a draft.`,
  ],
};
