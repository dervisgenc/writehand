# Outlook add-in

**Status: in development, not released (2026-10-23).** Writehand for the Outlook applications as an Office Add-in (Office.js), Windows first. It is built on the `feat/outlook-addin` branch and checked in one real client so far: the new Outlook for Windows, with the sample build (no AI provider). Classic Outlook for Windows, Outlook on the web and Outlook for Mac have not been checked in a real client, nor has a real AI provider from the task pane. There is no hosted add-in yet: the production origin is not chosen, so it is installed from a local build ([Development on Windows](#development-on-windows)).

This guide describes what the add-in does, how to install it, how it works and how to develop and test it. Platform facts were checked on learn.microsoft.com or the vendor's own documentation on 2026-10-22 and 2026-10-23 and link their source; what was seen in a real client is marked as such and recorded in [Manual testing](./MANUAL_TESTING.md#7-outlook-add-in). Facts that neither the documentation nor a real client confirms are marked **unconfirmed**.

See also: [Development guide](./DEVELOPMENT.md), [Manual testing](./MANUAL_TESTING.md#7-outlook-add-in), [Privacy policy](../PRIVACY.md#outlook-add-in-in-development), [Security policy](../SECURITY.md).

## What it does

- Browser extensions do not run inside the Outlook applications, so the add-in is a web page (the task pane) that Outlook loads from an HTTPS address and that works with the open item through Office.js.
- A **Writehand** command (under **Apps** in the new Outlook) opens the task pane on a received email or a draft. The pane holds the same panel as the extension: revise, translate, write or reply, refine the result, preview it, then apply it to the draft once or copy it. There are no buttons inside the email or the draft.
- In a draft it revises or translates the selected text, writes into an empty draft, or replaces the whole body of a new message without a signature or quote. On a received email it opens a new reply draft with the result.
- Context is the open item: the email you read, or the earlier mail quoted in your reply. You see and can edit it before anything is sent.
- It connects with your own **API key** from Groq, OpenRouter or OpenAI. The ChatGPT and Claude plans need the helper app, which the task pane cannot reach today ([AI connection](#ai-connection)).
- It never sends email: Office.js has no call that sends, and the add-in only writes into the open draft after you approve the preview, or opens a reply draft.

## Compared with the browser extension

| Area | Browser extension | Outlook add-in |
| --- | --- | --- |
| Where it runs | Outlook on the web in Firefox, Chrome, Edge and Brave; Gmail | The Outlook applications: the new Outlook and classic Outlook for Windows first; Outlook on the web and for Mac should work but are unchecked |
| How it opens | Toolbar inside each draft, result card next to the draft, **Draft reply** button in the reading pane, side panel | The **Writehand** command opens the task pane; everything happens in the pane. An add-in cannot place UI inside the draft. The pane can be pinned on Microsoft 365 accounts |
| Quick actions | One click in the draft revises or translates the selection | Open the pane, then choose the operation |
| Conversation context | Every message visible in the open conversation with its sender and date; up to 40 opened messages; related messages by subject | Read mode: the open email with its sender, exact date and subject; emails opened while the pane stays pinned are kept as other opened emails. Draft: the quoted earlier mail as one context item with unknown sender and date. The read pane and the draft's pane are separate, so what was read does not carry into the reply |
| Selection in a received email | Revise or translate it, then copy the result | Not available: Office.js reads selections only in drafts |
| Writing | The selection, the user's whole part of a reply above the signature and quote, or an empty draft | The selection, an empty draft, or the whole body of a new message without signature or quote. The user's part of a non-empty reply is not replaced as a whole ([Writing to the draft](#writing-to-the-draft)) |
| Result on a received email | Applied to an open reply draft | A new reply draft opened with the result (at most 32 KB), or copied |
| Rich results | Tables, lists and charts written as HTML | The same HTML; the new Outlook keeps its inline styles (checked) |
| Undo | The last apply, while the draft has not changed since | Only after replacing the whole body of a new message; elsewhere Outlook's own undo |
| Copy | Clipboard API | Clipboard API, or the copy command where Outlook refuses the API (the new Outlook does) |
| AI connection | API key, ChatGPT plan, Claude Code | API key only |
| Key storage | The extension's own origin; only the background decrypts a key | The add-in's origin, decrypted in the same page that shows email; separate in each Outlook application |
| Settings | Per browser profile | Per Outlook application; not shared with the extension |
| Theme | Outlook's colours read from the page | Office's theme colours (checked in the new Outlook) |
| Robustness | Depends on Outlook's page structure | A supported API; Outlook interface changes do not break it |
| Installation | One click from a browser store | A manifest file added per mailbox, or deployed by an administrator, who can also block it |
| Updates | Reviewed by the stores, installed automatically | A new page version reaches everyone when it is deployed; manifest changes need a reinstall |
| Network beyond the provider | None, apart from the helper app's daily update check | Every pane load fetches the page from its host and Office.js from Microsoft |

## Client support

| Client | Mailbox requirement sets | Pinnable task pane | Add-in only (XML) manifest | Webview | Real-client check |
| --- | --- | --- | --- | --- | --- |
| New Outlook for Windows (Microsoft 365 work or school account) | 1.1 to 1.16 | Yes | Yes | Edge WebView2 | **Checked** 2026-10-23 with the sample build ([record](./MANUAL_TESTING.md#7-outlook-add-in)) |
| Classic Outlook for Windows, Microsoft 365 subscription | 1.1 to 1.16 (1.16 from Version 2602) | Yes | Yes | Edge WebView2 | Not checked (not installed on the development machine) |
| Classic Outlook for Windows, perpetual (2021, 2024, LTSC) | 1.1 to 1.9 / 1.14 | Yes | Yes | Edge WebView2 | Not checked |
| Outlook on the web (Microsoft 365, Outlook.com) | 1.1 to 1.16 | Yes (Microsoft 365 only, not Outlook.com) | Yes | The user's browser (iframe) | Not checked |
| Outlook for Mac (new UI, 16.38.506+) | 1.1 to 1.14 | Yes (16.13+) | Yes | Safari WKWebView | Not checked |
| Outlook on iOS and Android | 1.1 to 1.5 | No | Read mode only | WKWebView, Chrome | Not supported: no compose add-ins |
| Outlook on the web, classic (Exchange on-premises) | 1.1 to 1.6 | No | Yes | The user's browser | Not supported |

Sources: [Outlook requirement sets and client table](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/outlook/outlook-api-requirement-sets), [Browsers and webview controls](https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/browsers-used-by-office-web-add-ins), [Pinnable task panes](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/pinnable-taskpane), [Outlook mobile add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/outlook-mobile-addins), [Outlook for Mac support](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/compare-outlook-add-in-support-in-outlook-for-mac).

- **Manifest:** the add-in only (XML) manifest, the only format every target accepts: the unified (JSON) manifest is not supported on Mac, perpetual Outlook or on-premises mailboxes ([unified manifest overview](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/unified-manifest-overview)), and converting later would give the add-in a new ID ([convert](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/convert-xml-to-json-manifest)). Writehand needs nothing the unified manifest adds.
- **Minimum requirement set:** Mailbox 1.5, the floor for `ItemChanged` and pinnable task panes. Newer calls are feature-detected with `Office.context.requirements.isSetSupported` ([Office.js API use](#officejs-api-use)).
- **Accounts:** Microsoft 365 work or school mailboxes, and Outlook.com mailboxes where the client allows add-ins. The new Outlook for Windows runs add-ins only with a work or school account on Exchange Online ([New Outlook on Windows](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/one-outlook)). POP, IMAP and Gmail accounts do not run add-ins ([Outlook add-ins overview](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/outlook-add-ins-overview)).

## Install

Until the first release there is no hosted add-in and no release manifest; developers install a local build as described in [Development on Windows](#development-on-windows). Once a release exists, its `manifest.xml` points to the hosted page and is installed in one of two ways:

| Path | Works for | How |
| --- | --- | --- |
| Add it yourself (sideload) | Microsoft 365 mailboxes whose users may add their own add-ins (the "My Custom Apps" role, on by default) | Open <https://aka.ms/olksideload> (Outlook on the web), choose **My add-ins → Custom Addins → Add a custom add-in → Add from File** and select the manifest. "Add from URL" no longer exists. The add-in then appears in every Outlook application that uses the mailbox: in the new Outlook after a restart, in classic Outlook within 24 hours ([Sideload Outlook add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/sideload-outlook-add-ins-for-testing)). Whether Outlook.com accounts can add one is **unconfirmed** |
| An administrator deploys it | Organizations on Exchange Online | Microsoft 365 admin center → **Integrated apps**, with the manifest file or its URL, for everyone, groups or users; 24 to 72 hours to appear ([Deploy add-ins in the admin center](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-deployment-of-add-ins)) |

Using it: open an email or a draft and choose **Writehand** on the ribbon. In the new Outlook it is under **Apps**; on a received email the ribbon may put **Apps** in its overflow menu (**…**). The first time, connect an API key in the pane; it is stored encrypted in that Outlook application only, so each Outlook application asks for it once.

To remove it, remove the key first (**Settings → AI connection → Remove key**) if you want it gone from that Outlook, then remove **Writehand** on the same **My add-ins** page. An administrator removes it in **Integrated apps**.

## How it works

### Runtime shape

```text
Outlook (new and classic for Windows, web, Mac)
  └─ task pane: one HTTPS page from the add-in's origin, Office.js from Microsoft's CDN
       ├─ @writehand/outlook-addin   MailConnector over Office.js (open item: read, selection, write, undo)
       ├─ @writehand/session         panel controllers, message history, settings store, Vue bridge
       ├─ @writehand/ui              the same WriterPanel, settings and connection components
       ├─ @writehand/locales         the five interface languages
       └─ @writehand/ai-connection   API key method: vault, providers, direct calls to Groq / OpenRouter / OpenAI
```

There is no content script, background or messaging layer: the task pane is one page, so `apps/outlook-addin/src/bootstrap/create-addin-session.ts` wires the session, the connector and the API key service together and the session calls the provider directly (`createDirectProcessor`).

### Packages

| Package or app | Responsibility | Must not use (ESLint) |
| --- | --- | --- |
| `packages/session` (`@writehand/session`) | The panel session both apps share: action, apply and panel controllers, message history, session store, `toPanelView`, `usePanelSession`, appearance, the settings store | WXT, `chrome`, `browser`, `Office`, `document`, `window`, web storage, `fetch`; `ai-connection`, the connectors |
| `packages/ai-connection` (`@writehand/ai-connection`) | The API key method: providers, key checks, the secret vault and its IndexedDB key store, the connection store, the API key service and the direct processor | Vue, WXT, `chrome`, `browser`, `Office`, `document`, `window`; `ui`, `core`, `session`, the connectors |
| `packages/locales` (`@writehand/locales`) | The `en`, `tr`, `de`, `fr` and `es` dictionaries of both apps, including the add-in's own texts (`addin-*.ts`) | Everything except `contracts` |
| `packages/mail-connectors/mail-dom` | Shared with the web connectors: text extraction, draft anatomy, and the quote and signature markers of mail HTML (`mail-markup.ts`, including the bookmarks of classic Outlook's Word HTML) | Office, the apps |
| `packages/mail-connectors/outlook-addin` (`@writehand/outlook-addin`) | `MailConnector` over Office.js. The real Office.js adapter is only in `src/office/`; everything else works against the small `OfficeMailbox` port, so it runs under a fake in tests | Vue, WXT, `ui`, `core`, `session`; `Office` outside `src/office/` |
| `apps/outlook-addin` (`@writehand/outlook-addin-app`) | The task pane (Vite and Vue): `taskpane.html` with its Content Security Policy, the `Office.onReady` bootstrap, `src/platform/` (Office host and theme, storage, clipboard), the panel, settings and first-run views, manifest generation | `Office` outside `src/platform/`; `chrome`, `browser`, WXT |

The settings form is a `ui` component (`SettingsForm`) used by the extension's options page and the add-in's settings view.

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

| Target | Office.js call | Verification | Undo | New Outlook (2026-10-23) |
| --- | --- | --- | --- | --- |
| `replace-selection` | `getSelectedDataAsync` again (it must still be the captured text), then `body.setSelectedDataAsync(text)` [1.1] | The body equals the previous text with the selection replaced, the signature and quote unchanged | None | Replaced in place after clicking **Apply to draft** in the pane |
| `insert-empty` (the user's part is empty) | `body.prependAsync(html or text)` [1.1], above any signature and quote | The body starts with the inserted text and keeps the rest | None | Written once |
| `replace-body` | Only in a new message without signature or quote: `body.setAsync(html)` [1.3] | The body equals the result | `body.setAsync(previousHtml)`, verified the same way | Replaced, then undone; no notification |
| `create-reply` (received email) | `displayReplyFormAsync({ htmlBody })` [1.9], or `displayReplyForm` [1.1]; at most 32 KB, larger results are refused with `REPLY_TOO_LARGE` | Outlook opened the draft; nothing to read back | None; the user discards the draft | Opened a reply draft in its own window, starting with the result |

Not used: `body.setAsync` on a draft that contains a signature or quoted thread. In Outlook on the web and the new Outlook it replaces "the entire body of a message, including previous messages from the conversation thread" and shows a notification; the `bodyMode` option that limits it is ignored on classic Windows and Mac ([Insert data in the body](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/insert-data-in-the-body)), and a body read and written back is not necessarily the same ("the value returned by Body.getAsync won't necessarily be the exact same value"). So in a reply the user revises or translates a selection, or writes into an empty reply.

Rich results (tables, lists, charts) are written as HTML through the same calls. The Body reference says every write method "doesn't support inline CSS"; `email-format` uses inline styles for table borders and chart bars. The new Outlook kept them (borders, header shading and padding of a written table); the other clients are unchecked.

### AI connection

**API key method.** The three providers answer browser requests with `Access-Control-Allow-Origin: *` and allow the `Authorization` header, and all stream with plain server-sent events, so the provider code runs unchanged in the task pane with `fetch` (preflight requests checked on 2026-10-22; Groq and OpenRouter do not document CORS as a promise). From the task pane in a real Outlook this is **unconfirmed**: the 2026-10-23 run used the sample build.

Key storage follows the extension's model: AES-GCM with a non-extractable key kept as a `CryptoKey` in the add-in origin's IndexedDB, ciphertext in `localStorage`, both namespaced with `Office.context.partitionKey` where Office provides one ([Persist add-in state](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/persisting-add-in-state-and-settings)). In the new Outlook the key survived closing and reopening Outlook. What differs from the extension:

- Storage is per Outlook application: a key connected in Outlook on the web is not available in the new Outlook for Windows, and the other way round.
- In Outlook on the web the add-in's storage is partitioned under the Outlook site; in Safari partitioned storage lasts only for the session ([WebKit 168631](https://bugs.webkit.org/show_bug.cgi?id=168631)), so the key would have to be entered again after Safari restarts. Mac is **unconfirmed**.
- `OfficeRuntime.storage` is not available to Outlook task panes, and roaming settings live in the mailbox and "shouldn't be used to store sensitive information" ([RoamingSettings](https://learn.microsoft.com/en-us/javascript/api/outlook/office.roamingsettings)). Neither is used.
- There are no host permissions: the page's Content Security Policy allows connections only to the three providers and the Office.js CDN, and the package check enforces it.
- The key is decrypted in the same page that reads and shows email, and that page's code is loaded from the host on every open. The security of the hosting origin is the security of the key ([Hosting](#hosting-planned)).

**ChatGPT and Claude plans (later).** The helper app would have to listen on `127.0.0.1` and the pane would call it from an HTTPS origin. WebKit still treats `http://127.0.0.1` as mixed content ([WebKit 171934](https://bugs.webkit.org/show_bug.cgi?id=171934)), so Outlook for Mac cannot reach it; Chromium's Local Network Access needs a permission that a framed add-in must be granted, and Outlook passes it through inconsistently ([Chrome blog](https://developer.chrome.com/blog/local-network-access), [office-js issue 6400](https://github.com/OfficeDev/office-js/issues/6400)). The helper app would also become a listening local server, which changes its security model. This needs its own spike: success is a `fetch` from the task pane to `http://127.0.0.1` on Windows and the web after one permission prompt; otherwise the plans stay extension-only.

### Context

Office.js exposes only the open item.

| Source | Status |
| --- | --- |
| The open email, or the quoted mail inside the draft (`body.getAsync`) | Used. No permission beyond the item |
| Emails opened while the pane is pinned (`ItemChanged`) | Used, within one pane instance. Microsoft 365 only. In the new Outlook a pinned pane followed each opened email; switching to a draft's tab closed it |
| Microsoft Graph with nested app authentication (`Mail.Read`, filtered by `conversationId`) | Later, opt-in: needs an Entra app registration and consent, not for Outlook.com ([NAA requirement sets](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/common/nested-app-auth-requirement-sets)) |
| Exchange Web Services | Not used: disabled in Exchange Online from October 2026 to April 2027 ([EWS retirement](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-ews-exchange-online)) |
| `loadItemByIdAsync` [1.15] | Not used: IDs come only from Graph or multi-select; not on Mac |

## Permissions and data flow

| What | Value | Why |
| --- | --- | --- |
| Manifest permission | `ReadWriteItem` | Reading and writing the open item's body and selection. Not `ReadWriteMailbox`: the add-in never reads other items, headers or the mailbox |
| Activation | Messages in read and compose forms, one task pane command each, pinnable | No appointments, no event-based activation, no on-send handlers; nothing runs while the pane is closed |
| Content Security Policy (meta tag) | `default-src 'none'`; `script-src 'self'` and the Office.js CDN; `connect-src 'self'`, `api.groq.com`, `openrouter.ai`, `api.openai.com` and the CDN; `style-src 'self'`; `style-src-attr 'unsafe-inline'`; `img-src 'self' data:`; `font-src 'self'`; `object-src 'none'`; `base-uri 'none'`; `form-action 'none'` | The page can talk only to the chosen provider and Microsoft's library. Style attributes are needed by Vue and the formatted preview; style elements come only from the add-in's own files. The new Outlook ran the page under it without a violation |
| Office.js | `https://officeapis.public.onecdn.static.microsoft/1/office.js` ([Referencing Office.js](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/referencing-the-javascript-api-for-office-library-from-its-cdn)) | The only remote script; the package check allows exactly that one |
| Storage | `localStorage` and IndexedDB of the add-in origin, namespaced by `partitionKey` | Settings and the encrypted key stay in the Outlook application; nothing roams through the mailbox |
| Clipboard | Written only when you press **Copy**: the Clipboard API, or the copy command where the host refuses it; never read | The new Outlook refuses the Clipboard API to add-in frames |

Data flow of one generation: you press a button in the pane → the connector reads the open item through Office.js, in memory only → the panel shows the context and you decide what is sent → the pane sends the request straight to the chosen provider with your key → the preview appears → you apply it and the connector writes the draft once. The add-in's host receives only requests for the page's files (and, like any website, sees the IP address and user agent); Microsoft's CDN serves Office.js; Outlook mediates every Office.js call. No email content, key or request goes to the host or to Writehand. [PRIVACY.md](../PRIVACY.md#outlook-add-in-in-development) states this for users.

## Hosting and distribution (planned)

### Hosting (planned)

Not set up yet; the production origin is a build parameter (`WRITEHAND_ADDIN_ORIGIN`). The plan:

- **Where:** static files on an origin that serves nothing but the add-in, for example the GitHub Pages site of a dedicated organization or a custom subdomain. Not `https://dervisgenc.github.io/writehand/`: every Pages project of a personal account shares the `<account>.github.io` origin, so storage and permissions would be shared with anything else published there. Microsoft requires only HTTPS with a trusted certificate ([Deploy and publish](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish)).
- **How:** the release workflow builds the task pane into `writehand-<version>-outlook-addin.zip` and `writehand-<version>-outlook-manifest.xml`, listed in the signed `SHA256SUMS` and attested like the other release files; a Pages workflow deploys exactly the files of a verified release.
- **Limits:** a static host sets no response headers, so the Content Security Policy is a meta tag (no `frame-ancestors`). Office.js cannot use subresource integrity, because its URL serves a rolling version; the add-in's own files are same-origin and content-hashed.
- **Self-hosting:** anyone can host the build under their own origin by building with that origin.
- The add-in ID and the hosting origin must not change after the first release ([Decisions](#decisions-that-stay-fixed-unless-discussed)).

### Distribution

The first release offers the two install paths above. A Microsoft Marketplace (AppSource) listing comes later: it needs a Partner Center account, support and privacy URLs, certification notes with a test connection, and the add-in must work on every platform its requirement sets declare ([Publish to AppSource](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish-office-add-ins-to-appsource)).

## Development on Windows

Every command runs from the repository root. Microsoft's sources for this section: [Sideload Outlook add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/sideload-outlook-add-ins-for-testing), [New Outlook on Windows](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/one-outlook), [Debug with Edge DevTools](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/debug-add-ins-using-devtools-edge-chromium), [Clear the Office cache](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/clear-cache) (read on 2026-10-23).

| Command | What it does |
| --- | --- |
| `pnpm addin:certs` | Installs a development certificate for `https://localhost:3000` with `office-addin-dev-certs`: a "Developer CA for Microsoft Office Add-ins" in the current user's trusted root store (Windows asks you to confirm) and `localhost.crt`/`localhost.key` in `~/.office-addin-dev-certs`. Valid for 30 days; run it again when it expires. Version 3.0.1 sends no usage data. Development only |
| `pnpm addin:dev` | The task pane on `https://localhost:3000` with hot reload; its Content Security Policy also allows the reload websocket and inline styles. It serves the development manifest at `/manifest.xml` |
| `pnpm addin:build:local` | A production build for `https://localhost:3000` in `apps/outlook-addin/dist-local/`, with the production Content Security Policy and `manifest.xml`: what users get |
| `pnpm addin:build:sample` | The same with local sample providers instead of Groq, OpenRouter and OpenAI: any key of ten or more characters connects, results are labeled samples of their input, and nothing goes over the network. For checks in a real Outlook without an AI account. Production builds do not contain it, and `pnpm verify:addin` fails if they do |
| `pnpm addin:serve` | Serves `dist-local/` on `https://localhost:3000` |
| `pnpm addin:build` | The release build in `apps/outlook-addin/dist/`. With `WRITEHAND_ADDIN_ORIGIN=https://…` (an HTTPS origin other than localhost, without a path) it also writes `manifest.xml` for that origin |
| `pnpm addin:validate` | Validates `dist-local/manifest.xml` with Microsoft's `office-addin-manifest`. It **sends the manifest to Microsoft's validation service** (`validationgateway.omex.office.net`), so it is not part of `pnpm check`; the manifest holds no personal data. `pnpm check` checks the manifest locally |
| `pnpm addin:outlook [--devtools] [--restart]` | Starts the new Outlook, with Edge DevTools (`olk.exe --devtools`) if asked; `--restart` closes a running one first |

**Install the local build in your mailbox.** The new Outlook needs a Microsoft 365 work or school mailbox on Exchange Online ("doesn't currently support on-premises, hybrid, or sovereign Exchange accounts"), and your organization must let users add their own add-ins.

1. Run `pnpm addin:certs` once, then `pnpm addin:build:local` (or `addin:build:sample`) and `pnpm addin:serve`. Open `https://localhost:3000/taskpane.html` in Edge once: it must load without a certificate warning (it says that it runs inside Outlook).
2. Open <https://aka.ms/olksideload>, sign in with the same mailbox and choose **My add-ins → Custom Addins → Add a custom add-in → Add from File**. Select `apps/outlook-addin/dist-local/manifest.xml`. The new Outlook's own **Apps** store has no custom upload.
3. Restart Outlook. In the new Outlook, **Writehand** appeared under **Apps** in new messages after the first restart and on received emails by the next one. Classic Outlook may take up to 24 hours; there, **File → Info → Manage Add-ins** opens the same page.

The new Outlook loaded the pane from `https://localhost:3000` without a loopback exemption (2026-10-23). The `CheckNetIsolation LoopbackExempt` step in older guides was for the retired EdgeHTML webview; classic Outlook is unchecked. To remove the add-in, remove **Writehand** under **Custom Addins**; `pnpm addin:certs` left the development CA in the current user's root store, which `npx office-addin-dev-certs uninstall` removes.

**Debug the task pane.**

- New Outlook: close it and start it with `pnpm addin:outlook --devtools`. Right-click and Ctrl+Shift+I do not work in the new Outlook. A remote debugging port cannot be opened: the new Outlook passes its own arguments to its webviews and ignores `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, so automated checks of a real client go through Windows UI Automation ([Manual testing](./MANUAL_TESTING.md#7-outlook-add-in)).
- Classic Outlook (documented, unchecked): right-click in the task pane and choose **Inspect**, or press Ctrl+Shift+I with the pane focused. To catch the pane's start, set `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--auto-open-devtools-for-tabs` before starting Outlook.

**Load changes.** A change to the pages: build again and close and reopen the pane (with `pnpm addin:dev`, hot reload does it). A change to the manifest (version, buttons, texts, permissions): remove and add the add-in again. If Outlook still shows the old one, clear its cache: in the new Outlook open DevTools (`--devtools`), **Network**, right-click, **Clear browser cache**; in classic Outlook close Outlook and delete `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\` (or run `npx office-addin-cache clear`).

## Testing

### Automated tests

- `tests/support/office/fake-office.ts`: an in-memory Office.js subset (`context.mailbox.item` in read or compose mode with `body.getAsync`, `getTypeAsync`, `setAsync`, `prependAsync`, `setSelectedDataAsync`, `getSelectedDataAsync`, `getComposeTypeAsync`, `displayReplyFormAsync`, `displayReplyForm`, `addHandlerAsync` for `ItemChanged`, `requirements.isSetSupported`, `userProfile`) over a DOM document of the body. A selection is replaced in place; with `focusLost` set, `setSelectedDataAsync` writes at the top of the body, as the Body reference documents.
- `tests/fixtures/outlook-addin/bodies.ts`: synthetic bodies in the web and new Outlook dialect and in classic Outlook's Word HTML (made-up text; the Word bookmarks are unchecked).
- Vitest project `outlook-addin`: the shared `MailConnector` contract, the connector's reading, compose-type resolution, writing, verification, undo, new reply, events and polling, the manifest, the Content Security Policy, storage, the clipboard fallback and the sample providers.
- Playwright project `outlook-addin` (`tests/e2e/outlook-addin/`): the production build with the fake Office.js in place of Microsoft's file and a stubbed Groq: first run, a reply on a received email, a selection in a draft, the page outside Outlook. It also checks that only the page's origin, Office.js and the provider were contacted and that nothing was logged as an error (a Content Security Policy violation is one).
- `pnpm verify:addin` checks the production build: the pages' Content Security Policy, Office.js as the only remote script, no development code and, when written, the manifest's ID, version, origin and permission.

Passing these says nothing about a real Outlook.

### Real clients

The checklist and every recorded run are in [Manual testing → Outlook add-in](./MANUAL_TESTING.md#7-outlook-add-in). The run of 2026-10-23 in the new Outlook found two problems the automated tests could not: the new Outlook gives a new message a conversation ID before it is saved, and it refuses the Clipboard API to add-in frames. Both are fixed and checked again in that client.

## Work before the first release

1. Real-client checks with a real API key (connecting, models, generation and CORS from the pane) and of **Draft reply** with a received email as context.
2. Classic Outlook for Windows (Word HTML bodies, `bodyMode` ignored, Outlook's undo after a write), Outlook on the web and Outlook for Mac.
3. Hosting and release: the origin, a CI job, release assets, the Pages workflow, `docs/BUILD.md` and `docs/RELEASING.md`.

Later: the helper app bridge and the ChatGPT and Claude plans; whole conversations through Microsoft Graph, opt-in; splitting the quoted mail into messages; replacing the user's part of a non-empty reply through `bodyMode`, after checks; ribbon quick actions; an AppSource listing.

## Risks and open questions

| # | Risk or unknown | Source | Status and mitigation |
| --- | --- | --- | --- |
| 1 | `setSelectedDataAsync` inserts "at the top of the body content" if "the body lost focus in the UI"; the pane takes focus before the user presses the button | [Body reference](https://learn.microsoft.com/en-us/javascript/api/outlook/office.body?view=outlook-js-preview) | Did not occur in the new Outlook. The selection is checked right before the write and the body verified after it; a mismatch is `uncertain` |
| 2 | Inline CSS "not supported" in body writes; tables and charts use inline styles | Body reference | Kept in the new Outlook; other clients unchecked. Fallbacks: attribute-based tables or `features.richContent: false` |
| 3 | Body HTML differs per client (the web and new Outlook, Word HTML in classic Outlook, WebKit on Mac), so signature and quote detection may miss | Not documented | Conservative `canReplaceBody`; synthetic fixtures per dialect; `insert-empty` and `replace-selection` do not depend on the boundary |
| 4 | Storage persistence: Safari keeps partitioned storage for the session only; the Mac webview is unknown | [Persist add-in state](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/persisting-add-in-state-and-settings), [WebKit 168631](https://bugs.webkit.org/show_bug.cgi?id=168631) | Persisted in the new Outlook across restarts. The key can always be entered again |
| 5 | The Content Security Policy must allow Office.js from its new CDN | [Referencing Office.js](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/referencing-the-javascript-api-for-office-library-from-its-cdn) | No violation in the new Outlook; the package check keeps the list explicit |
| 6 | Pinnable panes and `ItemChanged` are not available for Outlook.com accounts | [Pinnable task panes](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/pinnable-taskpane) | The pane closes on an item switch there; the open item is enough context |
| 7 | Administrators can block sideloading; the new Outlook needs a work or school account on Exchange Online | [New Outlook on Windows](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/one-outlook) | Admin deployment documented |
| 8 | The hosting origin is outside Writehand's control and sets no headers | [Deploy and publish](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish) | Meta-tag CSP; self-hosting possible; the origin is chosen once |
| 9 | Provider CORS is observed, not promised, by Groq and OpenRouter; not yet tried from a real task pane | Preflight check 2026-10-22 | A provider that closes CORS disables that provider in the add-in only |
| 10 | Helper app bridge: Safari blocks loopback; Chromium needs a Local Network Access permission | [WebKit 171934](https://bugs.webkit.org/show_bug.cgi?id=171934), [office-js 6400](https://github.com/OfficeDev/office-js/issues/6400) | Not in the first release |
| 11 | The reference says a new message's `conversationId` is null until saved; the new Outlook gives one at once. It also "will change" if the user edits a reply's subject | [MessageCompose reference](https://learn.microsoft.com/en-us/javascript/api/outlook/office.messagecompose?view=outlook-js-preview); seen in the new Outlook | Fixed: the compose type decides whether a draft is a reply. Thread identity is read once per item and on `ItemChanged` |
| 12 | Mac stops at Mailbox 1.14: no `loadItemByIdAsync`, no `bodyMode` | [Requirement sets](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/outlook/outlook-api-requirement-sets) | Neither is used |
| 13 | `displayReplyFormAsync` on Mac and classic Windows is supported only by omission in the docs; 32 KB limit | [MessageRead reference](https://learn.microsoft.com/en-us/javascript/api/outlook/office.messageread?view=outlook-js-preview) | Works in the new Outlook. Results over 32 KB are refused and can be copied |
| 14 | `getComposeTypeAsync` [1.10] per client is not stated | MessageCompose reference | Works in the new Outlook. Without it, a non-null `conversationId` counts as a reply |
| 15 | The page that holds the decrypted key is loaded from the host on every open; a compromised host reaches every user's key and open email without store review | [Deploy and publish](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish) | Dedicated origin, deploys only from signed release files, strict CSP; keys with spending limits recommended |
| 16 | The host may refuse clipboard writes in the add-in's frame | Seen in the new Outlook: the Clipboard API is refused even on a click | The pane falls back to the copy command, which worked there; if both fail, the result stays selectable and the pane says so |

## Decisions that stay fixed unless discussed

Changing these silently would break installed add-ins, the privacy promises or the architecture.

1. **Manifest:** add-in only (XML), minimum Mailbox 1.5, `ReadWriteItem`, messages only, one pinnable task pane command in read and compose. No event-based activation, no on-send handlers.
2. **Identity:** the add-in ID (`OUTLOOK_ADDIN_ID` in `contracts/src/brand.ts`) and the hosting origin never change after the first release.
3. **No server, no mailbox access:** no Graph, EWS, roaming settings or any request beyond the open item without an explicit, documented, opt-in change. No analytics, error reporting or remote configuration.
4. **Connections:** only the user's chosen provider among the three and Microsoft's Office.js CDN; the CSP and the package check encode the list; any addition updates `PRIVACY.md` in the same change.
5. **Never sends:** no write path may send; `displayReplyFormAsync` only opens a draft.
6. **Keys:** encrypted at rest with a non-extractable key in the add-in origin's storage, never shown again, never roamed.
7. **Package boundaries:** `session`, `ai-connection`, `locales` and `outlook-addin` with the ESLint rules above; `Office` only in the connector's `src/office/` and the app's `src/platform/`.
8. **Versioning:** one version for the extension, the helper app and the add-in; the manifest version is `x.y.z.0`.

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
