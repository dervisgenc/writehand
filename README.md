# Writehand

[![CI](https://github.com/dervisgenc/writehand/actions/workflows/ci.yml/badge.svg)](https://github.com/dervisgenc/writehand/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Writehand helps you write better emails without leaving Outlook on the web or Gmail. It revises, translates, replies and drafts new emails with your own API key from Groq, OpenRouter or OpenAI, your ChatGPT plan or Claude Code on your computer. Every result is shown as a preview first; nothing is written to your draft until you approve it, and Writehand never sends email.

Writehand is a browser extension for Firefox, Edge, Chrome and Brave. An API key works with the extension alone; the ChatGPT and Claude plans also need a small helper app on your computer, which holds their sign-in.

![Writehand drafting a reply next to an email draft](./store/screenshots/en/01-reply.png)

## Install

1. Install the extension. Store listings are on their way: Firefox Add-ons and Microsoft Edge Add-ons first, then the Chrome Web Store (which Brave uses).
2. The welcome page opens. Choose how to connect:
   - **API key:** paste a key from [Groq](https://console.groq.com/keys) (free models, such as OpenAI's `gpt-oss-120b`), [OpenRouter](https://openrouter.ai/settings/keys) or [OpenAI](https://platform.openai.com/api-keys) and allow the browser to connect to that provider. Nothing else is installed.
   - **ChatGPT plan or Claude plan:** the page shows a one-line command that installs the helper app for your user account. No administrator rights are needed.

   macOS and Linux (Terminal):

   ```sh
   curl -fsSL https://github.com/dervisgenc/writehand/releases/latest/download/install.sh | sh
   ```

   Windows (PowerShell):

   ```powershell
   irm https://github.com/dervisgenc/writehand/releases/latest/download/install.ps1 | iex
   ```

   The command downloads the helper app for your system from the latest release, checks its SHA-256 checksum, installs it in your user folder and registers it with Firefox, Chrome, Edge and Brave.

3. Try a sample revision. Then open a draft in Outlook or Gmail; the Writehand toolbar appears next to it.

To uninstall the helper app (add `--delete-data` or `-DeleteData` to also sign out of ChatGPT and delete its saved sign-in details):

```sh
curl -fsSL https://github.com/dervisgenc/writehand/releases/latest/download/install.sh | sh -s -- uninstall
```

```powershell
& ([scriptblock]::Create((irm https://github.com/dervisgenc/writehand/releases/latest/download/install.ps1))) -Uninstall
```

## Features

- **Revise, translate, reply and compose** from a toolbar next to the Outlook or Gmail draft. Results appear as a preview first; nothing is written to your draft until you approve it.
- **Conversation context:** replies use the messages you opened in the same conversation. You can see, edit or remove every message before it is used.
- **Rich content:** results can contain lists, tables and simple bar charts, written to the draft as email-safe HTML.
- **Change the result:** turn it into a table or bullet points, add a chart, shorten it, make it more formal or friendlier, or ask for any other change.
- **Flexible languages:** translate into any language, keep favourites in the Translate menu and set standing writing instructions (for example "always formal").
- **Interface languages:** English, Turkish, German, French and Spanish, or automatic from the browser language.
- **AI connection methods:** your own API key from Groq, OpenRouter or OpenAI (no helper app needed; Groq and OpenRouter offer free models), your ChatGPT plan (Plus and Pro through Sign in with ChatGPT; Business, Enterprise and Edu workspaces through the Codex sign-in, experimental), or your Claude subscription through Claude Code on your computer (experimental).

## How it works

```text
Outlook on the web or Gmail ─ extension (preview, approval, writing to the draft)
                         │
                         ├─ API key: from the extension's background ─ Groq / OpenRouter / OpenAI API
                         │
                         │ native messaging, only with your permission
                         ▼
                   helper app on your computer ─ ChatGPT plan / Claude Code
```

With an API key, the extension's background sends the request straight to the provider. It asks for permission to connect to that provider's API address when you connect the key; it has no access to any other site. The key is stored encrypted in the browser, and only the background ever decrypts it.

A browser extension cannot listen for the ChatGPT sign-in callback on your computer or start Claude Code, so the helper app does that part for the two plans. The browser starts it only when Writehand asks for something, and only for Writehand's extension IDs. The extension asks for permission to talk to it when you choose one of these methods.

The helper app is a single program (no Node.js needed) for macOS (Apple silicon and Intel), Linux (x64 and arm64) and Windows (x64; Windows on Arm through emulation). It can update itself from the extension's settings: it downloads only releases of this repository and installs them only after checking the Ed25519 signature of `SHA256SUMS` and the archive's checksum.

## Privacy

- Writehand never sends email; sending is always up to you.
- Text goes to the AI provider you chose (Groq, OpenRouter, OpenAI or Anthropic) only when you request a revision, translation, reply or new email. There is no Writehand server, analytics or error reporting.
- Emails you open are kept in memory only while the page is open and are never written to disk.
- An API key is stored in the browser encrypted (AES-GCM with a non-extractable key in the extension's own storage, which web pages, Outlook and Gmail cannot reach), is never shown again and is sent only to its provider.
- ChatGPT sign-in tokens are stored by the helper app in a file only your user account can read, never in browser storage.
- While update checks are on (the default), the helper app asks GitHub for the latest version number at most once a day. You can turn this off in the settings.

Read the full [privacy policy](./PRIVACY.md). To report a security issue privately, see the [security policy](./SECURITY.md).

## Status

Writehand is in its first public release. Store listings for Firefox Add-ons and Microsoft Edge Add-ons are on their way, followed by the Chrome Web Store. See the [changelog](./CHANGELOG.md) for what is included.

## Development

Requirements: Node.js 22+ (24 LTS to build the single-file helper), pnpm 12.

```sh
pnpm install
pnpm dev            # develop in Chromium (real AI connection)
pnpm dev:firefox    # develop in Firefox
pnpm check          # typecheck, lint, format, tests, builds for both browsers, package checks
pnpm test:e2e       # Chromium end-to-end tests on synthetic Outlook and Gmail pages
pnpm test:firefox   # Firefox smoke test
pnpm ai:build       # helper app as a Node.js script
pnpm ai:install     # install that build for your browsers (add --extension-id=ID for an unpacked Chromium build)
pnpm ai:sea         # single-file helper app and its release archive (Node.js 24)
pnpm store:assets   # store icons, screenshots, promo images and demo video (store/)
```

Releases are built by GitHub Actions from `vX.Y.Z` tags; see [releasing](./docs/RELEASING.md) and [building from source](./docs/BUILD.md). Contributions are welcome; please read [CONTRIBUTING.md](./CONTRIBUTING.md).

## Project structure

```text
apps/browser-extension/        WXT extension: entry points, welcome wizard, mounting, platform helpers
apps/ai-companion/             Helper app: native messaging host, installer, updater, install scripts
packages/ai-openai/            ChatGPT OAuth (Sign in with ChatGPT, Codex sign-in), model discovery and Responses adapter (also for OpenAI API keys)
packages/ai-chat-completions/  Groq and OpenRouter API keys through OpenAI-compatible Chat Completions
packages/ai-claude-code/       Runs the user's Claude Code in a restricted print mode
packages/contracts/            Shared data and action definitions, boundary schemas, brand, AI prompt
packages/core/                 Context, action preparation, session state and write preconditions (pure functions)
packages/session/              Panel session shared by the apps: controllers, opened-message history, settings store, Vue bridge
packages/ai-connection/        API key method shared by the apps: encrypted key vault, connection choices, providers
packages/locales/              User-facing text in the five interface languages
packages/email-format/         Limited Markdown to email-safe HTML, plain text and verification text
packages/ui/                   Vue panel, toolbar, result card, settings and setup components
packages/mail-connectors/
  outlook-web/                 Reads, observes and writes Outlook on the web pages in a controlled way
  gmail-web/                   Reads, observes and writes Gmail pages in a controlled way
  mail-dom/                    What the web mail connectors share: text extraction, drafts, selection, writing, undo
tests/                         Unit, contract, integration and end-to-end tests with synthetic samples
scripts/store-assets/          Demo mailbox and scripts that produce the store images and the demo video
assets/brand/                  Logo sources (SVG)
.github/workflows/             CI on Linux, macOS and Windows; signed draft releases
```

## Documentation

- [Development guide](./docs/DEVELOPMENT.md): architecture, commands, Outlook and Gmail selectors and tests
- [Helper app](./docs/HELPER_APP.md): commands, connection methods, stored data and troubleshooting
- [Releasing](./docs/RELEASING.md): versioning, signed releases, store submission and store assets
- [Manual testing](./docs/MANUAL_TESTING.md): release checklist for clean machines
- [Building from source](./docs/BUILD.md)
- [Privacy policy](./PRIVACY.md), [security policy](./SECURITY.md) and [changelog](./CHANGELOG.md)

## License

Writehand is open source under the [MIT License](./LICENSE).
