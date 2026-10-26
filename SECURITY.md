# Security policy

## Supported versions

Writehand has two parts that are released together from this repository: the browser extension and the helper app on your computer.

| Version | Supported |
| --- | --- |
| Latest release (extension and helper app) | Yes |
| Helper app up to two minor versions older than the extension | Yes, until the extension asks you to update it |
| Anything older | No: update the extension from your browser's store and the helper app from the extension settings |

Security fixes are released as a new version; there are no separate patch branches.

The Outlook add-in is a preview; reports about it are handled the same way.

## Reporting a vulnerability

Please report vulnerabilities **privately** through GitHub: open the repository's **Security** tab and select **Report a vulnerability** ([direct link](https://github.com/dervisgenc/writehand/security/advisories/new)). Do not open a public issue, pull request or discussion for a suspected vulnerability.

Include what you found, the affected component and version, the steps to reproduce and the impact you expect. Never include real email content, access tokens, API keys or account details; use made-up text and redact anything personal.

You can expect an acknowledgement within a week. Once a fix is released, the advisory is published with credit to you unless you prefer otherwise.

## Scope

In scope:

- **Browser extension** (`apps/browser-extension`): message validation between extension parts, what is read from Outlook on the web and Gmail pages, what is written to drafts, settings storage, API key storage and the requests to API key providers (`packages/ai-chat-completions`, `@writehand/ai-openai/api-key`).
- **Helper app** (`apps/ai-companion` and the provider packages): the native messaging protocol, ChatGPT sign-in (loopback callback, token handling), credential storage, how Claude Code is started, update download and verification.
- **Installation and release**: `install.sh`, `install.ps1`, the helper app's `install`, `uninstall` and `update` commands, release archives, `SHA256SUMS` and its signature.
- **Outlook add-in** (`apps/outlook-addin`, `packages/mail-connectors/outlook-addin`): the task pane page and its Content Security Policy, what is read from and written to the open item through Office.js, API key storage in the add-in's origin, the manifest and its permission, and the helper app's local add-in server (`writehand outlook`): its certificate authority, its request checks and its start at sign-in.

Out of scope: vulnerabilities in Outlook on the web, Gmail, the Outlook applications, Office.js, the OpenAI, Anthropic, Groq or OpenRouter services, Claude Code itself, browsers, or a computer that is already compromised.

## Threat model

- **No email is ever sent.** The extension only writes into a draft after you approve the preview; sending is always up to you.
- **Email content is untrusted input.** It is never run as HTML, links and images in it are not opened, and instructions inside it are not followed. Claude Code runs without tools, settings, MCP servers or session transcripts.
- **Text goes only to the provider you chose** (Groq, OpenRouter, OpenAI or Anthropic), and only when you ask for a revision, translation, reply or new email. There is no Writehand server, analytics or error reporting.
- **API keys never reach a web page.** A key is checked with its provider before it is saved, then stored encrypted (AES-GCM, bound to its provider) in the extension's storage. The encryption key is non-extractable and kept in the extension's own IndexedDB, which web pages and content scripts cannot open. Only the background decrypts a key, and only to send it to its provider's API, whose origin the user allowed. Mail pages (Outlook and Gmail) cannot save, read or remove keys. This does not protect a key from someone who can use your browser profile or read its files; use keys with a spending limit.
- **ChatGPT tokens stay on your computer, outside the browser.** The helper app keeps them in a file only your user account can read (`~/.config/writehand` on macOS and Linux, `%LOCALAPPDATA%\writehand` on Windows). They are never sent back to the extension. Writehand never reads or stores Claude credentials; it only runs `claude auth status` and `claude -p`.
- **Only Writehand can start the helper.** The browser starts the helper app only for the extension IDs listed in its registration. The helper app cannot tell which page of the extension sent a request, so the extension enforces the rest: it forwards account and update commands only from its own settings and welcome pages, and Outlook or Gmail pages can only request a generation, cancel it or read a summary of the connection.
- **Updates are verified.** The helper app downloads updates only from this repository's releases and installs them only if `SHA256SUMS` carries a valid Ed25519 signature from the release key built into the helper app and the archive matches its checksum. Release files also carry GitHub build provenance attestations.
- **The first install trusts GitHub.** The install commands download the helper app over HTTPS from this repository's latest release and compare it with `SHA256SUMS` from the same release. That catches a damaged download, not a compromised release: the scripts do not check the signature, because Windows PowerShell 5.1 and the LibreSSL that ships with macOS cannot verify Ed25519. To check a release yourself before installing it, run `gh attestation verify <file> --repo dervisgenc/writehand` or the signature check in [Releasing](./docs/RELEASING.md#verifying-a-draft-release). Updates of an installed helper app are always signature-checked.
- **The Codex sign-in is a workaround with account risk.** It exists for ChatGPT Business, Enterprise and Edu workspaces, where an organization policy blocks Sign in with ChatGPT. It uses the client ID of OpenAI's Codex CLI and generates on ChatGPT's Codex backend (`chatgpt.com/backend-api/codex`). OpenAI has not published this client for other apps: it can change or stop working at any time, and OpenAI may restrict accounts that use it this way. The extension shows this and asks for confirmation before the sign-in starts. Like the Codex CLI, it receives the sign-in on the fixed loopback port 1455 (or 1457); on a computer shared with other people, another user's program that takes the port first can block the sign-in, but cannot use the code it receives without the sign-in's PKCE verifier.
- **No administrator rights.** Installation, updates and removal touch only your user account's folders and (on Windows) your own registry keys.

The Outlook add-in (preview) differs in these points:

- **It cannot send.** Office.js has no call that sends an email; the add-in writes only into the open draft after you approve the preview, or opens a new reply draft (`displayReplyFormAsync`). Its manifest asks for `ReadWriteItem` on messages only, with no event-based activation and no on-send handler.
- **Email is parsed, never rendered.** The body HTML Office.js returns is parsed into a detached document (`DOMParser`), where scripts do not run and nothing loads; only its text is used.
- **The page comes from your own computer.** The helper app serves the task pane on `https://localhost:41537` from the files inside the helper app release it was installed or updated from (see the first install above); there is no Writehand web host. The page's Content Security Policy allows scripts only from that origin and Office.js's CDN, and connections only to its own origin, the three API key providers and the CDN. There is no separate background: the pane decrypts an API key in the same page that reads the open email, so keys with a spending limit are recommended.
- **A local certificate authority, limited to this computer.** Office requires HTTPS with a trusted certificate. `writehand outlook enable` (also run by the Outlook install command, `install-outlook.ps1`) creates an authority whose name constraints allow only `localhost`, `127.0.0.1` and `::1`, issues the server certificate with it and never stores its private key; Windows asks you before it is trusted, and `outlook disable` or `uninstall` removes it.
- **The local server answers only your pane.** Requests must name the server (`Host`), come from the pane's own origin (`Origin`) and carry the token the server wrote into the pane's page; it accepts status, account, generation and cancel requests, never updates. Websites cannot read the token or call the server. The server writes the token only into a pane requested with your page key, a random value that only your own manifest carries (in your program folder and in your mailbox). Other Windows accounts on the same computer can reach the port, which is how all local servers work, but cannot read your manifest, so they get the page without the token and cannot use your ChatGPT or Claude connection. Only `writehand` commands of the same user, with a token from the private data folder, can stop or restart it. A program running under your own account can reach it, as it could read your credentials file.
- **One user per computer at a time.** The port is fixed by the manifest. On a computer that several people use at once (Remote Desktop or multi-session Windows), only the first user's server can listen; the others' panes do not load. The server key in `%LOCALAPPDATA%\writehand\outlook` is protected by that folder's user-only access list; with it, someone could impersonate `https://localhost` to you, but no other site.
- **Storage is per Outlook application.** The encrypted key and settings live in the pane origin's storage in each Outlook application, under Office's partition key where Office provides one; roaming settings and the mailbox are never used. ChatGPT tokens stay in the helper app.
