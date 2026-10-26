# Outlook add-in

**Status: preview, released with 0.2.0 for Windows (2026-10-26).** Writehand for the Outlook applications as an Office Add-in (Office.js), Windows first. The helper app serves the add-in on the user's computer (`writehand outlook enable`), so the add-in works with the ChatGPT plan, the Claude plan and API keys. It has been checked in one real client: the new Outlook for Windows, with the ChatGPT and Claude plans through the helper app (2026-10-25) and with the sample build (2026-10-23). Classic Outlook for Windows, Outlook on the web and Outlook for Mac have not been checked in a real client, nor has an API key provider called from the task pane. The draft's **Writehand** menu and the first run of the one-command install (`install-outlook.ps1`) are new and not yet checked in a real client; the install's update path is.

This guide describes what the add-in does, how to install it, how it works and how to develop and test it. Platform facts were checked on learn.microsoft.com or the vendor's own documentation on 2026-10-22 to 2026-10-25 and link their source; what was seen in a real client is marked as such and recorded in [Manual testing](./MANUAL_TESTING.md#7-outlook-add-in). Facts that neither the documentation nor a real client confirms are marked **unconfirmed**.

See also: [Helper app → Outlook add-in server](./HELPER_APP.md#outlook-add-in-server-windows), [Development guide](./DEVELOPMENT.md), [Manual testing](./MANUAL_TESTING.md#7-outlook-add-in), [Privacy policy](../PRIVACY.md#outlook-add-in-preview), [Security policy](../SECURITY.md).

## What it does

- Browser extensions do not run inside the Outlook applications, so the add-in is a web page (the task pane) that Outlook loads over HTTPS and that works with the open item through Office.js. The helper app serves that page on `https://localhost:41537`; there is no Writehand web server.
- On a received email, the **Writehand** button (under **Apps** in the new Outlook) opens the task pane, ready to draft a reply. On a draft, **Writehand** is a menu: **Revise**, **Translate** and **Write** open the pane and start that operation on the selected text or the draft, and **Open Writehand** opens it as it is. The pane holds the same panel as the extension: revise, translate, write or reply, refine the result, preview it, then apply it to the draft once or copy it. There are no buttons inside the email or the draft.
- In a draft it revises or translates the selected text, writes into an empty draft, or replaces the whole body of a new message without a signature or quote. On a received email it opens a new reply draft with the result.
- Context is the open item: the email you read, or the earlier mail quoted in your reply. You see and can edit it before anything is sent.
- It generates with the **ChatGPT plan** or the **Claude plan** through the helper app on the same computer, the way the extension does, or with your own **API key** from Groq, OpenRouter or OpenAI.
- It never sends email: Office.js has no call that sends, and the add-in only writes into the open draft after you approve the preview, or opens a reply draft.

## Compared with the browser extension

| Area | Browser extension | Outlook add-in |
| --- | --- | --- |
| Where it runs | Outlook on the web in Firefox, Chrome, Edge and Brave; Gmail | The Outlook applications on Windows: the new Outlook (checked) and classic Outlook (unchecked) |
| How it opens | Toolbar inside each draft, result card next to the draft, **Draft reply** button in the reading pane, side panel | The **Writehand** button on a received email, the **Writehand** menu on a draft (ribbon, or **Apps** in the new Outlook); everything else happens in the task pane. An add-in cannot place UI inside the draft; the context menu extension point is documented for Word, Excel, PowerPoint and OneNote only, and keyboard shortcuts for add-in commands are not documented for Outlook. The pane can be pinned on Microsoft 365 accounts |
| Quick actions | One click in the draft revises or translates the selection | **Writehand → Revise** revises the selection (or the draft) in the pane without another click; **Translate** asks for the language in the pane, because the menu cannot list the favourites; **Write** waits for the instruction |
| Conversation context | Every message visible in the open conversation with its sender and date; up to 40 opened messages; related messages by subject | Read mode: the open email with its sender, exact date and subject; emails opened while the pane stays pinned are kept as other opened emails. Draft: the quoted earlier mail as one context item with unknown sender and date. The read pane and the draft's pane are separate, so what was read does not carry into the reply |
| Selection in a received email | Revise or translate it, then copy the result | Not available: Office.js reads selections only in drafts |
| Writing | The selection, the user's whole part of a reply above the signature and quote, or an empty draft | The selection, an empty draft, or the whole body of a new message without signature or quote. The user's part of a non-empty reply is not replaced as a whole ([Writing to the draft](#writing-to-the-draft)) |
| Result on a received email | Applied to an open reply draft | A new reply draft opened with the result (at most 32 KB), or copied |
| Rich results | Tables, lists and charts written as HTML | The same HTML; the new Outlook keeps its inline styles (checked) |
| Undo | The last apply, while the draft has not changed since | Only after replacing the whole body of a new message; elsewhere Outlook's own undo |
| Copy | Clipboard API | Clipboard API, or the copy command where Outlook refuses the API (the new Outlook does) |
| AI connection | API key, ChatGPT plan, Claude Code, through the background and native messaging | The same three methods: the plans through the helper app that serves the pane, on the pane's own origin; API keys in the pane |
| Needs the helper app | Only for the plans | Always: it serves the pane |
| Key storage | The extension's own origin; only the background decrypts a key | The pane's origin (`https://localhost:41537`), decrypted in the same page that shows email; separate in each Outlook application |
| Settings | Per browser profile | Per Outlook application; not shared with the extension. The plans' accounts are the helper app's and shared |
| Theme | Outlook's colours read from the page | Office's theme colours (checked in the new Outlook) |
| Robustness | Depends on Outlook's page structure | A supported API; Outlook interface changes do not break it |
| Installation | One click from a browser store | One PowerShell command installs the helper app and turns on its add-in server (Windows asks once to trust a local certificate); then the manifest is added once per mailbox in Outlook on the web, which the command opens |
| Updates | Reviewed by the stores, installed automatically | The pane updates with the helper app; manifest changes need a reinstall |
| Network beyond the provider | None, apart from the helper app's daily update check | Office.js from Microsoft on every pane load |

## Client support

| Client | Mailbox requirement sets | Pinnable task pane | Add-in only (XML) manifest | Webview | Real-client check |
| --- | --- | --- | --- | --- | --- |
| New Outlook for Windows (Microsoft 365 work or school account) | 1.1 to 1.16 | Yes | Yes | Edge WebView2 | **Checked** 2026-10-23 and 2026-10-25 ([record](./MANUAL_TESTING.md#7-outlook-add-in)) |
| Classic Outlook for Windows, Microsoft 365 subscription | 1.1 to 1.16 (1.16 from Version 2602) | Yes | Yes | Edge WebView2 | Not checked (not installed on the development machine) |
| Classic Outlook for Windows, perpetual (2021, 2024, LTSC) | 1.1 to 1.9 / 1.14 | Yes | Yes | Edge WebView2 | Not checked |
| Outlook on the web (Microsoft 365, Outlook.com) | 1.1 to 1.16 | Yes (Microsoft 365 only, not Outlook.com) | Yes | The user's browser (iframe) | Not checked; the browser extension serves it. A browser may refuse a public page's frame on `https://localhost` (Local Network Access) |
| Outlook for Mac (new UI, 16.38.506+) | 1.1 to 1.14 | Yes (16.13+) | Yes | Safari WKWebView | Not supported yet: the helper app serves the add-in on Windows only |
| Outlook on iOS and Android | 1.1 to 1.5 | No | Read mode only | WKWebView, Chrome | Not supported: no compose add-ins, no helper app |
| Outlook on the web, classic (Exchange on-premises) | 1.1 to 1.6 | No | Yes | The user's browser | Not supported |

Sources: [Outlook requirement sets and client table](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/outlook/outlook-api-requirement-sets), [Browsers and webview controls](https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/browsers-used-by-office-web-add-ins), [Pinnable task panes](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/pinnable-taskpane), [Outlook mobile add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/outlook-mobile-addins), [Outlook for Mac support](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/compare-outlook-add-in-support-in-outlook-for-mac).

- **Manifest:** the add-in only (XML) manifest. The unified (JSON) manifest is not supported on Mac, perpetual Outlook or on-premises mailboxes ([unified manifest overview](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/unified-manifest-overview)), and converting later would give the add-in a new ID ([convert](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/convert-xml-to-json-manifest)).
- **Minimum requirement set:** Mailbox 1.5, the floor for `ItemChanged` and pinnable task panes. Newer calls are feature-detected with `Office.context.requirements.isSetSupported` ([Office.js API use](#officejs-api-use)).
- **Accounts:** Microsoft 365 work or school mailboxes. The new Outlook for Windows runs add-ins only with a work or school account on Exchange Online ([New Outlook on Windows](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/one-outlook)). POP, IMAP and Gmail accounts do not run add-ins ([Outlook add-ins overview](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/outlook-add-ins-overview)).

## Install

1. In PowerShell, run:

   ```powershell
   irm https://github.com/dervisgenc/writehand/releases/latest/download/install-outlook.ps1 | iex
   ```

   It installs the helper app for your user account, as the browsers' command does (no administrator rights; the download's SHA-256 checksum is checked), and turns on its Outlook add-in server. Windows shows a security warning for the certificate **Writehand local Outlook add-in (*your user name*)**; select **Yes**. The server starts now and when you sign in to Windows, and the manifest is written to `%LOCALAPPDATA%\Programs\writehand\outlook-manifest.xml`. With the helper app already installed, `writehand outlook enable` does the same (`& "$env:LOCALAPPDATA\Programs\writehand\writehand.exe" outlook enable` if `writehand` is not on `PATH`).
2. Your browser opens <https://aka.ms/olksideload> (Outlook on the web) and the manifest's path is on the clipboard. Choose **My add-ins → Custom Addins → Add a custom add-in → Add from File**, paste the path into the file name box and install. This is needed once per mailbox. Your organization must let users add their own add-ins (the "My Custom Apps" role, on by default). The new Outlook's own **Apps** store has no custom upload.
3. Restart Outlook. On a received email choose **Writehand** under **Apps** (the ribbon may put **Apps** in its overflow menu, **…**); on a draft, **Writehand** is a menu with **Revise**, **Translate**, **Write** and **Open Writehand**. If the helper app already has a ChatGPT account or Claude Code, the pane uses it; otherwise choose a method in the pane.

So the user runs one command, confirms one Windows prompt, adds one file in Outlook on the web and restarts Outlook. The certificate prompt cannot be avoided: Office loads add-ins only over HTTPS with a trusted certificate, and the only store Windows lets a program add to without asking is the computer-wide one, which needs administrator rights (another prompt).

An administrator can deploy the add-in from the Microsoft 365 admin center (**Integrated apps**) with the manifest from a helper app release (`apps/outlook-addin/dist/manifest.xml`), which saves users step 2; every user still runs the command of step 1, because the manifest points to their own computer ([Deploy add-ins in the admin center](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-deployment-of-add-ins)). That shared manifest carries no user's page key, so its pane offers API keys only; for the ChatGPT and Claude plans, each user adds their own `outlook-manifest.xml` as in step 2. Not checked in a real tenant.

To remove it, remove **Writehand** on the same **My add-ins** page and run `writehand outlook disable`, which stops the server, removes the certificate (Windows asks again) and the sign-in entry. Uninstalling the helper app does the same.

## How it works

### Runtime shape

```text
Outlook (new and classic for Windows)
  └─ task pane: https://localhost:41537, served by the helper app; Office.js from Microsoft's CDN
       ├─ @writehand/outlook-addin   MailConnector over Office.js (open item: read, selection, write, undo)
       ├─ @writehand/session         panel controllers, message history, settings store, Vue bridge
       ├─ @writehand/ui              the same WriterPanel, settings and connection components
       ├─ @writehand/locales         the five interface languages
       └─ @writehand/ai-connection   method routing: API keys in the pane (Groq / OpenRouter / OpenAI),
                                     the plans through POST /api/host on the same origin
                                          └─ helper app (writehand outlook serve)
                                               → ChatGPT plan (OpenAI) or Claude Code (Anthropic)
```

There is no content script, background or messaging layer: the task pane is one page, so `apps/outlook-addin/src/bootstrap/create-addin-session.ts` wires the session, the connector and the AI connection together. The AI connection is the extension's (`createAiConnection` in `@writehand/ai-connection`); only its transport to the helper app differs (`src/platform/helper-bridge.ts` instead of native messaging).

### Why the helper app serves the pane

Office loads an add-in from the HTTPS address in its manifest. A page from a public address cannot reach a program on the user's computer: Chromium's Local Network Access blocks requests from public pages to loopback unless the page is allowed, and the new Outlook frames add-ins in `https://outlook.office.com` without delegating that permission to the frame. Measured in the new Outlook for Windows (Edge WebView2 155, 2026-10-25) with a probe page: the pane is a frame of `https://outlook.office.com`, `local-network-access`, `loopback-network` and `local-network` are not allowed by its permissions policy, and their permission state is `denied`. A pane served from `https://localhost` reached `http://127.0.0.1`, `https://localhost` and a WebSocket there without a prompt, because a loopback page's requests to loopback are not Local Network Access requests ([Chrome: Local Network Access](https://developer.chrome.com/blog/local-network-access); Microsoft's [office-js issue 6400](https://github.com/OfficeDev/office-js/issues/6400) reports the new Outlook as inconsistent and was closed without a fix).

So the helper app serves the pane on `https://localhost:41537` and answers its helper app requests on the same origin. Same-origin requests are not covered by Local Network Access at all, now or in Chrome's announced extension of it to local cross-origin requests. Office requires HTTPS with a trusted certificate, which `writehand outlook enable` provides ([Helper app → Outlook add-in server](./HELPER_APP.md#outlook-add-in-server-windows)).

### Packages

| Package or app | Responsibility | Must not use (ESLint) |
| --- | --- | --- |
| `packages/session` (`@writehand/session`) | The panel session both apps share: action, apply and panel controllers, message history, session store, `toPanelView`, `usePanelSession`, appearance, the settings store | WXT, `chrome`, `browser`, `Office`, `document`, `window`, web storage, `fetch`; `ai-connection`, the connectors |
| `packages/ai-connection` (`@writehand/ai-connection`) | The AI connection both apps share: the helper app client over an injected transport (`createHelperClient`), the method routing (`createAiConnection`), the API key method (providers, key checks, the secret vault and its IndexedDB key store, the connection store) and, for a page without a background, `connectionService` and `createDirectProcessor` | Vue, WXT, `chrome`, `browser`, `Office`, `document`, `window`, Node.js modules; `ui`, `core`, `session`, the connectors |
| `packages/locales` (`@writehand/locales`) | The `en`, `tr`, `de`, `fr` and `es` dictionaries of both apps, including the add-in's own texts (`addin-*.ts`) | Everything except `contracts` |
| `packages/mail-connectors/mail-dom` | Shared with the web connectors: text extraction, draft anatomy, and the quote and signature markers of mail HTML (`mail-markup.ts`, including the bookmarks of classic Outlook's Word HTML) | Office, the apps |
| `packages/mail-connectors/outlook-addin` (`@writehand/outlook-addin`) | `MailConnector` over Office.js. The real Office.js adapter is only in `src/office/`; everything else works against the small `OfficeMailbox` port, so it runs under a fake in tests | Vue, WXT, `ui`, `core`, `session`; `Office` outside `src/office/` |
| `apps/outlook-addin` (`@writehand/outlook-addin-app`) | The task pane (Vite and Vue): `taskpane.html` with its Content Security Policy and the helper app's token tag, the `Office.onReady` bootstrap, `src/platform/` (Office host and theme, storage, clipboard, the helper app bridge), the panel, settings and first-run views, manifest generation | `Office` outside `src/platform/`; `chrome`, `browser`, WXT |
| `apps/ai-companion` (the helper app) | Carries the pane's release build and serves it (`src/outlook-server.ts`, `src/outlook.ts`); answers the pane's requests with the same dispatcher as native messaging (`src/host-dispatch.ts`) | Browser globals; UI and mailbox packages |

### The Office.js connector

The `MailConnector` contract is the extension's, with three additions in `contracts`: `ContextCoverage.source: 'item-body'`, a read-mode apply target `create-reply` that the user chooses in the panel (it is never derived automatically), and `PageState.features` (`receivedSelection`, `richContent`, `createReply`) for what a page cannot do.

| Operation | Draft (reply, forward, new) | Received email |
| --- | --- | --- |
| `getPageState` | `support` is `waiting` until Office.js reports the compose type (`getComposeTypeAsync`, 1.10); then one composer. A new message has no conversation; a reply or forward keeps its `conversationId`. Without 1.10 a non-null `conversationId` counts as a reply. The pane waits up to five seconds for this before the session starts | `activeThread` from the email's `conversationId` (its item ID if there is none), no composer |
| `readThread` | `body.getAsync(Html)` [1.3], parsed into a detached document with `DOMParser` (style elements removed first, nothing rendered or run) and read with `mail-dom`. The quoted mail is one context message with unknown sender and date; `coverage.status` is `partial` | The open email: sender's display name, `dateTimeCreated`, subject and its text blocks (its own quotes and signature recognized as such) |
| `readComposer` | The draft's text, its signature and quote boundary, and a revision that increases when a re-read differs (Office.js has no body-change event) | Not applicable |
| `captureDraftSelection` | `getSelectedDataAsync(Text)` [1.2]; only a selection in the body counts. It is located in the editable text; the registry keeps the text and the revision | Not available (`features.receivedSelection` is false) |
| `subscribe` | `ItemChanged` [1.5] and, while the pane is open, a re-read of the draft body every 2 seconds, so a stale target is reported before the user applies | `ItemChanged` |
| `applyText` | See [Writing to the draft](#writing-to-the-draft) | `create-reply` through `displayReplyFormAsync` [1.9] |
| `undoChange` | Only after `replace-body` | None |

### Writing to the draft

Office.js has no range or cursor API: the body can be replaced as a whole, prepended to, or the current selection replaced ([Body reference](https://learn.microsoft.com/en-us/javascript/api/outlook/office.body?view=outlook-js-preview)). Every write is preceded by a fresh read that must match the expected revision and followed by a read that must match the expected result; otherwise the outcome is `uncertain` and nothing is retried. A write is never repeated.

| Target | Office.js call | Verification | Undo | New Outlook |
| --- | --- | --- | --- | --- |
| `replace-selection` | `getSelectedDataAsync` again (it must still be the captured text), then `body.setSelectedDataAsync(text)` [1.1] | The body equals the previous text with the selection replaced, the signature and quote unchanged | None | Replaced in place after clicking **Apply to draft** in the pane |
| `insert-empty` (the user's part is empty) | `body.prependAsync(html or text)` [1.1], above any signature and quote | The body starts with the inserted text and keeps the rest | None | Written once (also with a ChatGPT plan result, 2026-10-25) |
| `replace-body` | Only in a new message without signature or quote: `body.setAsync(html)` [1.3] | The body equals the result | `body.setAsync(previousHtml)`, verified the same way | Replaced, then undone; no notification |
| `create-reply` (received email) | `displayReplyFormAsync({ htmlBody })` [1.9], or `displayReplyForm` [1.1]; at most 32 KB, larger results are refused with `REPLY_TOO_LARGE` | Outlook opened the draft; nothing to read back | None; the user discards the draft | Opened a reply draft in its own window, starting with the result |

Not used: `body.setAsync` on a draft that contains a signature or quoted thread. In Outlook on the web and the new Outlook it replaces "the entire body of a message, including previous messages from the conversation thread" and shows a notification; the `bodyMode` option that limits it is ignored on classic Windows and Mac ([Insert data in the body](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/insert-data-in-the-body)), and a body read and written back is not necessarily the same ("the value returned by Body.getAsync won't necessarily be the exact same value"). So in a reply the user revises or translates a selection, or writes into an empty reply.

Rich results (tables, lists, charts) are written as HTML through the same calls. The Body reference says every write method "doesn't support inline CSS"; `email-format` uses inline styles for table borders and chart bars. The new Outlook kept them; the other clients are unchecked.

### AI connection

**ChatGPT and Claude plans.** The pane routes a plan's requests to the helper app that served it: `POST /api/host` on its own origin, with the helper app's request envelope (`packages/contracts/src/host-protocol.ts`) and the token the server wrote into the page (`<meta name="writehand-bridge">`). The helper app answers with the same dispatcher as native messaging, limited to `AI_STATUS`, `AI_COMMAND`, `AI_GENERATE`, `AI_CANCEL` and `HOST_INFO`; updates stay with the extension and the command line. Accounts, sign-in, the model choice and Claude Code are the helper app's, as for the extension: a ChatGPT sign-in started in the pane opens the system browser, and the pane polls until it finishes. The helper app keeps one method for all its clients and is switched to the pane's method before it is used. A generation that does not finish in 130 seconds is cancelled in the helper app.

**API keys.** The three providers answer browser requests with `Access-Control-Allow-Origin: *` and allow the `Authorization` header, so the provider code runs unchanged in the task pane with `fetch` (preflight requests checked on 2026-10-22; not yet from a real pane). Keys follow the extension's model: AES-GCM with a non-extractable key kept as a `CryptoKey` in the pane origin's IndexedDB, ciphertext in `localStorage`, both namespaced with `Office.context.partitionKey` where Office provides one ([Persist add-in state](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/persisting-add-in-state-and-settings)). Storage is per Outlook application and is not shared with the extension. `OfficeRuntime.storage` and roaming settings are not used ([RoamingSettings](https://learn.microsoft.com/en-us/javascript/api/outlook/office.roamingsettings): "shouldn't be used to store sensitive information").

A page that the helper app did not serve (the development server, the tests), or that it served without the user's page key, has no token and offers API keys only. The page key (`?key=` in every pane address of the user's `outlook-manifest.xml`) keeps the token from other local clients, such as another Windows account's programs on the same computer: they can reach the port but cannot read the user's manifest.

### Context

Office.js exposes only the open item.

| Source | Status |
| --- | --- |
| The open email, or the quoted mail inside the draft (`body.getAsync`) | Used. No permission beyond the item |
| Emails opened while the pane is pinned (`ItemChanged`) | Used, within one pane instance. Microsoft 365 only. In the new Outlook a pinned pane followed each opened email; switching to a draft's tab closed it |
| Microsoft Graph with nested app authentication (`Mail.Read`, filtered by `conversationId`) | Later, opt-in: needs an Entra app registration and consent ([NAA requirement sets](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/common/nested-app-auth-requirement-sets)) |
| Exchange Web Services | Not used: disabled in Exchange Online from October 2026 to April 2027 ([EWS retirement](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-ews-exchange-online)) |
| `loadItemByIdAsync` [1.15] | Not used: IDs come only from Graph or multi-select |

## Permissions and data flow

| What | Value | Why |
| --- | --- | --- |
| Manifest permission | `ReadWriteItem` | Reading and writing the open item's body and selection. Not `ReadWriteMailbox`: the add-in never reads other items, headers or the mailbox |
| Activation | Messages in read and compose forms, one task pane command each, pinnable | No appointments, no event-based activation, no on-send handlers; nothing in the pane runs while it is closed |
| Content Security Policy (meta tag) | `default-src 'none'`; `script-src 'self'` and the Office.js CDN; `connect-src 'self'`, `api.groq.com`, `openrouter.ai`, `api.openai.com` and the CDN; `style-src 'self'`; `style-src-attr 'unsafe-inline'`; `img-src 'self' data:`; `font-src 'self'`; `object-src 'none'`; `base-uri 'none'`; `form-action 'none'` | The pane talks only to the helper app on its own origin, the chosen API key provider and Microsoft's library. Style attributes are needed by Vue and the formatted preview. The new Outlook ran the page under it without a violation |
| Server headers | `Content-Security-Policy: frame-ancestors 'self'` and Outlook's origins (`outlook.office.com`, `outlook.office365.com`, `outlook.cloud.microsoft`, `outlook.live.com`); `Cache-Control: no-store` for pages and requests; `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer` | No other site may frame the pane; the new Outlook framed it from `outlook.office.com` |
| Office.js | `https://officeapis.public.onecdn.static.microsoft/1/office.js` ([Referencing Office.js](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/referencing-the-javascript-api-for-office-library-from-its-cdn)) | The only remote script; the package check allows exactly that one |
| Storage | `localStorage` and IndexedDB of `https://localhost:41537`, namespaced by `partitionKey` | Settings and the encrypted API key stay in the Outlook application; the plans' accounts stay in the helper app |
| Clipboard | Written only when you press **Copy**: the Clipboard API, or the copy command where the host refuses it; never read | The new Outlook refuses the Clipboard API to add-in frames |

Data flow of one generation: you press a button in the pane → the connector reads the open item through Office.js, in memory only → the panel shows the context and you decide what is sent → with a plan, the pane sends the request to the helper app on this computer, which sends it to OpenAI or Anthropic as for the extension; with an API key, the pane sends it straight to the chosen provider → the preview appears → you apply it and the connector writes the draft once. Microsoft's CDN serves Office.js and Outlook mediates every Office.js call. No email content, key or request goes to Writehand. [PRIVACY.md](../PRIVACY.md#outlook-add-in-preview) states this for users.

## Distribution

The helper app's release program carries the pane's release build (`apps/outlook-addin/dist`) and its manifest; there is no web hosting and no separate add-in release file. Users install the add-in as described in [Install](#install), from their own computer. The add-in ID and the origin `https://localhost:41537` must not change after the first release ([Decisions](#decisions-that-stay-fixed-unless-discussed)).

A Microsoft Marketplace (AppSource) listing is not possible this way. Checked on 2026-10-25 against the [commercial marketplace certification policies](https://learn.microsoft.com/en-us/legal/marketplace/certification-policies):

- Marketplace add-ins are hosted on a web server with a valid, trusted certificate (1100.5; [Privacy and security](https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/privacy-and-security)); the store's production-level manifest check does not accept `localhost` addresses ([Validate a manifest](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/troubleshoot-manifest)).
- Outlook add-ins must work in Outlook on the web, and add-ins on every platform their requirement sets allow, Mac included (1120.3, 1120.4); reviewers test on all of them and would not install a helper app.
- The manifest version must be at least 1.0 (the validator rejects `0.1.0.0`).

A store version would be a second shape of the add-in: a pane on a public HTTPS address (a Writehand web host, static) that works on its own with API keys on every platform, with the plans as an optional extra. The new Outlook does not let a public page reach the helper app (Local Network Access is not delegated to the add-in's frame, measured), so the plans would not work there from a store install. It would also need a Partner Center account for a company (no fee), a privacy policy, support and terms pages, test keys for the reviewers and a review of several weeks. Not planned; decide before the first release whether to pursue it.

## Development on Windows

Every command runs from the repository root. Microsoft's sources for this section: [Sideload Outlook add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/sideload-outlook-add-ins-for-testing), [New Outlook on Windows](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/one-outlook), [Debug with Edge DevTools](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/debug-add-ins-using-devtools-edge-chromium), [Clear the Office cache](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/clear-cache) (read on 2026-10-23).

| Command | What it does |
| --- | --- |
| `pnpm addin:build` | The release build in `apps/outlook-addin/dist/`, with `manifest.xml` for `https://localhost:41537` and the empty token tag the helper app fills. The helper app's builds (`pnpm ai:build`, `pnpm ai:sea`) carry it, so build it first (`pnpm build` does) |
| `pnpm ai:build`, `pnpm ai:install` | The helper app as a script for Node.js, installed for this user (`install --dev`); then `writehand outlook enable` serves the pane you built. Run `pnpm addin:build && pnpm ai:build && pnpm ai:install` after a change, then `writehand outlook enable` once (a development install's server runs on a windowless copy of Node.js) |
| `pnpm ai:sea` | The single-file helper app with the pane inside, in `apps/ai-companion/dist/sea/`; `writehand.exe install` installs it |
| `pnpm addin:certs` | A development certificate for `https://localhost:3000` (`office-addin-dev-certs`: a "Developer CA for Microsoft Office Add-ins" in the current user's trusted roots, valid for 30 days). Only for the development server below |
| `pnpm addin:dev` | The task pane on `https://localhost:3000` with hot reload and its development manifest at `/manifest.xml`. Without the helper app it offers API keys only |
| `pnpm addin:build:local`, `pnpm addin:serve` | A production build for `https://localhost:3000` in `dist-local/`, served on that address |
| `pnpm addin:build:sample` | The same with local sample providers instead of Groq, OpenRouter and OpenAI: any key of ten or more characters connects, results are labeled samples of their input, and nothing goes over the network. For checks in a real Outlook without an AI account |
| `pnpm addin:validate` | Validates `dist-local/manifest.xml` with Microsoft's `office-addin-manifest`. It **sends the manifest to Microsoft's validation service** (`validationgateway.omex.office.net`), so it is not part of `pnpm check` |
| `pnpm addin:outlook [--devtools] [--restart]` | Starts the new Outlook, with Edge DevTools (`olk.exe --devtools`) if asked; `--restart` closes a running one first |

A development manifest from `pnpm addin:dev` or `dist-local` and the helper app's manifest have the same add-in ID but different addresses: remove one in **Custom Addins** before adding the other. The new Outlook loaded panes from `https://localhost:3000` and `https://localhost:41537` without a loopback exemption (2026-10-23, 2026-10-25); the `CheckNetIsolation LoopbackExempt` step in older guides was for the retired EdgeHTML webview.

**Debug the task pane.**

- New Outlook: close it and start it with `pnpm addin:outlook --devtools`. Right-click and Ctrl+Shift+I do not work in the new Outlook. A remote debugging port cannot be opened: the new Outlook passes its own arguments to its webviews and ignores `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, so automated checks of a real client go through Windows UI Automation ([Manual testing](./MANUAL_TESTING.md#7-outlook-add-in)).
- Classic Outlook (documented, unchecked): right-click in the task pane and choose **Inspect**, or press Ctrl+Shift+I with the pane focused.
- The helper app's server: `writehand outlook status`; it writes nothing to a console (it has none).

**Load changes.** A change to the pages: build again (and the helper app, see above), then close and reopen the pane. A change to the manifest (version, buttons, texts, permissions): remove and add the add-in again. If Outlook still shows the old one, clear its cache: in the new Outlook open DevTools (`--devtools`), **Network**, right-click, **Clear browser cache**; in classic Outlook close Outlook and delete `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\` (or run `npx office-addin-cache clear`).

## Testing

### Automated tests

- `tests/support/office/fake-office.ts`: an in-memory Office.js subset (`context.mailbox.item` in read or compose mode with `body.getAsync`, `getTypeAsync`, `setAsync`, `prependAsync`, `setSelectedDataAsync`, `getSelectedDataAsync`, `getComposeTypeAsync`, `displayReplyFormAsync`, `displayReplyForm`, `addHandlerAsync` for `ItemChanged`, `requirements.isSetSupported`, `userProfile`) over a DOM document of the body.
- `tests/fixtures/outlook-addin/bodies.ts`: synthetic bodies in the web and new Outlook dialect and in classic Outlook's Word HTML (made-up text; the Word bookmarks are unchecked).
- Vitest project `outlook-addin`: the shared `MailConnector` contract, the connector, the manifest (the read button, the draft's menu and the pane address of each command), the pane's command from its address, the Content Security Policy, storage, the clipboard fallback, the sample providers and the helper app bridge (token, requests, failures, cancellation after a timeout).
- Vitest project `session`: the panel controller opening the panel with a menu command (revise runs at once, translate and write wait).
- Vitest project `ai-connection`: the method routing for a page without and with the helper app.
- Vitest project `unit`: the helper app's certificates (TLS from a client that trusts only the authority, name constraints), the add-in server (Host, Origin and token checks, files, control requests), `writehand outlook enable` (the add-in dialog and the clipboard the first time only), `install --outlook`, `disable`, refresh after install and `status` with fake Windows tools, the windowless program copy and the pane's token.
- Playwright project `outlook-addin` (`tests/e2e/outlook-addin/`): the release build with the fake Office.js and a stubbed Groq: first run with a key, a reply on a received email, a selection in a draft, the menu's **Revise** revising a selection without another click, the page outside Outlook, and the page as the helper app serves it, drafting a reply with the ChatGPT plan through `/api/host`. It checks the hosts contacted and that nothing was logged as an error.
- `pnpm verify:addin` checks the release build: the pages' Content Security Policy, Office.js as the only remote script, the empty token tag, no development code and the manifest's ID, version, origin (`https://localhost:41537`) and permission.

Passing these says nothing about a real Outlook.

### Real clients

The checklist and every recorded run are in [Manual testing → Outlook add-in](./MANUAL_TESTING.md#7-outlook-add-in). The runs found problems the automated tests could not: the new Outlook gives a new message a conversation ID before it is saved, refuses the Clipboard API to add-in frames, and an open pane lost the helper app after a server restart (a new token per start). All three are fixed and checked again in that client.

## Open checks for the preview

1. Real-client checks of an API key provider from the pane and of **Draft reply** with a received email as context.
2. Classic Outlook for Windows (Word HTML bodies, `bodyMode` ignored, Outlook's undo after a write).
3. The helper app's install and update with the add-in on a clean Windows machine, recorded in [Manual testing](./MANUAL_TESTING.md#7-outlook-add-in); `docs/RELEASING.md` for the add-in inside the helper app.

Later: Outlook for Mac (the helper app serving the pane there, with the certificate in the login keychain); whole conversations through Microsoft Graph, opt-in; splitting the quoted mail into messages; replacing the user's part of a non-empty reply through `bodyMode`.

## Risks and open questions

| # | Risk or unknown | Source | Status and mitigation |
| --- | --- | --- | --- |
| 1 | `setSelectedDataAsync` inserts "at the top of the body content" if "the body lost focus in the UI" | [Body reference](https://learn.microsoft.com/en-us/javascript/api/outlook/office.body?view=outlook-js-preview) | Did not occur in the new Outlook. The selection is checked before the write and the body verified after it |
| 2 | Inline CSS "not supported" in body writes; tables and charts use inline styles | Body reference | Kept in the new Outlook; other clients unchecked |
| 3 | Body HTML differs per client, so signature and quote detection may miss | Not documented | Conservative `canReplaceBody`; synthetic fixtures per dialect |
| 4 | The pane needs the helper app's server: if it does not run, Outlook cannot load the pane | Design | It starts at sign-in and is handed over on updates; `writehand outlook status` reports it |
| 5 | The user must trust a local certificate authority, and renew it before it expires (825 days) | Office requires HTTPS with a trusted certificate | Name constraints limit it to `localhost`, `127.0.0.1` and `::1`; its private key is never stored; `outlook status` shows the date; `outlook enable` renews |
| 6 | Port 41537 may be taken by another program, or by another user's server on a computer several people use at once (Remote Desktop, multi-session Windows) | The manifest fixes the port | The server stops quietly when the port is taken; the pane then does not load. On a shared computer only the first user's server runs. Another user's server cannot stand in for this user's: this user's Windows does not trust its certificate, and it does not know this user's page key. Not seen so far |
| 7 | The frames around the pane may differ per client (`frame-ancestors`) | Measured only in the new Outlook | Check classic Outlook; widen the list if a client frames the pane from another Outlook origin |
| 8 | Outlook on the web in a browser frames the pane from a public page; the browser may block or prompt for the `https://localhost` frame (Local Network Access) | [Chrome: Local Network Access](https://developer.chrome.com/blog/local-network-access) | Not a target: the browser extension serves Outlook on the web |
| 9 | Provider CORS is observed, not promised, by Groq and OpenRouter | Preflight check 2026-10-22 | A provider that closes CORS disables that provider in the add-in only |
| 10 | Administrators can block sideloading; group policy may block the per-user sign-in entry | [New Outlook on Windows](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/one-outlook) | Admin deployment documented; `writehand outlook status` shows a server that does not run |
| 11 | The reference says a new message's `conversationId` is null until saved; the new Outlook gives one at once | MessageCompose reference; seen in the new Outlook | Fixed: the compose type decides |
| 12 | `displayReplyFormAsync` and `getComposeTypeAsync` per client | MessageRead and MessageCompose references | Both work in the new Outlook |
| 13 | The host may refuse clipboard writes in the add-in's frame | Seen in the new Outlook | The pane falls back to the copy command, which worked there |

## Decisions that stay fixed unless discussed

Changing these silently would break installed add-ins, the privacy promises or the architecture.

1. **Manifest:** add-in only (XML), minimum Mailbox 1.5, `ReadWriteItem`, messages only, one pinnable task pane: a button opens it on a received message, and a menu on a draft opens it with a command (`taskpane.html?command=revise|translate|write`) or without one. No event-based activation, no on-send handlers, no function commands.
2. **Identity:** the add-in ID (`OUTLOOK_ADDIN_ID`) and its origin `https://localhost:41537` (`OUTLOOK_ADDIN_ORIGIN` in `contracts/src/brand.ts`) never change after the first release.
3. **Served by the helper app:** the pane comes from the user's own computer, from the signed helper app release; the plans are reached on the pane's own origin, never across origins. Outlook support in the helper app is opt-in (`writehand outlook enable`).
4. **No server, no mailbox access:** no Writehand web server, Graph, EWS, roaming settings or any request beyond the open item without an explicit, documented, opt-in change. No analytics, error reporting or remote configuration.
5. **Connections:** the pane may connect only to its own origin (the helper app), the user's chosen API key provider among the three and Microsoft's Office.js CDN; the CSP and the package check encode the list; any addition updates `PRIVACY.md` in the same change. The helper app's server answers only the pane's requests listed in `OUTLOOK_BRIDGE_REQUESTS`.
6. **Never sends:** no write path may send; `displayReplyFormAsync` only opens a draft.
7. **Keys and tokens:** API keys are encrypted at rest with a non-extractable key in the pane origin's storage, never shown again, never roamed; ChatGPT tokens stay in the helper app.
8. **Package boundaries:** `session`, `ai-connection`, `locales` and `outlook-addin` with the ESLint rules above; `Office` only in the connector's `src/office/` and the app's `src/platform/`.
9. **Versioning:** one version for the extension, the helper app and the add-in; the manifest version is `x.y.z.0`.

## Office.js API use

| API | Set | Use | Source |
| --- | --- | --- | --- |
| `Office.onReady` | — | Bootstrap; outside Outlook the pane says where it runs and reads nothing | [Initialize](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/initialize-add-in) |
| `item.itemType`, `conversationId`, `itemId`, `subject`, `from`, `dateTimeCreated` | 1.1 | Item identity, context header | [MessageRead](https://learn.microsoft.com/en-us/javascript/api/outlook/office.messageread?view=outlook-js-preview) |
| `item.body.getAsync`, `getTypeAsync` | 1.3 / 1.1 | Draft and email body (HTML), the draft's body format | [Body](https://learn.microsoft.com/en-us/javascript/api/outlook/office.body?view=outlook-js-preview) |
| `item.getSelectedDataAsync` | 1.2 | Draft selection (compose only) | [MessageCompose](https://learn.microsoft.com/en-us/javascript/api/outlook/office.messagecompose?view=outlook-js-preview) |
| `item.body.setSelectedDataAsync`, `prependAsync`, `setAsync` | 1.1 / 1.1 / 1.3 | Writes; 1,000,000 characters each | Body |
| `item.getComposeTypeAsync` | 1.10 | New message, reply or forward (feature-detected) | MessageCompose |
| `item.displayReplyFormAsync`, `displayReplyForm` | 1.9 / 1.1 | Reply draft from a received email, 32 KB | MessageRead |
| `mailbox.addHandlerAsync(ItemChanged)` | 1.5 | Item switch in a pinned pane | [Pinnable task panes](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/pinnable-taskpane) |
| `Office.context.officeTheme`, `OfficeThemeChanged` | 1.14 | Theme colours (feature-detected; `isDarkTheme` is not supported in Outlook, so light or dark comes from the body colour) | [OfficeTheme](https://learn.microsoft.com/en-us/javascript/api/office/office.officetheme?view=outlook-js-preview) |
| `Office.context.partitionKey` | — | Storage namespace | [Persist add-in state](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/persisting-add-in-state-and-settings) |
| `Office.context.displayLanguage` | — | The interface language when set to Automatic | [Localization](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/localization) |
| `Office.context.requirements.isSetSupported` | — | Feature detection | [Requirement sets](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/outlook/outlook-api-requirement-sets) |
