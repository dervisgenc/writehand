import { PRODUCT_NAME } from '@writehand/contracts';

import { aiEn } from './ai-en';
import type { ExtensionText } from './extension-text';
import { helperEn } from './helper-en';
import { countWith } from './plural';
import { welcomeEn } from './welcome-en';

const count = countWith('en');

export const en: ExtensionText = {
  description:
    'Revise, translate and write emails in Outlook on the web and Gmail with the AI you choose. Previewed first; no email is sent.',
  ui: {
    locale: 'en',
    ai: aiEn,
    helper: helperEn,
    panelTitle: 'Writing assistant',
    close: 'Close',
    threadLauncher: {
      label: 'Draft reply',
      tooltip: 'Draft a reply to this conversation and review the context',
      dragHint: 'Drag to move it.',
    },
    compose: {
      toolbarLabel: PRODUCT_NAME,
      reply: 'Write reply',
      replyTooltip: 'Write a reply draft for this conversation from your instruction',
      write: 'Write',
      writeTooltip: 'Describe what you want to say and get the email text',
      revise: 'Revise',
      reviseTooltip: 'Revise the selected text or the draft while keeping its meaning',
      translate: 'Translate',
      translateTooltip: (language) => `Translate into ${language}`,
      chooseLanguage: 'Choose translation language',
      openPanel: 'Open the writing assistant panel',
    },
    inline: {
      titles: {
        reply: 'Reply draft',
        revise: 'Suggested revision',
        translate: 'Translation',
        compose: 'Email draft',
      },
      instructionLabel: 'What would you like to say?',
      instructionPlaceholder: 'e.g. Thank them and say Thursday 2 pm works',
      write: 'Write',
      contextChip: (n) => `Context · ${count(n, 'message', 'messages')}`,
      contextReading: 'Reading context…',
      openPanel: 'Open in panel',
      translatedTo: (language) => `${language}`,
      translateLanguage: 'Target language',
      translate: 'Translate',
      translateAgain: 'Translate to this',
    },
    operations: { revise: 'Revise', translate: 'Translate', reply: 'Draft reply', compose: 'Write' },
    prepareButton: { revise: 'Revise', translate: 'Translate', reply: 'Draft reply', compose: 'Write text' },
    target: {
      label: 'Target',
      none: 'No draft selected — the result can only be copied',
      composer: 'Open draft',
      replyComposer: 'Open reply draft',
      receivedMessage: 'Received message (read-only)',
      newReply: 'New reply to this email',
    },
    source: {
      textLabel: 'Text',
      instructionLabel: 'Reply instruction',
      composeInstructionLabel: 'What do you want to write?',
      originLabel: 'Source',
      origins: {
        panel: 'Text typed here',
        draft: 'My draft',
        'draft-selection': 'Selected text',
        'received-message': 'Selection in received message',
      },
      edited: 'edited',
      placeholders: {
        revise: 'Type the text to revise or take it from the draft',
        translate: 'Type the text to translate or take it from the draft',
        reply: 'e.g. Calmly explain that this is not the case and suggest a meeting tomorrow',
        compose: 'e.g. Propose a short project meeting to the team on Thursday at 2 pm',
      },
      loadDraft: 'Take draft',
      loadSelection: 'Take selected text',
      loadReceivedSelection: 'Take selection from received message',
      confirmReplace: 'The text in the panel will be replaced.',
      confirm: 'Replace',
      cancel: 'Cancel',
      characters: (n, limit) => `${n.toLocaleString('en-US')} / ${limit.toLocaleString('en-US')}`,
    },
    options: {
      targetLanguage: 'Target language',
      tone: 'Tone',
      tones: { neutral: 'Neutral', formal: 'Formal', friendly: 'Friendly' },
      useConversation: 'Also use the conversation',
      languagePlaceholder: 'Choose or type a language',
      otherLanguage: 'Another language…',
      manageLanguages: 'Edit languages',
    },
    context: {
      title: 'Context',
      summary: (included, total) => `Using ${included} of ${total} messages`,
      refresh: 'Re-read conversation',
      read: 'Read conversation',
      reading: 'Reading conversation…',
      notLoaded: 'The conversation has not been read yet.',
      stale: 'The conversation has new content. Re-read it before preparing with this context.',
      activeLocked: 'The message being replied to cannot be removed from the context.',
      chooseReplyTarget:
        'Choose the message to reply to. It could not be determined reliably from the screen.',
      replyTarget: 'Reply to this message',
      unknownSender: 'Sender could not be read',
      currentGroup: 'This conversation',
      otherGroup: (n) => `Other opened emails (${n})`,
      otherHint: 'Emails you opened in other conversations. Check one to add it to the context.',
      includeMessage: (sender) => `Use the message from ${sender} in the context`,
      replyTargetBadge: 'Replying to',
      editedBadge: 'Edited',
      showBody: 'Show text',
      hideBody: 'Hide text',
      edit: 'Edit',
      editLabel: 'Text used in the context',
      save: 'Save',
      cancelEdit: 'Cancel',
      resetEdit: 'Restore original',
      omittedBlock: { signature: 'Signature removed', quote: 'Repeated quote removed' },
      includeBlock: 'Include again',
      counted: {
        'message-count': (n) => `The context has ${count(n, 'message', 'messages')}.`,
        'collapsed-unread': (n) =>
          `${count(n, 'message is', 'messages are')} collapsed; content was not read.`,
        'user-excluded': (n) => `You removed ${count(n, 'message', 'messages')} from the context.`,
        'other-conversations': (n) =>
          `${count(n, 'message was', 'messages were')} added from other conversations.`,
        'user-edited': (n) => `You edited the text of ${count(n, 'message', 'messages')}.`,
        'message-limited': (n) =>
          `${count(n, 'older message was', 'older messages were')} left out due to the message limit.`,
        'size-limited': (n) =>
          `${count(n, 'older message was', 'older messages were')} left out due to the length limit.`,
        'signature-removed': (n) =>
          `${count(n, 'signature was', 'signatures were')} removed from the context.`,
        'duplicate-quote-removed': (n) =>
          `${count(n, 'repeated quote was', 'repeated quotes were')} removed from the context.`,
      },
      plain: {
        'collapsed-unknown': 'Some messages may be collapsed; their number could not be determined.',
        'coverage-unverified':
          'Only messages open on screen are used; access to the full conversation cannot be verified.',
        'open-item-only': 'Only the open email and the earlier messages quoted in it are used.',
        'virtualized-content': 'Some messages may not be loaded on screen yet.',
        'read-limit': 'Some messages were not read due to the reading limit.',
        'display-order-used': 'Date information is missing; messages are used in on-screen order.',
      },
    },
    preview: {
      title: 'Result',
      regenerate: 'Regenerate',
      sampleLabel: 'Sample result — development mode',
      sampleShort: 'Sample',
      stale: 'The source changed. This preview can be copied but not applied to the draft.',
      unchanged: 'No changes in the text.',
      editSource: 'Edit source',
      showFormatted: 'Show formatted',
    },
    refine: {
      title: 'Change the result',
      kinds: {
        table: 'Make a table',
        list: 'Bullet points',
        chart: 'Add a chart',
        shorter: 'Shorten',
        formal: 'More formal',
        friendly: 'Friendlier',
      },
      customLabel: 'Change to make in the result',
      customPlaceholder: 'Ask for another change, e.g. remove the last paragraph',
      customSubmit: 'Apply the change',
    },
    apply: {
      scopeLabel: 'Part that will change',
      scopes: {
        'replace-selection': 'Selected text',
        'replace-body': 'Your written body (signature and previous messages are kept)',
        'insert-empty': 'Empty reply area',
        'create-reply': 'A new reply to this email, opened as a draft',
      },
      noTarget: 'No draft can be changed directly',
      formattingNote: 'The result is inserted as plain text; formatting in the changed part may be lost.',
      copy: 'Copy',
      apply: 'Apply to draft',
      undo: 'Undo last apply',
      replaceExistingReply: 'Replace the existing reply text',
      useOpenComposer: 'Use this reply draft',
      createReply: 'Open a reply with this text',
    },
    status: {
      reading: 'Reading…',
      preparing: 'Preparing…',
      applying: 'Writing to the draft…',
      undoing: 'Undoing…',
      applied: 'Text placed in the draft. Not sent; the final check is yours.',
      undone: 'The last apply was undone.',
      copied: 'Copied to clipboard.',
      retry: 'Retry',
      dismiss: 'Dismiss',
    },
    errors: {
      PAGE_UNSUPPORTED: 'This screen is not supported.',
      PAGE_NOT_READY: 'The mail area is not ready yet.',
      THREAD_CHANGED: 'The conversation changed. This result cannot be applied to the open conversation.',
      ACCOUNT_CHANGED: 'The account changed; the previous work was cleared.',
      TARGET_MISSING: 'The selected draft was closed or cannot be found.',
      TARGET_CHANGED: 'The draft changed after the action started. Take the source again.',
      SELECTION_INVALID: 'The selected part is no longer the same. Please select it again.',
      SOURCE_EMPTY: 'The text or instruction is empty.',
      SOURCE_TOO_LARGE: 'The text is too long; select a smaller part.',
      CONTEXT_TOO_LARGE: 'The selected context is too long. Remove some messages.',
      CONTEXT_REQUIRED: 'No message to reply to was determined. Read the conversation or select a message.',
      CONTEXT_STALE: 'The conversation has new content. Re-read it first.',
      LANGUAGE_REQUIRED: 'Select a target language.',
      RESULT_INVALID: 'The result does not belong to this action, is empty, or is too large.',
      RESULT_UNCHANGED: 'No changes in the text.',
      PREVIEW_STALE: 'The source changed. The preview can be copied but not applied to the draft.',
      SETTINGS_CONFLICT: 'Settings changed in another screen; the latest settings were loaded.',
      SETTINGS_INVALID: 'Saved settings could not be read; defaults are used.',
      READ_TIMEOUT: 'The page content could not be read. Try again.',
      READ_CANCELLED: 'Reading was cancelled.',
      WRITE_UNSUPPORTED: 'Safe writing to this editor could not be verified. You can copy the result.',
      WRITE_UNCERTAIN:
        'Could not verify that the text was placed. Please check the draft; the action was not repeated.',
      REPLY_TOO_LARGE:
        'The result is too long to open as a reply. Copy it and paste it into a reply instead.',
      UNDO_INVALID: 'The draft changed afterwards; automatic undo was disabled to protect your text.',
      CLIPBOARD_UNAVAILABLE:
        'The browser did not allow writing to the clipboard. Select the text and press Ctrl+C.',
      EXTENSION_RELOADED: 'The extension was updated. Reload the page to continue.',
      PROCESSING_UNAVAILABLE:
        'Text processing is not connected yet. This version does not revise, translate or draft replies.',
      AI_HOST_UNAVAILABLE:
        'The helper app is not connected. Open Settings → Helper app to install or connect it.',
      AI_NOT_CONNECTED: 'The AI session is missing or expired. Reconnect in AI settings.',
      AI_AUTH_FAILED: 'ChatGPT sign-in could not be verified or timed out. Try again.',
      AI_AUTH_EXCHANGE_FAILED:
        'OpenAI did not accept the sign-in code. Start a new attempt with Continue with ChatGPT; do not reload the old callback tab.',
      AI_AUTH_TOKEN_INVALID:
        'The OpenAI response is missing required session data or has an unexpected format. The account was not connected (AI_AUTH_TOKEN_INVALID).',
      AI_AUTH_IDENTITY_FAILED:
        'The OpenAI identity response could not be securely verified. The account was not connected (AI_AUTH_IDENTITY_FAILED).',
      AI_AUTH_CANCELLED: 'ChatGPT sign-in was cancelled.',
      AI_POLICY_DENIED:
        'Organization policy blocks Sign in with ChatGPT for this app. ChatGPT Business workspaces currently have no setting to allow it; use Sign in through Codex instead. On Enterprise and Edu, a global admin can approve the app in the OpenAI Admin Console under External access.',
      AI_WORKSPACE_MISMATCH:
        'This connection belongs to a different ChatGPT account or workspace. Continue with the account that created it, or select Add a different account or workspace.',
      AI_ACCOUNT_NAME_TAKEN: 'Another connection already uses this name. Choose a distinct name.',
      AI_PLAN_REQUIRED:
        'This connection has no ChatGPT plan permission. Generation requires an eligible Plus/Pro account and plan permission; signing in with a free account is not sufficient.',
      AI_NOT_ELIGIBLE:
        'OpenAI denied ChatGPT plan usage for this account (subscription_sharing_user_not_eligible). If your Plus/Pro subscription is active, contact OpenAI support with this code.',
      AI_ACCESS_DENIED:
        'The AI provider denied access to this request. Check app permissions, connection configuration or regional restrictions; for a ChatGPT plan, this error alone does not establish subscription eligibility.',
      AI_LIMIT_REACHED:
        'Usage limit reached. For ChatGPT, open Manage usage to see when it resets; work workspaces can also add credits to keep going. On a Claude plan, try again when your limit resets; for an API key, wait a moment or check your limits with the provider.',
      AI_CREDITS_EXHAUSTED:
        'No credits left. For a ChatGPT workspace, a workspace owner can add credits or raise the spending limit in the workspace billing settings; with an API key, add credits or raise the spending limit with the provider.',
      AI_UNAVAILABLE: 'The AI service is currently unavailable. Your connection is kept; try again later.',
      AI_NETWORK: 'Could not reach the AI service. Check your internet connection and try again.',
      AI_MODEL_UNAVAILABLE: 'The selected model is unavailable. Refresh models in AI settings.',
      AI_RESPONSE_INCOMPLETE:
        'The response did not complete. No partial text was applied; you can try again.',
      AI_REVOKE_UNCONFIRMED:
        'Signed out locally; OpenAI revocation could not be confirmed. Disconnect the app in ChatGPT settings.',
      AI_BUSY: 'An AI connection operation is in progress. Wait for it or cancel sign-in.',
      AI_KEY_INVALID:
        'The provider did not accept this API key. Check that you copied it completely and that it is still active, or create a new one.',
      AI_PROVIDER_ACCESS_REQUIRED: `${PRODUCT_NAME} needs your permission to connect to the provider. Select Connect key again and allow access when the browser asks.`,
      AI_KEY_STORAGE_FAILED:
        'This browser could not store or read the key securely, so nothing was saved. Check that the browser keeps site data for extensions, then try again.',
      AI_REQUEST_TOO_LARGE:
        'This request is larger than the provider allows for this model or plan. Remove some context messages, shorten the text or choose another model.',
      AI_CLAUDE_NOT_INSTALLED:
        'Claude Code was not found. Install Claude Code, then run the helper app’s install command again.',
      AI_CLAUDE_NOT_LOGGED_IN:
        'Claude Code is not signed in. Run claude in a terminal and sign in with /login.',
      AI_CLAUDE_UNSUPPORTED_INSTALL: `Claude Code was found only as a command script (claude.cmd), which ${PRODUCT_NAME} cannot start safely. Install Claude Code with the official native installer, then run the helper app’s install command again.`,
      AI_VERSION_MISMATCH: 'The helper app is older than this extension. Update it in Settings → Helper app.',
      HOST_UPDATE_CHECK_FAILED:
        'Could not check for a newer helper app. Check your internet connection and try again later.',
      HOST_UPDATE_FAILED:
        'The update could not be downloaded or installed; the installed version is unchanged. Try again later or run the install command again.',
      HOST_UPDATE_UNVERIFIED:
        'The downloaded update could not be verified, so nothing was installed. The installed version keeps working.',
      CONTENT_SCRIPT_UNREACHABLE:
        'The extension cannot reach this tab. Check site access or reload the page.',
      MESSAGE_REJECTED: 'An invalid extension message was rejected.',
      UNEXPECTED: 'An unexpected error occurred. Your text is kept.',
    },
  },
  popup: {
    title: PRODUCT_NAME,
    statuses: {
      ready: 'The writing assistant is available on this page.',
      waiting: 'The mail area is loading…',
      unsupported: 'The mail area on this screen was not recognized.',
      disabled: 'The extension is turned off for this site. You can enable it in settings.',
      'not-mail-site': 'This tab is not a supported mail site.',
      unreachable: 'The extension cannot reach this tab. Check site access or reload the page.',
      checking: 'Checking the page…',
    },
    openPanel: 'Open panel on this page',
    openSettings: 'Settings',
    siteAccessMissing: 'Site access has not been granted for this site.',
    developmentBuild: 'Development build',
    setupNeeded: `Choose how ${PRODUCT_NAME} connects to an AI provider to start writing.`,
    finishSetup: 'Finish setup',
  },
  options: {
    title: `${PRODUCT_NAME} settings`,
    subtitle: 'Writing assistant for Outlook on the web and Gmail',
    preferencesTitle: 'Writing preferences',
    preferencesDescription: 'Language, tone and appearance used for new work.',
    uiLanguage: 'Interface language',
    uiLanguageAuto: 'Automatic (browser language)',
    targetLanguage: 'Default translation language',
    targetLanguageHint:
      'The “Translate” button translates into this language. Choose from the list or type a language name.',
    favoriteLanguages: 'Languages in the translate menu',
    favoriteLanguagesHint:
      'Languages you can pick quickly from the Translate menu. Type a name to add a language that is not listed.',
    addLanguage: 'Add',
    removeLanguage: (language) => `Remove ${language}`,
    favoritesFull: 'You can add up to 10 languages.',
    languagesTitle: 'Languages',
    languagesDescription: 'Interface language, translation language and the languages in the Translate menu.',
    instructionsTitle: 'Standing instructions',
    instructionsDescription:
      'Added to every write, reply, revise and translate request. If your instruction for a request conflicts with it, that instruction wins.',
    instructionsLabel: 'Your writing preferences',
    instructionsPlaceholder:
      'For example: Use a formal, corporate tone. Keep paragraphs short. Start with “Dear” and end with “Kind regards”.',
    instructionsExamplesLabel: 'Quick add',
    instructionsExamples: [
      'Use a formal, corporate tone.',
      'Be brief and direct; skip filler openings.',
      'Use a friendly but professional tone.',
      'End the email with “Kind regards”.',
      'Avoid jargon unless it is explained.',
    ],
    instructionsCount: (count, limit) => `${count}/${limit}`,
    tone: 'Default tone',
    theme: 'Theme',
    themes: { system: 'Automatic (same as your mail)', light: 'Light', dark: 'Dark' },
    themeOptions: { system: 'Automatic', light: 'Light', dark: 'Dark' },
    themeHint:
      'With Automatic, the panel follows the theme of your mail page and this page follows your system theme.',
    siteNames: { 'outlook-web': 'Outlook on the web', 'gmail-web': 'Gmail' },
    siteEnabled: (site) => `Show the writing assistant on ${site}`,
    siteEnabledHint: (site) => `When off, the buttons and panel are hidden in ${site}.`,
    unsaved: 'You have unsaved changes.',
    save: 'Save',
    saved: 'Settings saved.',
    saving: 'Saving…',
    defaultsNote: 'Default language and tone do not change open work; they apply to the next work.',
    privacyTitle: 'Privacy and data',
    privacyDescription: `What ${PRODUCT_NAME} does and does not do with your email.`,
    privacyPoints: [
      'Your preferences are stored only on this device.',
      'Emails you open are kept in memory only while the page is open, to suggest context; they are never written to disk.',
      'Text is sent to the AI provider you chose (OpenAI, Anthropic, Groq or OpenRouter) only when you select Revise, Translate or Write reply.',
      'An API key you connect is stored encrypted in this browser and sent only to its provider.',
      'Results appear as a preview first and are never written to your draft without your approval.',
      `${PRODUCT_NAME} never sends email; sending is always up to you.`,
      'While update checks are on, the helper app asks GitHub for the latest version number at most once a day; the request contains no email or account details. You can turn it off on the helper app card.',
    ],
  },
  welcome: welcomeEn,
};
