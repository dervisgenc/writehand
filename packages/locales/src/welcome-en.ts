import { PRODUCT_NAME } from '@writehand/contracts';

import type { WelcomeText } from './extension-text';

export const welcomeEn: WelcomeText = {
  title: `Welcome to ${PRODUCT_NAME}`,
  subtitle: 'Ready in three short steps',
  stepsLabel: 'Setup steps',
  steps: ['Welcome', 'Connection', 'Try it'],
  back: 'Back',
  next: 'Continue',
  intro: {
    title: 'Two ways to connect',
    lead: `${PRODUCT_NAME} works inside Outlook on the web and Gmail and writes with the AI provider you choose. Pick what suits you in the next step; you can change it at any time.`,
    apiKey: {
      title: 'Your own API key',
      points: [
        'Works right in the browser; there is nothing to install.',
        'Groq and OpenRouter offer free models; OpenAI is pay as you go.',
        'The key is stored encrypted in this browser and sent only to its provider.',
      ],
    },
    plan: {
      title: 'Your ChatGPT or Claude plan',
      points: [
        'Uses the subscription you already have: ChatGPT Plus or Pro, or Claude through Claude Code.',
        'Needs a small helper app on this computer, installed with one command and without administrator rights.',
        'Your sign-in stays on this computer, outside the browser. The helper app is open source.',
      ],
    },
    source: 'Source code on GitHub',
    doesTitle: 'What it does',
    does: [
      'Sends the text you choose to the provider you choose, only when you ask.',
      'Shows every result as a preview; your draft changes only when you approve it.',
    ],
    doesNotTitle: 'What it never does',
    doesNot: [
      'Send email.',
      'Read your mailbox in the background.',
      'Send anything to a server of ours; there is none.',
    ],
  },
  install: {
    title: 'Install the helper app',
    lead: 'This method needs a small helper app on this computer. One command installs it for your user account; no administrator rights are needed.',
    system: 'Your system',
    command: 'Install command',
    terminal: {
      darwin: 'Open Terminal (Applications → Utilities), paste the command and press Return.',
      linux: 'Open a terminal (often Ctrl+Alt+T), paste the command and press Enter.',
      windows: 'Open PowerShell (right-click Start and choose Terminal), paste the command and press Enter.',
    },
    waiting: 'Waiting for the helper app… It appears here a few seconds after the command finishes.',
    connected: (version) => `Helper app connected (version ${version}).`,
    whatTitle: 'What does the command do?',
    what: [
      'Downloads the program for your system from the latest release on GitHub.',
      'Checks its SHA-256 checksum and stops if it does not match.',
      'Installs it in your user folder, without administrator rights.',
      'Registers it with Firefox, Chrome, Edge and Brave so this extension can reach it.',
    ],
  },
  tryIt: {
    title: 'Try it',
    lead: 'Revise a made-up email to check that everything works. The text goes only to the provider you chose; nothing is sent as email.',
    sampleLabel: 'Sample email',
    sample:
      'Hi Sam,\n\nthanks for you’re message. I can send the report on thursday, but i need the latest numbers from you team first. Could you share them until wendesday?\n\nBest,\nAlex',
    run: 'Revise the sample',
    running: 'Revising…',
    success: 'Everything works. Open a draft in Outlook or Gmail; the toolbar appears next to it.',
    resultLabel: 'Result',
    openOutlook: 'Open Outlook',
    personalOutlook: 'Outlook.com (personal)',
    openGmail: 'Open Gmail',
    openSettings: 'Settings',
  },
};
