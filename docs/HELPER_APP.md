# Helper app

The helper app is a small program on the user's computer that runs Writehand's ChatGPT plan and Claude plan methods. The browser extension talks to it through native messaging under the name `com.dervisgenc.writehand`; on Windows it can also serve the Outlook add-in, which talks to it on its own local origin ([Outlook add-in server](#outlook-add-in-server-windows)). Its source is in `apps/ai-companion`, with the providers in `packages/ai-openai` and `packages/ai-claude-code`. The API key method (Groq, OpenRouter, OpenAI) runs in the extension itself and does not need the helper app; see [API keys in the extension](#api-keys-in-the-extension).

See also: [Development guide](./DEVELOPMENT.md), [Releasing](./RELEASING.md), [Privacy policy](../PRIVACY.md), [Security policy](../SECURITY.md).

## Why it exists

- **ChatGPT sign-in** uses OpenAI's documented Sign in with ChatGPT flow for open-source, locally run apps, which returns to `http://127.0.0.1:<port>/auth/callback`. A browser extension cannot listen on a local port.
- **Claude Code** is a program on the user's computer; an extension cannot start programs.
- **ChatGPT tokens** (a refresh token that renews itself) are kept outside the browser, in a file only the user's account can read.
- **The Outlook applications** run add-ins as web pages that cannot reach a local program from a public address; the helper app serves the Outlook add-in itself, so the add-in can use the same plans.

The browser starts the helper app only when Writehand sends a request. The only server that keeps running is the Outlook add-in server, and only after `writehand outlook enable` (Windows). During a ChatGPT sign-in, the helper opens a loopback listener on a random port for at most five minutes. Writehand never reads ChatGPT cookies or another app's session files and never calls private `backend-api` endpoints.

The helper app is a single program built with Node.js's single executable application support, so users do not need Node.js. Every release ships it for macOS (Apple silicon and Intel), Linux (x64 and arm64) and Windows (x64; Windows on Arm runs it through emulation).

```text
Outlook content script → validated background message → native messaging
  → apps/ai-companion → packages/ai-openai      → OpenAI Responses API (ChatGPT plan)
                      → packages/ai-claude-code → the user's Claude Code (claude -p)
  ← finished text ← preview in the extension ← controlled write to the draft after approval
```

The extension's background chooses where a generation goes: to the helper app for these two methods, or straight to the provider's API for an API key.

## Install and uninstall

The welcome wizard (opened on first install, and from **Settings → Helper app → Open setup wizard**) shows the command for the user's system:

```sh
curl -fsSL https://github.com/dervisgenc/writehand/releases/latest/download/install.sh | sh
```

```powershell
irm https://github.com/dervisgenc/writehand/releases/latest/download/install.ps1 | iex
```

The script detects the system and processor (on Apple silicon it installs the native program even from a Rosetta terminal), downloads the matching archive and `SHA256SUMS` from the latest release, stops without installing anything if the SHA-256 does not match, unpacks the program into a temporary folder and runs its `install` command. No administrator rights are needed. Files downloaded with `curl` or `Invoke-WebRequest` carry no quarantine flag (macOS) or Mark of the Web (Windows), so the program starts without a warning; the macOS program is ad-hoc signed because Apple silicon does not run unsigned programs.

For a Chromium extension whose ID is not yet built into the helper app (an unpacked build, or a store build before its ID is added), the wizard appends the ID: `… | sh -s -- --extension-id=ID`, or `$env:WRITEHAND_EXTENSION_ID='ID'; irm … | iex` in PowerShell.

For the Outlook applications on Windows, one command installs the helper app and turns on its [Outlook add-in server](#outlook-add-in-server-windows):

```powershell
irm https://github.com/dervisgenc/writehand/releases/latest/download/install-outlook.ps1 | iex
```

`install-outlook.ps1` fetches `install.ps1` from the same release and runs it with `-Outlook`, which passes `--outlook` to the program's `install` command: the same checked installation, then `outlook enable` unless the server is on already. Browser users' command is unchanged.

Uninstall (add `--delete-data`, or `-DeleteData` in PowerShell, to also sign out of ChatGPT and delete saved credentials):

```sh
curl -fsSL https://github.com/dervisgenc/writehand/releases/latest/download/install.sh | sh -s -- uninstall
```

```powershell
& ([scriptblock]::Create((irm https://github.com/dervisgenc/writehand/releases/latest/download/install.ps1))) -Uninstall
```

`WRITEHAND_DOWNLOAD_BASE` replaces the download address in both scripts: a URL, a `file://` URL for `install.sh`, or a local folder for `install.ps1`. Release testing and CI use it to install from a local folder.

## Commands

The installed program is `~/.local/share/writehand/writehand` on macOS and Linux and `%LOCALAPPDATA%\Programs\writehand\writehand.exe` on Windows.

| Command | What it does |
| --- | --- |
| _(none, or the browser's arguments)_ | Runs as the native messaging host. In a terminal without a command it prints help |
| `install [--extension-id=ID]... [--dev] [--outlook]` | Copies the running program into the install folder, registers it with Firefox, Chrome, Edge and Brave and writes `config.json`. Firefox uses the built-in ID; Chromium browsers are registered once an ID is known (store IDs or `--extension-id`). IDs from earlier registrations are kept. `--outlook` (Windows) then turns on the Outlook add-in server as `outlook enable` does, unless it is on already |
| `uninstall [--delete-data]` | Removes every browser registration and the program. `--delete-data` also tries to revoke ChatGPT sessions and deletes the credentials folder; without it, credentials stay in place |
| `status` | Version, system, registered browsers and whether Claude Code is ready. Never prints account or token details |
| `update [--check]` | Installs a newer release after verifying its signature and checksum; `--check` only reports whether one exists |
| `outlook enable \| disable \| status` | Windows: serves the Outlook add-in on `https://localhost:41537` ([Outlook add-in server](#outlook-add-in-server-windows)). `outlook serve` is the server itself, started at sign-in |
| `version` | Prints the version |

## Files and locations

| | macOS and Linux | Windows |
| --- | --- | --- |
| Program | `~/.local/share/writehand/writehand` | `%LOCALAPPDATA%\Programs\writehand\writehand.exe` |
| Install settings | `config.json` next to the program | `config.json` next to the program |
| Update check cache | `update-check.json` next to the program | `update-check.json` next to the program |
| Browser manifest | `com.dervisgenc.writehand.json` in each browser's `NativeMessagingHosts` folder | `com.dervisgenc.writehand.<browser>.json` in the program folder |
| How the browser finds it | The folder itself | Default value of `HKCU\Software\<location>\NativeMessagingHosts\com.dervisgenc.writehand` |
| Credentials | `~/.config/writehand/credentials.json` (folder `0700`, file `0600`) | `%LOCALAPPDATA%\writehand\credentials.json` (folder ACL: only the user and SYSTEM) |
| Outlook add-in server | — | `%LOCALAPPDATA%\writehand\outlook\` (the certificates, the server key, the pane's token, the running server's state); `writehand-outlook.exe` and `outlook-manifest.xml` next to the program; the value `Writehand Outlook` under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` |

The manifest points directly to the program; a release install has no launcher. Browsers start native hosts with a minimal environment, so `install` records what it finds in the terminal in `config.json`: the Claude Code path (`WRITEHAND_CLAUDE_PATH`), `CLAUDE_CONFIG_DIR` and, for an npm-installed Claude Code, the `node` folder. The host adds these to its environment at start-up and falls back to `os.userInfo()` when `USER` is missing (Claude Code finds its macOS Keychain entry by user name). A damaged `config.json`, or one written by a newer version, falls back to defaults; the host always starts.

All operating system differences are in `apps/ai-companion/src/platform.ts`. Installation is a pure plan (`install-plan.ts`, `host-config.ts`) applied by a thin layer (`install.ts`); the plan of every system is unit-tested on every machine.

## How the browser starts it

- **Allowed extensions.** The Firefox manifest lists `allowed_extensions: ["writehand@dervisgenc.com"]`. Chromium manifests list `allowed_origins` for the store IDs in `CHROMIUM_EXTENSION_IDS` (`packages/contracts/src/brand.ts`) plus any `--extension-id` passed at install time. The browser refuses to start the helper for any other extension.
- **Permission.** `nativeMessaging` is an optional permission, so installing the extension shows no "communicate with cooperating native applications" warning. The welcome wizard's **Helper app** step asks for it with an **Allow** button. Without it the browser does not offer `connectNative` and the settings card shows **Permission needed**.
- **Who may do what.** The background script checks every sender. Outlook pages can only request generations, cancel them and read a summary (method, model, readiness). Account management, API keys and updates are accepted only from the extension's own pages. Tokens are never sent back to the extension.
- **What reaches the helper app.** The background forwards only the requests of the host protocol (`packages/contracts/src/host-protocol.ts`): `AI_STATUS`, `AI_COMMAND` with account and model commands, `AI_GENERATE`, `AI_CANCEL` and `HOST_*`. API keys and the extension's own messages never reach it.

## Development install

When working from source, the same installer runs on Node.js:

```sh
pnpm ai:build                         # apps/ai-companion/dist/cli.mjs
pnpm ai:install                       # node dist/cli.mjs install --dev
pnpm ai:install --extension-id=ID     # for an unpacked Chromium build
```

A development install copies `cli.mjs` and writes a small launcher that runs it with Node.js (a `writehand` sh script on macOS and Linux, `writehand.cmd` on Windows). It is marked `development: true` in `config.json` and never updates itself. Remove it with the installed program's `uninstall` command. The Firefox ID is the same in development and store builds; unpacked Chromium builds get an ID derived from their folder (see [Loading the extension manually](./DEVELOPMENT.md#loading-the-extension-manually)).

`pnpm dev`, `pnpm dev:firefox` and `pnpm outlook:dev` use the real helper app connection. Only `pnpm build:test` produces fixed sample results.

## Windows

| Browser | Registry key under `HKCU\Software\…\NativeMessagingHosts` | Notes |
| --- | --- | --- |
| Chrome | `Google\Chrome` | |
| Edge | `Microsoft\Edge` | Without its own key Edge falls back to the Chromium, then the Chrome key |
| Brave | `Chromium` | Not officially documented. Brave reads `Chromium` first, then `Google\Chrome`, and stops at the first manifest it finds; it does not read `BraveSoftware\Brave-Browser`. The `Chromium` key does not collide with Chrome's |
| Firefox | `Mozilla` | |

Design decisions:

- **Locations.** The program is in `%LOCALAPPDATA%\Programs\`, Windows' per-user program folder. Credentials are in `%LOCALAPPDATA%`, not the roaming `%APPDATA%`, so tokens are never copied to a server or other computers and two computers never rotate the same refresh token.
- **Permissions.** `chmod` has no effect on Windows. When the credentials folder is first created, `icacls` removes inheritance and grants full control only to the user and SYSTEM; files inherit that. If the restriction fails, the folder is deleted and no secret is written. Check with `icacls "%LOCALAPPDATA%\writehand"`.
- **Locking and atomic writes.** The credential store uses a `proper-lockfile` lock and a temporary file plus rename. On Windows, a virus scanner or the search indexer may hold a new file briefly, so the rename is retried for about 1.5 seconds.
- **Replacing the running program.** Windows cannot delete a running `.exe` but can rename it. Install and update move the running program aside as `writehand.exe.<random>.old`, put the new one in place and delete the old copy the next time the helper starts. `uninstall` removes its own folder through a hidden Windows PowerShell process that waits until the program has exited; the script is passed with `-EncodedCommand` and the folder and process ID through environment variables, so no path is ever parsed as a command line.
- **Opening the browser for sign-in.** `rundll32.exe url.dll,FileProtocolHandler <URL>` without a shell, so `&` in the URL survives. Only `https://` addresses are opened, because this method can also start local files.

## Outlook add-in server (Windows)

The Outlook applications load add-ins as web pages over HTTPS, and a page from a public address cannot reach a local program (the new Outlook does not grant its add-in frames Chromium's Local Network Access; see [Outlook add-in → Why the helper app serves the pane](./OUTLOOK_ADDIN.md#why-the-helper-app-serves-the-pane)). So the helper app carries the add-in's task pane and serves it on `https://localhost:41537`; the pane reaches the ChatGPT and Claude plans on that same origin. It is off until the user turns it on:

```powershell
writehand outlook enable    # trust the local certificate, start the server, write the manifest
writehand outlook status    # is it running, until when is the certificate valid
writehand outlook disable   # stop it and remove the certificate, the sign-in entry and its files
```

**`enable`** (`apps/ai-companion/src/outlook.ts`):

1. Creates a certificate authority and the server's certificate (`src/local-certificate.ts`, ECDSA P-256, 825 days). The authority's name constraints allow only `localhost`, `127.0.0.1` and `::1`, and its private key exists only in memory while the server certificate is signed: it is never written anywhere, so nobody can issue another certificate with it.
2. Adds the authority to the user's trusted roots with `certutil -user -addstore Root`; Windows shows a security warning that the user confirms. If the user declines, nothing else changes.
3. Writes the server's certificate and key (`0600`) to `%LOCALAPPDATA%\writehand\outlook\`, inside the private data folder, and records the authority's thumbprint and expiry date in `config.json`. A previous authority (from an earlier `enable`) is removed; Windows asks again.
4. Copies the program to `writehand-outlook.exe` with its PE subsystem set to GUI, so the server runs without a console window (`src/windowless-program.ts`; a development install copies Node.js instead and runs its script), and adds `"…\writehand-outlook.exe" "outlook" "serve"` as the value `Writehand Outlook` under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
5. Writes `outlook-manifest.xml` next to the program, starts the server and prints how to add the manifest in Outlook ([Outlook add-in → Install](./OUTLOOK_ADDIN.md#install)). The first time (not when renewing the certificate), it also puts the manifest's path on the clipboard (`Set-Clipboard`, the path passed in an environment variable) and opens <https://aka.ms/olksideload> in the default browser, so the user only pastes the path into Outlook's file dialog.

**The server** (`writehand outlook serve`, `src/outlook-server.ts`) listens on `127.0.0.1:41537` with TLS 1.2 or later. It serves only the files the program carries, and answers the pane's requests at `POST /api/host` with the same dispatcher as native messaging (`src/host-dispatch.ts`), limited to `AI_STATUS`, `AI_COMMAND`, `AI_GENERATE`, `AI_CANCEL` and `HOST_INFO` (`OUTLOOK_BRIDGE_REQUESTS`): updates stay with the extension and `writehand update`. Who may do what:

- Every request must name the server in `Host` (`localhost:41537` or `127.0.0.1:41537`), which also defeats DNS rebinding; the certificate is valid for nothing else.
- A pane request must come from the pane's own origin (`Origin: https://localhost:41537`, set by the browser) and carry the token the server wrote into the pane's page (`<meta name="writehand-bridge">`), which no other site can read. The token is kept in `bridge.token` across restarts, so an open pane keeps working after an update.
- The pane's page may be framed only by Outlook (`frame-ancestors`); pages and answers are not cached (`no-store`), other files are revalidated (`no-cache`).
- `/control/status`, `/control/stop` and `/control/restart` need the control token from `server.json` in the private data folder and must not come from a browser (no `Origin`): only `writehand` commands of the same user use them.
- Nothing about a request's content is logged; the server has no console.

**Updates and removal.** `install` (and so every update) keeps the server on: it refreshes the windowless copy and the sign-in entry, and asks the running server to restart, which starts the newly installed program itself and exits, so it keeps running even when a browser started the update. If the port is taken, a starting server waits about ten seconds and then exits. `uninstall` runs `outlook disable` first. A server whose certificate expired keeps running, but Outlook no longer loads the pane: `outlook status` says so, and `outlook enable` renews it.

Outlook for Mac and Linux are not supported yet: `outlook enable` says that the server is available on Windows only.

## Updates

The helper app asks the GitHub API (`releases/latest`) for the latest published version at most once a day and caches the answer in `update-check.json`. The request carries only the version lookup, no email or account data. If **Check for updates** is off in the settings (it is on by default), the extension never asks.

**Update** in the settings (`HOST_UPDATE`, accepted only from the extension's own pages) and `writehand update`:

1. Download `SHA256SUMS`, `SHA256SUMS.sig` and the archive for this system, only from this repository's release of that version.
2. Verify the Ed25519 signature of `SHA256SUMS` with the public key built into the helper app (`apps/ai-companion/release-key.json`) and the archive's SHA-256.
3. Check that the unpacked program reports the version the release is named after.
4. Run the new program's `install`. It inherits the environment, so it records the Claude Code settings again and refreshes the browser registrations with the existing extension IDs.

After answering, the old host exits; the browser's next request starts the new program. A release that cannot be verified is never installed (`HOST_UPDATE_UNVERIFIED`). The extension itself updates through the browser stores; see [version compatibility](./RELEASING.md#version-compatibility).

## Connection methods

Users choose a method in **Settings → AI connection** (or in the welcome wizard). The settings also contain a **Connection guide** for end users with requirements, steps and notes for each method; its text is in `packages/locales/src/ai-<language>.ts`.

| Method | Label | Runs in | Billing | Requirements |
| --- | --- | --- | --- | --- |
| ChatGPT plan | Recommended | Helper app | Usage included in the user's ChatGPT plan; work workspaces can add credits once a limit is reached | An eligible ChatGPT Plus or Pro account, or a Business, Enterprise or Edu workspace through the Codex sign-in |
| API key | | Extension | Groq's free plan and OpenRouter's free models cost nothing; otherwise pay as you go with the provider | A key from Groq, OpenRouter or OpenAI |
| Claude plan | Experimental | Helper app | Usage from the user's Claude plan, shared with their Claude Code usage | Claude Code installed and signed in on the same computer |

The method is chosen per browser profile and stored by the extension. The helper app keeps one method for all browsers on the device, so before the helper app is shown or used, the extension switches it to the browser's method (never from the polled connection summary of a mail page). A method chosen before the helper app is installed is applied once it connects. The ChatGPT accounts and the model choice inside the helper app are shared by all browsers.

A failure in one method never switches to another automatically, and failed requests are not retried on their own.

### ChatGPT plan (recommended)

1. Select **Continue with ChatGPT**. In the system browser, choose the account or workspace and allow plan usage.
2. The settings show the connected account and the models OpenAI offers for it. A plan-usage notice appears on first connection.
3. Choose a model. In Outlook, use **Revise**, **Translate**, **Write reply** or **Write**.

Access rules:

- Signing in alone does not grant generation: the token response must include the `chatgpt.tokens.use.direct` scope, and usage is subject to the account's and workspace's access. A free account can sign in but cannot generate with plan usage. See OpenAI's [Sign in with ChatGPT](https://learn.chatgpt.com/docs/sign-in-with-chatgpt) and [open-source token sharing](https://developers.openai.com/siwc/token-sharing-open-source) documentation.
- Work accounts: OpenAI offers plan usage through Sign in with ChatGPT to eligible Plus and Pro subscribers. On ChatGPT Business workspaces, sign-in ends with `3p_delegated_access_policy_denied`, and Business workspaces have no setting that allows it (as of October 2026, including for owners). Enterprise and Edu global admins manage it in the OpenAI Admin Console under **External access**, which workspace owners and admins cannot change on their own. Work accounts use the [Codex sign-in](#business-enterprise-and-edu-workspaces-codex-sign-in-experimental) instead.
- Writehand is not a ChatGPT plugin and does not appear in the Plugins list. Users manage the connection in ChatGPT under **Settings → Security and login → Sign in with ChatGPT** and usage under **Settings → Usage**.

Accounts:

- **Reconnect** and **Continue with ChatGPT** on a saved connection keep the same app registration for that user and workspace. To switch to another account or workspace, use **Add a different account or workspace**; it uses no identity hints from earlier registrations, deletes nothing and does not change the active account until the new identity is verified.
- Selecting a saved connection only selects it; **Use this account** makes it the one used for generation.
- **Rename** sets a local name (1–80 characters, unique on this device). The first verified sign-in uses the profile name or email; duplicates get `(2)`, `(3)`; unverified records are called `ChatGPT`.
- **Remove account** deletes the connection and its tokens from this device after confirmation, cancels a pending sign-in and tries to revoke the refresh token at OpenAI; a late OAuth response cannot recreate it. Removing the active account does not switch to another one. **Disconnect** clears the tokens but keeps the name and registration for signing in again. Neither deletes the ChatGPT account or OpenAI's app registration.

Technical details: the ID token is verified (signature, issuer, audience, expiry, nonce) before an account is activated; Sign in with ChatGPT accounts are kept apart by `client_id` even with the same email, Codex sign-ins by user and workspace. On every start the helper loads the model catalog of the active account once (a model list, never a generation); an account without a catalog is not shown as ready. Every request uses `store: false` and `stream: true`, and a result is accepted only after `response.completed`. This is not a claim about the provider's own retention policies.

#### Business, Enterprise and Edu workspaces: Codex sign-in (experimental)

**Sign in through Codex** in the ChatGPT plan settings signs in with the OAuth client of OpenAI's Codex CLI, which OpenAI admits for work workspaces, the way other open-source tools (Pi, OpenCode) do. Codex itself does not need to be installed.

- OpenAI does not document this sign-in for other apps. It may stop working at any time, which is why it is labelled experimental and Sign in with ChatGPT stays the recommended sign-in. The authorization request and every request to the Codex backend name Writehand (`originator: writehand`), never Codex.
- Usage counts against the plan's limits, which ChatGPT shares across Codex and other work features (for example a weekly limit); no credits are needed while they last. When the limit is reached, generation fails with `AI_LIMIT_REACHED` until it resets. Business workspaces can add credits to keep going; when those run out too, generation fails with `AI_CREDITS_EXHAUSTED` until a workspace owner adds credits or raises the spending limit in the workspace billing settings. The Codex CLI words a reached weekly limit as "Your workspace is out of credits"; Writehand reports the code the backend returns.
- Sign-in: authorization code with PKCE at `https://auth.openai.com/oauth/authorize` for client `app_EMoamEEZ73f0CkXaXp7hrann`, with the scopes `openid profile email offline_access`. The client's redirect allow-list accepts only `http://127.0.0.1:1455/auth/callback` and port 1457, so the helper listens on 1455 and falls back to 1457 (for example while `codex login` is running). Tokens are exchanged and refreshed at `/oauth/token`, without a `resource`. There is no nonce, as in the Codex CLI; the ID token is verified as for Sign in with ChatGPT.
- Account: the verified `https://api.openai.com/auth` claim `chatgpt_account_id` names the ChatGPT account (personal account or workspace) the tokens belong to. Signing in to the same user and workspace again replaces that account's tokens; **Reconnect** sends `allowed_workspace_id`, and a sign-in to another workspace is refused (`AI_WORKSPACE_MISMATCH`) and its tokens revoked.
- Requests go to ChatGPT's Codex backend (`https://chatgpt.com/backend-api/codex`) with the `chatgpt-account-id` header: `GET /models?client_version=…` for the account's model catalog (the version is the Codex CLI release the requests were checked against) and `POST /responses` with the same request body as Sign in with ChatGPT (`store: false`, `stream: true`, no tools).
- **Remove account** revokes the refresh token at OpenAI, as for Sign in with ChatGPT.

### API keys in the extension

API keys no longer pass through the helper app; see [API keys](./DEVELOPMENT.md#api-keys) in the development guide. Helper app 0.1.0 could keep an OpenAI API key itself. From 0.2.0 the helper app drops such a key from `credentials.json` the next time it writes the file and falls back to the ChatGPT plan method; the two fields stay in the file, empty, so that 0.1.0 can still read it. The extension then shows its own API key method with OpenAI selected, and the user connects the key again.

### Claude plan through Claude Code (experimental)

This method runs the user's own, **unmodified** Claude Code in print mode (`claude -p`). The user signs in only through Claude Code itself (`claude`, then `/login`). Writehand never reads, stores or relays Claude credentials or session tokens; it learns the sign-in state only from `claude auth status --json`. It is not the default method; the user selects it.

Terms: Anthropic states that `claude -p` and third-party apps can be used with subscription limits ([support article](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)), while its [legal and compliance page](https://code.claude.com/docs/en/legal-and-compliance) does not let apps offer their own Claude.ai sign-in, route requests through Free, Pro or Max plans on users' behalf or collect Claude credentials. A distributed app starting the user's own Claude Code is not addressed explicitly, which is why the method is labeled experimental and "Claude Code" is never part of the product name. Monthly API credits of Max and Team plans apply only to API keys of the linked Console organization, not to a plan sign-in.

Setup:

1. Install Claude Code and sign in (`claude`, then `/login`).
2. Run the helper app's install command **in the terminal where Claude Code works** (again if Claude Code was installed later). The installer records the `claude` path, `CLAUDE_CONFIG_DIR` if set and the `node` folder in `config.json`.
3. Choose **Claude plan** in **Settings → AI connection**. The settings show the Claude Code account, organization and plan.
4. Model: **Claude Sonnet** (default) or **Claude Opus**. Claude Code resolves these aliases to the current model. Claude Haiku is not offered because it doubled letters in Turkish replies; a saved Haiku choice falls back to Sonnet.

Safety: email is untrusted input and Claude Code is an agent that can run commands, so every generation uses these arguments (`packages/ai-claude-code/src/provider.ts`):

| Argument | Why |
| --- | --- |
| `--tools ""`, `--restricted` | No tools: no commands, no file access, no web access |
| `--restricted`, `--strict-mcp-config`, `--disable-slash-commands` | No user or project settings (including hooks), MCP servers or skills |
| `--no-session-persistence` | Email text is never written to Claude Code's session transcripts |
| `--system-prompt` | The email prompt replaces Claude Code's coding instructions |
| Prompt on stdin, empty temporary folder | Email text never appears in the process list; no project files or `CLAUDE.md` are reachable. The folder is deleted afterwards |

stderr is ignored. A result is accepted only with `subtype: success` and a `stop_reason` other than `max_tokens`; errors are mapped to stable codes and never shown raw. Only the fixed system prompt is passed as an argument (about 3,500 characters at most, far below Windows' 32,767-character `CreateProcess` limit; no shell is involved, so `cmd.exe`'s 8,191 limit does not apply).

Privacy: text, instruction and selected context go to Anthropic through Claude Code. Pro and Max plans fall under Anthropic's consumer terms, under which content may be used for model training unless the user turned it off in Claude's privacy settings; Team and Enterprise plans fall under commercial terms.

Finding Claude Code, in order: the path recorded at install time, `PATH`, then common locations.

- macOS and Linux: `~/.local/bin/claude`, `~/.claude/local/claude`, `/opt/homebrew/bin/claude`, `/usr/local/bin/claude`.
- Windows: only `claude.exe` and `claude.cmd` on `PATH`, then `%USERPROFILE%\.local\bin\claude.exe` (Anthropic's native installer), `%LOCALAPPDATA%\Microsoft\WinGet\Links\claude.exe` (WinGet) and `%APPDATA%\npm\claude.cmd` (npm). Scripts are never run through a shell, because `cmd.exe` would reinterpret the system prompt argument; npm's `claude.cmd` is resolved through the adjacent `node_modules\@anthropic-ai\claude-code\package.json` to the package's `bin\claude.exe`. A script that cannot be resolved (for example a global install with pnpm or Yarn) is reported as `AI_CLAUDE_UNSUPPORTED_INSTALL` unless a real program exists at a later location.

## What is sent to the provider

Nothing is sent when an email is opened or the connection status is read. On a generation request, only the selected source, the instruction, the tone, the target language (for translations), the standing writing instructions, the output format and the prepared context are sent; **Change the result** adds the previous result and the requested change. Mailbox IDs, DOM targets and messages not selected for the context are never included.

The prompt is built by `buildTaskPrompt` (`packages/contracts/src/ai-prompt.ts`), and every method receives the same text (the API key providers too):

- The **system prompt** covers the task, the output rules (the whole answer goes into the draft as is; no subject line, preamble or commentary; names, amounts, dates and times are not reinterpreted; missing facts become placeholders such as `[date]`), the format (limited Markdown and a `chart` block for rich output, plain text otherwise), language, tone, preferences and safety.
- **Language:** Revise keeps the source language, Translate writes the target language, a reply follows the language of the message being answered unless the instruction asks otherwise, Write follows the instruction's language, and a refinement keeps the previous result's language.
- The **user message** is tagged: `<task …/>`, `<instruction>`, `<standing_preferences>`, `<source>` or `<draft>`, `<conversation>` with `<message>` entries, and `<previous_result>` with `<refinement>` for refinements. Source, draft, conversation and previous result are untrusted data; instructions inside them are not followed and imitated tags are neutralized.
- The model never produces HTML. The extension builds email HTML from the parsed structure with all text escaped.

## Credentials and limits

- Credentials are protected by the operating system's user access; the file is not encrypted at the application level. Integration with the macOS Keychain, Windows DPAPI or Linux Secret Service is not implemented.
- Several browser processes may use the same file at once; a file lock serializes refresh token rotation and writes. The account and model choice is shared by all browsers on the device; after changing it in another browser, use **Refresh** in the settings.
- A generation runs for at most 120 seconds and at most four generations run at once per host process. A lost connection between UI and host never counts as success, and a restarted worker or host never repeats a generation automatically. Cancellation belongs to the tab that started the request.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| Helper app card shows **Permission needed** | Select **Allow** and confirm the browser's prompt |
| Helper app card shows **Not installed** | Run the install command from the setup wizard. `writehand status` lists the registered browsers. For an unpacked Chromium build, the command must include `--extension-id` |
| Not connected on Windows | `reg query "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.dervisgenc.writehand"` (Edge: `Microsoft\Edge`, Brave: `Chromium`, Firefox: `Mozilla`) must show the manifest path, and the manifest's `allowed_origins` must contain the extension's ID. Brave does not fall back to the Chrome key if the `Chromium` key's manifest allows a different ID. A group policy may block per-user hosts (see below) |
| **Update needed** / `AI_VERSION_MISMATCH` | The helper app is older than the extension. Use **Settings → Helper app → Update**, or run the install command again |
| `HOST_UPDATE_CHECK_FAILED` | GitHub could not be reached. The installed version keeps working; try again later |
| `HOST_UPDATE_UNVERIFIED` | The signature or checksum did not match; nothing was installed. If it persists, report it as described in [SECURITY.md](../SECURITY.md) |
| `HOST_UPDATE_FAILED` | Download or installation failed; the installed version is unchanged. Running the install command again also updates |
| Permission email from OpenAI arrived but the connection did not complete | App permission at OpenAI and a locally verified session are separate steps. The settings show the incomplete record; **Continue with ChatGPT** starts a new sign-in with the same registration. Do not reload the old callback tab |
| Sign-in cancelled or expired | Start the sign-in again from the settings; an old callback is never reused |
| `AI_AUTH_EXCHANGE_FAILED` | The token endpoint did not accept the sign-in code. Start a new sign-in; the saved client ID is kept |
| `AI_AUTH_TOKEN_INVALID`, `AI_AUTH_IDENTITY_FAILED` | The token response format or the signed identity check failed; the account is not activated. Never share raw tokens, responses or callback URLs |
| `AI_POLICY_DENIED` (`3p_delegated_access_policy_denied`) | An OpenAI organization policy refused Sign in with ChatGPT. On ChatGPT Business no setting allows it; use **Sign in through Codex**. On Enterprise and Edu, a global admin can approve the app in the OpenAI Admin Console under **External access**. Give OpenAI support the error code and the `request_id` from OpenAI's page, never a token or callback URL |
| `AI_WORKSPACE_MISMATCH` (`3p_login_workspace_scope_denied`) | The selected registration belongs to another workspace. Use its original account or workspace, or **Add a different account or workspace**. A new registration does not bypass organization policy or plan eligibility |
| Account connected but no plan permission | Check the plan's eligibility, then allow plan usage again with **Continue with ChatGPT** |
| Account verified but not ready to generate | The model catalog failed to load; the error is shown in the settings. Use **Refresh** |
| `AI_NOT_ELIGIBLE` (`subscription_sharing_user_not_eligible`) | OpenAI refused eligibility at generation time even though sign-in and the model list worked. Do not loop sign-ins or requests. If the plan was upgraded moments ago, wait a while and try once more; otherwise contact OpenAI support with the plan and the error code |
| `AI_ACCESS_DENIED` | Another check (permission, route, region) refused the request. A plain `403` does not mean the subscription is ineligible |
| `AI_CREDITS_EXHAUSTED` | The ChatGPT workspace (Codex sign-in) or the API key's account has no credits left, or its spending limit was reached. A workspace owner adds credits in the workspace billing settings; for an API key, add credits with the provider |
| Codex sign-in fails at once with `AI_AUTH_FAILED` | Ports 1455 and 1457 are both in use, for example by another `codex login`. Finish or close that sign-in and try again |
| `AI_LIMIT_REACHED` | Usage limit reached: **Manage usage** for ChatGPT shows when it resets (work workspaces can add credits to keep going), or wait for the Claude plan limit to reset (shared with Claude Code). There is no automatic switch to a paid method |
| Response cut off | The source text is kept and a partial answer is never applied; generate again |
| `AI_CLAUDE_NOT_INSTALLED` | Install Claude Code, run the helper app's install command again, then **Refresh** in the settings |
| `AI_CLAUDE_UNSUPPORTED_INSTALL` | Claude Code was found only as a `claude.cmd` script that cannot be started without a shell. Install it with Anthropic's native installer (`irm https://claude.ai/install.ps1 \| iex`), WinGet or npm, run the helper app's install command again and **Refresh** |
| `AI_CLAUDE_NOT_LOGGED_IN` | Run `claude`, then `/login`. With several Claude configurations (`CLAUDE_CONFIG_DIR`), run the install command in a terminal where the right one is active |
| Warning that Claude Code is signed in another way (for example with an API key) | Claude Code is using that account instead of the plan, and usage is billed there |
| `outlook enable` (or the Outlook install command) says the certificate was not added | Windows' security warning was declined or closed. Run the command again and select **Yes**; the helper app itself is installed either way |
| The Outlook add-in does not load, or says the helper app did not answer | `writehand outlook status`: if the server does not answer, sign out of Windows and in again or run `writehand outlook enable`; if the certificate expired, run `writehand outlook enable`. Another program on port 41537 also stops it |
| The Outlook add-in still shows an old version | Close and reopen the pane; after an update the server restarts on its own (`outlook status` shows its version) |

Uninstall with the command from the setup wizard or the helper app card, or `writehand uninstall`. It removes every browser registration (on Windows including the HKCU keys) and the program. `--delete-data` (`-DeleteData`) also tries to revoke ChatGPT sessions and deletes `~/.config/writehand` (`%LOCALAPPDATA%\writehand`).

More on OpenAI's side: [errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery), [profiles and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions). Native messaging: [Chrome](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging), [Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging), [Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/native-messaging).

## Known limitations

- **Windows group policy:** `NativeMessagingUserLevelHosts` can disable per-user native hosts. That would need an administrator install, which is not supported.
- **Windows path expansion:** Chrome and Edge start the host through `cmd.exe /d /s /c` even for an `.exe`, and `cmd.exe` expands `%NAME%` parts of the path as environment variables.
- **Windows development launcher:** Firefox quotes the `.cmd` path only if it contains spaces, so a user folder without spaces but with `&` or `^` prevents Firefox from starting the development launcher. Release installs have no launcher.
- **Opera** is not registered by the installer. On Windows it reads the `Chromium` key, then `Google\Chrome`, and ignores its own key, so once the store IDs are in the helper app the same manifest serves Chrome, Brave and Opera there.
- **Credentials** are not encrypted at the application level (see [Credentials and limits](#credentials-and-limits)).
