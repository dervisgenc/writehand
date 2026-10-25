# Changelog

All notable changes to Writehand are recorded here. The extension, the helper app and the Outlook add-in share one version; tags are named `vX.Y.Z`. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Outlook add-in (in development, not released):** Writehand as an Office add-in for the Outlook applications, Windows first. A **Writehand** button on the ribbon opens a task pane with the same panel: revise or translate the selected text of a draft, write into an empty draft or a new message, or open a new reply to the email you are reading with the result. It works with the ChatGPT and Claude plans through the helper app, or with your own API key from Groq, OpenRouter or OpenAI, stored encrypted in that Outlook application. Context is the open item only: the email you read, or the earlier mail quoted in your reply. It asks Outlook only for access to the open item and never sends email. See [docs/OUTLOOK_ADDIN.md](./docs/OUTLOOK_ADDIN.md).
- `writehand outlook enable | disable | status` (Windows): the helper app serves the Outlook add-in on `https://localhost:41537`, so the add-in reaches the ChatGPT and Claude plans. Windows asks once to trust a certificate that is valid only for the computer's local addresses (its authority's private key is never stored); the server starts at sign-in without a window and follows helper app updates. See [docs/HELPER_APP.md](./docs/HELPER_APP.md#outlook-add-in-server-windows).
- **Gmail on the web** (`mail.google.com`), for personal Google accounts and Google Workspace: the same toolbar, card and panel as in Outlook on the web, with the open conversation's expanded messages as context, inline replies and compose windows as drafts, and Gmail's signature and trimmed quote kept out of what is replaced. Gmail support is new: its page markers come from open-source Gmail extensions; reading a conversation and finding a compose window are checked on a real Gmail account, replies are not yet.
- A switch per mail service in the settings (Outlook on the web, Gmail); the welcome wizard links to Gmail too.
- On Gmail the extension looks like Gmail (Google Sans, Gmail's colors, rounded buttons), and the **Draft reply** button sits at the end of the subject row, next to Gmail's own buttons.
- The **Draft reply** button can be dragged out of the way; its place is remembered per mail service, and dropping it near its first place puts it back.
- `pnpm gmail:inspect` runs the extension's reading code on a live Gmail tab with masked output, for checking Gmail's page markers.
- API keys work in the extension itself, without the helper app: connect a key from Groq, OpenRouter or OpenAI in the settings or the welcome wizard. Groq's free plan and OpenRouter's free models need no payment method; with Groq, OpenAI's free open-weight model `openai/gpt-oss-120b` is selected by itself.
- Keys are checked with the provider before they are saved, stored encrypted in the browser (AES-GCM with a non-extractable key in the extension's own storage) and sent only to their provider. The browser asks for access to a provider's API only when you connect a key for it.
- **Sign in through Codex** (experimental) for ChatGPT Business, Enterprise and Edu workspaces, where OpenAI's Sign in with ChatGPT is blocked by organization policy. It uses the sign-in of OpenAI's Codex CLI, without installing Codex, and generates on ChatGPT's Codex backend for the chosen workspace.
- A separate error for a workspace or API account without credits (`AI_CREDITS_EXHAUSTED`), apart from plan usage limits.

### Changed

- The panel session, the AI connection (the API key method, the helper app client and the method choice), the interface texts and the settings form are shared packages now, used by the extension and the Outlook add-in; the extension works as before.
- The extension now asks for access to `mail.google.com`. Chromium browsers ask existing users to accept this new permission when the extension updates.
- Settings schema version 4 adds the Gmail switch, turned on; the Outlook switch keeps its value.
- The shared parts of the mail connectors (text extraction, drafts, selection, writing, undo) moved into one package used by both, and a signature split by a line break is read as one block.
- The welcome wizard has three steps. The helper app is installed only for the ChatGPT and Claude plans, from the connection step; without it, the API key method is preselected.
- The connection method is chosen per browser profile; the helper app follows the method of the browser that uses it.
- The helper app no longer keeps an OpenAI API key. A key saved by helper app 0.1.0 is deleted the next time the helper app writes its credentials file; connect it again in the extension, where OpenAI is preselected for you.
- The organization-policy error (`AI_POLICY_DENIED`) explains that Business workspaces currently cannot allow Sign in with ChatGPT, points to the Codex sign-in and names the Admin Console setting for Enterprise and Edu.

### Fixed

- Gmail: a reply opened from the message list, without opening the email, is recognized as a reply to its conversation. **Write reply** shows the replied-to message in the draft (as Gmail's "•••" button does) and uses it as context.
- Write and reply prompts now distinguish directions from rough email text, preserve who is requesting what, and prefer the conversation's language unless the user explicitly chooses another language.
- Recover context from recognized quotes when Outlook already has a reply draft open. Keep that context local to its editor, exclude the editable draft and signature, and invalidate a context-free result if a late quote identifies the draft as a reply.

## [0.1.0] - 2026-10-21

### Added

- Writehand browser extension for Outlook on the web (Firefox, Edge, Chrome, Brave): revise, translate, reply and compose with a preview before anything is written to the draft, conversation context, rich results (tables, lists, charts) and five interface languages.
- Helper app as a single program for macOS, Linux and Windows, installed with one command and without administrator rights. It connects to a ChatGPT plan, an OpenAI API key or Claude Code (experimental) and keeps credentials on the computer.
- Welcome wizard that installs and checks the helper app, chooses a connection method and tries a sample revision.
- Signed releases: `SHA256SUMS` with an Ed25519 signature and build provenance attestations; the helper app updates itself only from verified releases.
- Writehand logo as the extension icon and on the welcome and settings pages.
