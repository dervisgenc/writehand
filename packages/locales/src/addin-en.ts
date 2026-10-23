import { PRODUCT_NAME } from '@writehand/contracts';

import type { AddinOwnText } from './addin-text';

export const addinEn: AddinOwnText = {
  manifest: {
    description:
      'Revise, translate, reply to and write emails in Outlook with your own AI key from Groq, OpenRouter or OpenAI. Results appear as a preview; nothing is written to your draft without your approval.',
    groupLabel: PRODUCT_NAME,
    buttonLabel: PRODUCT_NAME,
    buttonTooltip: `Open ${PRODUCT_NAME} to revise, translate or write this email. Nothing is written or sent without your approval.`,
  },
  pane: {
    settings: 'Settings',
    back: 'Back',
    loading: 'Loading…',
    noItem: 'Select an email or open a draft to start.',
    outsideOutlook: `${PRODUCT_NAME} runs inside Outlook. Open it with the ${PRODUCT_NAME} button of an email or a draft.`,
  },
  firstRun: {
    title: `Welcome to ${PRODUCT_NAME}`,
    lead: 'Connect your own API key once in this Outlook app. Groq and OpenRouter offer free models.',
    steps: ['Connect an API key', 'Try it'],
    success: 'Everything works. Select an email or open a draft and choose what to do.',
    start: 'Start',
  },
  ai: {
    description: 'Write emails with your own API key from Groq, OpenRouter or OpenAI.',
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
      'The ChatGPT and Claude plans are not available in Outlook yet. Connect an API key instead.',
  },
  privacyPoints: [
    `${PRODUCT_NAME}’s page is loaded from its web address each time it opens, and Microsoft’s Office.js from Microsoft. No email content or key is sent to either.`,
    'Your preferences and the encrypted API key are stored only in this Outlook app on this device. They are not synchronized, not stored in your mailbox and not shared with the browser extension.',
    `${PRODUCT_NAME} reads only the open email or draft, while you use it, and keeps it in memory.`,
    'Text is sent to the AI provider you chose (Groq, OpenRouter or OpenAI) only when you select Revise, Translate, Write or Draft reply.',
    'Results appear as a preview first and are written to your draft only after you approve them.',
    `${PRODUCT_NAME} never sends email; a reply it opens is a draft.`,
  ],
};
