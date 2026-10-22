# Outlook add-in

**Status: deferred (2026-10-23).** Gmail on the web comes first; this plan is kept for later and its decisions are still open. This document records the plan for bringing Writehand to the Outlook applications as an Office Add-in (Office.js), the facts it rests on, and the decisions that must not change without discussion. Once the add-in ships, it becomes the add-in's guide (install, architecture, hosting, testing) and the plan sections are trimmed.

Every platform fact below was checked on learn.microsoft.com or the vendor's own documentation on 2026-10-22; the source is linked next to it. Facts that could not be confirmed from documentation are marked **unconfirmed** and listed under [Risks and open questions](#risks-and-open-questions). Nothing in this document has been verified in a real Outlook client yet; synthetic tests and real-client checks are reported separately.

See also: [Development guide](./DEVELOPMENT.md), [Manual testing](./MANUAL_TESTING.md), [Privacy policy](../PRIVACY.md), [Security policy](../SECURITY.md).

## Summary

- Browser extensions do not run inside the Outlook applications, so the only supported way in is an **Office Add-in**: a web page (the task pane) that Outlook loads from an HTTPS address and that talks to the open message through Office.js.
- One add-in covers **Outlook on the web, the new Outlook for Windows, classic Outlook for Windows and Outlook for Mac**. Mobile Outlook does not run compose add-ins, so it is out of scope.
- The add-in reuses everything that is not tied to the browser: `contracts`, `core`, `email-format`, `ui`, the three AI provider packages and, after extraction from the extension app, the panel session controllers, the locale dictionaries and the API key connection. New code is one connector package over Office.js and a thin task pane app.
- The first release connects with an **API key only** (Groq, OpenRouter, OpenAI). The ChatGPT and Claude plans need the helper app, which a task pane cannot reach reliably today (Safari blocks loopback; Chromium needs a Local Network Access permission that Outlook does not pass through consistently). That bridge is a later phase with its own spike.
- Context comes from the **open item**: in a reply draft, the quoted earlier messages inside the draft; in read mode, the open message. Reading the rest of the conversation through Microsoft Graph needs an Entra app registration and consent, and is deferred.
- Hosting is **static files on GitHub Pages under an origin used for nothing else**, built and signed by the release workflow. There is still no Writehand server: the page is served like the extension's files are served by a store, and no email content or key ever goes to that host. The privacy policy states this.
- Distribution for the first release: users add the manifest file themselves (sideload) or an administrator deploys it from the Microsoft 365 admin center. AppSource is a later phase.

## Compared with the browser extension

The core flow carries over: the four operations, refinement, preview, a single verified write after approval, reviewing and editing the context before it is sent, five interface languages and the API key method. The differences come from what Office.js allows and from the first release's scope.

| Area | Browser extension | Outlook add-in, first release |
| --- | --- | --- |
| Where it runs | Outlook on the web in Firefox, Chrome, Edge and Brave | Outlook on the web, new Outlook for Windows, classic Outlook for Windows, Outlook for Mac |
| How it opens | Toolbar inside each draft, result card next to the draft, **Draft reply** button in the reading pane, side panel | A ribbon button opens the task pane; everything happens in the pane. An add-in cannot place UI inside the draft. The pane can be pinned on Microsoft 365 accounts |
| Quick actions | One click in the draft revises or translates the selection | Open the pane, then choose the operation; ribbon quick actions in phase 2 |
| Conversation context | Every message visible in the open conversation with its sender and date; an in-memory history of up to 40 opened messages; related messages by subject; other opened emails can be added | The open message with its sender, exact date and subject in read mode; in a reply draft, the quoted earlier messages as one context item with unknown sender and date. The read pane and the compose pane are separate instances, so what was read does not carry into the reply. Whole conversations through Graph in phase 2 |
| Selection in a received message | Revise or translate it, then copy the result | Not available: Office.js reads selections only in compose mode. The whole open message can be used as the source instead |
| Writing | The selection, the user's whole region of a reply above the signature and quote, or an empty draft | The selection, an empty draft, or the whole body of a new message without signature or quote. Replacing the user's region of a non-empty reply is phase 2, because the whole-body call also replaces the quoted thread on the web and in the new Outlook |
| Result in read mode | Bound to an open reply draft | A reply form opened with the result (at most 32 KB), or copied |
| Rich results | Tables, lists and charts written as HTML | The same HTML; whether clients keep its inline styles is unverified |
| Undo | The last apply, while the draft has not changed since | Only after replacing the whole body of a new message; elsewhere only Outlook's own undo, whose behaviour per client is unverified |
| Copy | Plain text and HTML | The same code; clipboard access inside Outlook's frame is unverified, and the preview text stays selectable |
| AI connection | API key, ChatGPT plan (Sign in with ChatGPT and Codex), Claude Code | API key only. The plans need the helper app, which the pane cannot reach today; a bridge for Windows and the web is phase 2, Mac stays blocked by WebKit |
| Key storage | The extension's own origin; only the background decrypts a key; Outlook pages and the content script cannot reach it | The add-in's origin, decrypted in the same page that shows email; separate in each Outlook client; session-only in Safari |
| Settings | Per browser profile | Per Outlook client; not shared with the extension |
| Theme | Outlook's colours read from the page | The Office theme API |
| Pop-out drafts | Not supported | Supported: the pane opens in the pop-out window |
| Robustness | Depends on Outlook's page structure | A supported API; Outlook interface changes do not break it |
| Installation | One click from a browser store | A manifest file added per mailbox, or deployed by an administrator, who can also block it |
| Updates | Reviewed by the stores, installed automatically | A new page version reaches everyone when it is deployed; manifest changes need a reinstall |
| Network beyond the provider | None, apart from the helper app's daily update check | Every pane load fetches the page from its host and Office.js from Microsoft |

Writehand never sends email in either case.

## Client support matrix

| Client | Mailbox requirement sets | Compose add-ins | Pinnable task pane | Add-in only (XML) manifest | Unified (JSON) manifest | Webview |
| --- | --- | --- | --- | --- | --- | --- |
| Outlook on the web (Microsoft 365, Outlook.com) | 1.1 to 1.16 | Yes | Yes (Microsoft 365 only, not Outlook.com) | Yes | Yes | The user's browser (iframe) |
| New Outlook for Windows (Microsoft 365 work or school account) | 1.1 to 1.16 | Yes | Yes | Yes | Yes | Edge WebView2 |
| Classic Outlook for Windows, Microsoft 365 subscription | 1.1 to 1.16 (1.16 from Version 2602) | Yes | Yes | Yes | Yes (Version 2307+) | Edge WebView2 |
| Classic Outlook for Windows, perpetual (2021, 2024, LTSC) | 1.1 to 1.9 / 1.14 | Yes | Yes | Yes | No | Edge WebView2 |
| Outlook for Mac (new UI, 16.38.506+) | 1.1 to 1.14 | Yes | Yes (16.13+) | Yes | **No** | Safari WKWebView |
| Outlook on iOS and Android | 1.1 to 1.5 | **No** (read mode only) | No | Yes (read mode) | No | WKWebView, Chrome |
| Outlook on the web, classic (Exchange on-premises) | 1.1 to 1.6 | Yes | No | Yes | No | The user's browser |

Sources: [Outlook requirement sets and client table](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/outlook/outlook-api-requirement-sets), [Browsers and webview controls](https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/browsers-used-by-office-web-add-ins), [Unified manifest support](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/unified-manifest-overview), [Pinnable task panes](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/pinnable-taskpane), [Outlook mobile add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/outlook-mobile-addins), [Outlook for Mac support](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/compare-outlook-add-in-support-in-outlook-for-mac).

What this means for Writehand:

- **Manifest:** the add-in only (XML) manifest is the only format every target accepts; the unified manifest is not supported on Mac, perpetual Outlook or on-premises mailboxes. Writehand needs nothing the unified manifest adds (no Teams or Copilot surfaces), so it uses the XML manifest. Microsoft recommends the unified manifest for new add-ins "unless your add-in will include an extensibility feature that isn't yet supported" ([Yeoman generator overview](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/yeoman-generator-overview)); Mac support is such a feature.
- **Minimum requirement set:** Mailbox 1.5, the floor for `ItemChanged` and pinnable task panes. Everything newer is feature-detected at run time with `Office.context.requirements.isSetSupported` (see [API use](#office-js-api-use)).
- **Accounts:** Microsoft 365 work or school mailboxes and Outlook.com mailboxes. The new Outlook for Windows runs add-ins only with a Microsoft 365 work or school account on Exchange Online ([New Outlook on Windows](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/one-outlook)). POP, IMAP and Gmail accounts do not run add-ins ([Outlook add-ins overview](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/outlook-add-ins-overview)).
- **Tiers for the first release.** Tier 1, verified by hand before release: Outlook on the web, new Outlook for Windows, Outlook for Mac. Tier 2, expected to work, verified when a machine is available: classic Outlook for Windows (its body HTML is Word-generated and differs; see risks). Not supported: mobile, classic Outlook on the web for on-premises Exchange.

## Architecture

### Runtime shape

```text
Outlook (web, new Windows, classic Windows, Mac)
  └─ task pane: one HTTPS page from GitHub Pages, Office.js from Microsoft's CDN
       ├─ @writehand/outlook-addin   MailConnector over Office.js (open item: read, selection, write, undo)
       ├─ @writehand/session         panel controllers, message history, settings store, Vue bridge
       ├─ @writehand/ui              the same WriterPanel, settings and connection components
       ├─ @writehand/locales         the five interface languages
       └─ @writehand/ai-connection   API key method: vault, providers, direct calls to Groq / OpenRouter / OpenAI
```

There is no content script, background or messaging layer: the task pane is one page, so the session calls the AI connection directly. `TextProcessor` is implemented by a direct processor in `ai-connection` instead of the extension's message-based one.

### Package layout after the change

Three packages are extracted from `apps/browser-extension/src` so both apps share them. The extension's behaviour does not change; its files move and its imports are updated.

| Package | Contents | Moved from | Must not use (ESLint) |
| --- | --- | --- | --- |
| `packages/session` (`@writehand/session`) | `createActionController`, `createApplyController`, `createPanelController`, `createMessageHistory`, `createSessionStore`, `toPanelView`, `usePanelSession`, `resolveAppearance`, rich-content helpers, `createSettingsStore` and `parseStoredSettings` | `src/controllers`, `src/composables/use-panel-session.ts`, `src/mounting/appearance.ts`, `src/platform/settings-store.ts` | WXT, `chrome`, `browser`, `Office`, `document`, `window`, web storage, `fetch`; `ai-connection`, the connectors |
| `packages/ai-connection` (`@writehand/ai-connection`) | `createAiConnection`, `createApiKeyConnection`, `createApiKeyProviders`, `createSecretVault`, `createIndexedDbKeyStore`, `createAiConnectionStore`, `createHelperClient` (the helper protocol client over an injected transport), `createDirectProcessor` | `src/platform/{ai-connection,api-key-connection,api-key-providers,secret-vault,indexed-db-key-store,ai-connection-store,helper-client}.ts` | Vue, WXT, `chrome`, `browser`, `Office`, `document`, `window`; `ui`, `core`, `session`, the connectors |
| `packages/locales` (`@writehand/locales`) | `en`, `tr`, `de`, `fr`, `es` dictionaries, `textFor`, `uiLanguageFor`, plural helper, the `ExtensionText` type (renamed `AppText`) | `src/locales` | Everything except `contracts` and `ui` types |
| `packages/mail-connectors/outlook-html` (`@writehand/outlook-html`) | Text block extraction, quote and signature markers, the Outlook element classifier: the parts of `outlook-web` that read Outlook-generated HTML and do not depend on the live page | `outlook-web/src/reading/{extract-text-blocks,outlook-classifier}.ts`, the quote and signature entries of `selectors.ts` | Same rules as the connectors |

`StorageArea` (the narrow storage interface both stores use) moves to `contracts`. The native messaging client, the runtime messaging, the sender policy, the shadow DOM mounting and the launcher toolbar stay in the extension: they are browser-specific. The settings form in `entrypoints/options/OptionsApp.vue` is split into a `ui` component (`SettingsForm`) that receives settings and emits changes, so the add-in's settings view reuses it; the helper app card and the per-site switch remain extension-only slots.

New code:

| Package or app | Responsibility | Must not use (ESLint) |
| --- | --- | --- |
| `packages/mail-connectors/outlook-addin` (`@writehand/outlook-addin`) | `MailConnector` over Office.js: item identity and scope, body reading and anatomy (editable region, signature, quote), quoted-chain context, selection capture, controlled writes, undo, `ItemChanged` and body revision tracking. The real Office.js adapter lives only in `src/office/`; everything else works against a small `OfficeMailbox` port so it runs under a fake in tests | Vue, WXT, `ui`, `core`, `session`; `Office` outside `src/office/` |
| `apps/outlook-addin` (`@writehand/outlook-addin-app`) | The task pane: Vite and Vue build, `index.html` with the CSP, `Office.onReady` bootstrap, `src/platform/` (Office theme, storage keyed by `Office.context.partitionKey`, clipboard), the panel, settings and first-run views, manifest generation and validation, the production package check | `Office` outside `src/platform/`; `chrome`, `browser`, WXT |

### The Office.js connector

The contract (`MailConnector`) stays as it is, with three small additions to `contracts`:

1. `ContextCoverage.source` gains `'item-body'` next to `'visible-dom'` (the contract tests accept both).
2. `ApplyTarget` gains a read-mode target `{ mode: 'create-reply', threadRef, messageKey, expectedThreadRevision }` for "open a reply draft with this text" (see [writing](#writing-to-the-draft)). `deriveApplyTarget`, `validateApply`, the session reducer and the panel view learn the new mode; it is never derived automatically, the user chooses it in the panel.
3. `PageState` gains an optional `features` record (`receivedSelection`, `richContent`) so a connector can say what the page cannot do; the extension connector reports everything as available.

How each contract operation maps to Office.js (requirement set in brackets; sources in [API use](#office-js-api-use)):

| Operation | Compose mode (reply, forward, new) | Read mode (open message) |
| --- | --- | --- |
| `getPageState` | One composer: the open item. `threadKey` = `item.conversationId` (null for a new message until it is saved). `support` is `waiting` until `Office.onReady` and the first probe finish | `activeThread` = the open message's `conversationId`, no composers |
| `readThread` | `body.getAsync(Html)` [1.3]; the part after the quote marker becomes one context message, the "quoted chain", with unknown sender and date and `coverage.status: 'partial'`, like the extension's quote fallback. A pinned pane also keeps the messages the user opened in the same pane instance | The open message (`from`, `dateTimeCreated`, `subject`, body text) plus its quoted chain as a second context message |
| `readComposer` | Body HTML parsed with `DOMParser`; `outlook-html` finds the signature and quote boundary. Revision = a fingerprint of the editable text, bumped when a re-read differs (Office.js has no body-change event) | Not applicable |
| `captureDraftSelection` | `item.getSelectedDataAsync(Text)` [1.2]; only `sourceProperty === 'body'` counts. Offsets are located in the editable text; the registry keeps the text and the revision | Unsupported: `getSelectedDataAsync` is compose-only; `features.receivedSelection` is false |
| `subscribe` | `ItemChanged` [1.5] while pinned; a slow poll of the body fingerprint (every 3 s) only while a target is bound, so a stale target is reported before the user applies | `ItemChanged` only |
| `applyText` | See [writing](#writing-to-the-draft) | `create-reply` through `displayReplyFormAsync` [1.9] |
| `undoChange` | Only where the previous content is known exactly and a single call restores it; otherwise `undoId: null` and the panel says so | None |

### Writing to the draft

Office.js offers no range or cursor API. The body can be replaced as a whole, prepended, or the current selection replaced ([Body reference](https://learn.microsoft.com/en-us/javascript/api/outlook/office.body?view=outlook-js-preview)). The existing "write once, verify, undo" contract is kept as follows; every write is preceded by a fresh read that must match the expected revision, and followed by a read that must match the expected result, otherwise the outcome is `uncertain` and nothing is retried.

| Target mode | Office.js call | Verification | Undo |
| --- | --- | --- | --- |
| `replace-selection` | `getSelectedDataAsync` again (text must equal the captured selection), then `body.setSelectedDataAsync(text, Text)` [1.1] | Body re-read must equal the previous editable text with the selection replaced at one of its occurrences and the protected region unchanged | Not offered (`undoId: null`); restoring would need a whole-body rewrite |
| `insert-empty` (the user's region is empty) | `body.prependAsync(html or text)` [1.1], which inserts above the signature and quote | Body re-read must start with the inserted text and keep the protected region | Not offered |
| `replace-body` | Only when the editable region is the whole body (a new message with no signature or quote): `body.setAsync(html)` [1.3] | Body re-read must equal the result | `body.setAsync(previousHtml)`, verified the same way |
| `create-reply` (read mode) | `displayReplyFormAsync({ htmlBody })` [1.9], falling back to `displayReplyForm` [1.1]; 32 KB limit | Outlook opened the draft; nothing to read back | None; the user discards the draft |

Not used in the first release: `body.setAsync` on a draft that contains a signature or quoted thread. In Outlook on the web and the new Outlook for Windows it replaces "the entire body of a message, including previous messages from the conversation thread", temporarily changes the user's conversation setting and shows a notification ([Body.setAsync remarks](https://learn.microsoft.com/en-us/javascript/api/outlook/office.body?view=outlook-js-preview)); the `bodyMode` option that limits it is ignored on classic Windows and Mac ([Insert data in the body](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/insert-data-in-the-body)). Round-tripping a whole body with inline images through `getAsync` and `setAsync` is a risk the docs confirm: "the value returned by Body.getAsync won't necessarily be the exact same value that was previously passed in Body.setAsync". So on a reply draft the user revises or translates a selection, or writes into an empty draft; replacing a non-empty reply body as a whole is a phase 2 item behind real-client verification.

Rich results (tables, lists, charts) are written as HTML through the same calls. The Body reference says for every write method: "doesn't support inline CSS. Use internal or external CSS instead." The `email-format` output uses inline styles for table borders and chart bars. What the clients actually keep is **unconfirmed** (Microsoft's own append-on-send examples use inline styles); the first real-client check decides whether `email-format` gets an attribute-based variant for the add-in or the add-in reports `features.richContent: false`.

### AI connection

**API key method (first release).** The three providers answer browser requests with `Access-Control-Allow-Origin: *` and allow the `Authorization` header, and all three stream with plain server-sent events, so the existing `ai-chat-completions` and `ai-openai/api-key` code runs unchanged in the task pane with `fetch`. Verified empirically with preflight requests on 2026-10-22; the SDK readmes confirm browser use is possible but discouraged because it exposes a key ([groq-typescript](https://github.com/groq/groq-typescript/blob/main/README.md), [openai-node](https://github.com/openai/openai-node/blob/master/README.md), [OpenRouter PKCE guide](https://openrouter.ai/docs/use-cases/oauth-pkce)). That warning is about embedding a developer's key in a public page; here the user enters their own key into their own Outlook, as in the extension. Neither Groq nor OpenRouter documents CORS as a guarantee (**unconfirmed** as policy), so a provider closing it would break the add-in's method for that provider, not the user's data.

Key storage follows the extension's model: AES-GCM with a non-extractable key kept as a `CryptoKey` in the add-in origin's IndexedDB (`CryptoKey` objects are serializable, [Web Crypto](https://w3c.github.io/webcrypto/#cryptokey-interface)), ciphertext in `localStorage`, both namespaced with `Office.context.partitionKey` as Microsoft advises ([Persist add-in state](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/persisting-add-in-state-and-settings)). What differs from the extension:

- Storage is per Outlook client: a key connected in Outlook on the web is not available in the new Outlook for Windows, and vice versa. The user connects the key in each client they use.
- In Outlook on the web, the add-in's storage is partitioned under the Outlook site in Chrome, Edge and Firefox and persists; in Safari, partitioned third-party storage is session-only by WebKit's design ([WebKit 168631](https://bugs.webkit.org/show_bug.cgi?id=168631)), so the key has to be entered again after Safari restarts. Whether the Mac WKWebView treats the pane as first-party is **unconfirmed**.
- `OfficeRuntime.storage` is not available to Outlook task panes (Windows event-based add-ins only, [reference](https://learn.microsoft.com/en-us/javascript/api/office-runtime/officeruntime.storage)), and roaming settings live in the user's mailbox, readable through Exchange Web Services and MAPI, and "shouldn't be used to store sensitive information" ([RoamingSettings](https://learn.microsoft.com/en-us/javascript/api/outlook/office.roamingsettings)). Neither is used, for keys or for settings.
- There are no host permissions. The page's Content Security Policy lists the three provider origins and the Office.js CDN as the only allowed connections, and the production package check enforces the list.
- There is no separation like the extension's background: the key is decrypted in the same page that reads and shows email, and that page's code is loaded from the host on every open. The security of the hosting origin is therefore the security of the key. This is why the origin must serve nothing but the add-in (see [Hosting](#hosting)).

**ChatGPT and Claude plans (later phase).** The helper app would have to listen on `127.0.0.1` and the page would call it from an HTTPS origin:

- Chromium and Firefox do not treat `http://127.0.0.1` as mixed content ([Secure Contexts](https://w3c.github.io/webappsec-secure-contexts/#is-origin-trustworthy), [Chromium](https://chromium.googlesource.com/chromium/src.git/+/130ee686f%5E%21), [Firefox 55](https://bugzilla.mozilla.org/show_bug.cgi?id=903966)). WebKit still does; the bug is open since 2017 ([WebKit 171934](https://bugs.webkit.org/show_bug.cgi?id=171934)). **Outlook for Mac cannot reach a local helper from the task pane.**
- Chromium's Local Network Access ships a permission prompt from Chrome 142 that also covers loopback; a cross-origin iframe needs the `loopback-network` permission from the hosting page ([Chrome blog](https://developer.chrome.com/blog/local-network-access), [spec](https://wicg.github.io/local-network-access/)). Outlook on the web apparently started passing it through in 2026, with inconsistent behaviour in the new Outlook for Windows ([office-js issue 6400](https://github.com/OfficeDev/office-js/issues/6400)); how WebView2 surfaces the prompt is **unconfirmed**.
- The helper app would become a permanently listening local server, which changes its security model (origin checks, a pairing token, rate limits) and `SECURITY.md`.

Recommendation: ship the first release with the API key method and plan a separate spike per client for the bridge. The spike has a clear success criterion (a `fetch` from the task pane to `http://127.0.0.1` succeeds on Windows and the web after one permission prompt) and a clear fallback (the plans stay extension-only).

### Context and the conversation

Office.js exposes only the open item. Ways to read earlier messages, and what was decided:

| Option | Status | Decision |
| --- | --- | --- |
| Quoted chain inside the reply draft (`body.getAsync`) | Available everywhere, no permissions beyond the item | **First release.** Same model as the extension's quote fallback |
| Messages the user opened while the pane is pinned (`ItemChanged`) | Microsoft 365 only; a compose pane and a read pane are separate instances, so history does not carry from reading into the reply | First release, within one pane instance; mostly useful in read mode |
| Microsoft Graph with nested app authentication (`Mail.Read`, filter by `conversationId`) | Supported on the web, Windows 2409+, Mac 16.89+ ([NAA requirement sets](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/common/nested-app-auth-requirement-sets)); `Mail.Read` is a delegated permission without default admin consent ([permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)), but tenants can require it; needs an Entra app registration owned by the developer; not for Outlook.com | Phase 2, opt-in, after the first release |
| Exchange Web Services (`makeEwsRequestAsync`) | EWS "starts to be disabled globally" in October 2026 and is fully disabled in April 2027 ([EWS retirement](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-ews-exchange-online)); legacy Exchange tokens are already off | Not used |
| `loadItemByIdAsync` [1.15] | Loads another item's body by ID, but the IDs come only from Graph or multi-select; not on Mac (1.14) | Not used |

## Permissions and data flow

| What | Value | Why |
| --- | --- | --- |
| Manifest permission | `ReadWriteItem` | Reading and writing the open item's body and selection. Not `ReadWriteMailbox`: the add-in never reads other items, headers or the mailbox |
| Activation rules | Messages in read and compose forms | No appointments; no event-based activation; nothing runs when the pane is closed |
| Content Security Policy (meta tag) | `default-src 'none'`; `script-src 'self'` plus the Office.js CDN host; `connect-src 'self'`, `api.groq.com`, `openrouter.ai`, `api.openai.com` and the CDN host; `img-src 'self' data:`; `style-src 'self'`; `object-src 'none'`; `base-uri 'none'`; `form-action 'none'` | The page can talk only to the chosen providers and to Microsoft's library; tuned to the smallest set that works in real clients, and every origin is named in `PRIVACY.md` |
| Office.js | Loaded from Microsoft's CDN, as required for the Marketplace and recommended otherwise ([Referencing Office.js](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/referencing-the-javascript-api-for-office-library-from-its-cdn)) | The only remote script on the page; the package check allows exactly that one |
| Storage | `localStorage` and IndexedDB of the add-in origin, namespaced by `partitionKey` | Settings and the encrypted key stay in the Outlook client; nothing roams through the mailbox |

Data flow of one generation: the user presses a button in the pane → the connector reads the open item through Office.js (in memory only) → the session shows the context and the user approves what is sent → the task pane sends the request straight to the chosen provider with the user's key → the preview appears → the user applies it and the connector writes the draft once. GitHub Pages receives only requests for the page's files (and, like any website, sees the IP address and user agent); Microsoft's CDN serves Office.js; Microsoft's Outlook mediates every Office.js call. No email content, key or request goes to GitHub or to Writehand. Office.js has no API that sends a message; `displayReplyForm` opens a draft.

Documents to update in the same change: `PRIVACY.md` (a section for the add-in: hosting, Office.js, storage per client, the `ReadWriteItem` permission, Safari note), `SECURITY.md` (scope and threat model: hosted code integrity, no send API, storage caveats, CSP), `README.md`, `docs/DEVELOPMENT.md`, `docs/MANUAL_TESTING.md`, `docs/RELEASING.md`, `CHANGELOG.md`.

## Hosting and distribution

### Hosting

- **Where:** GitHub Pages under an origin that serves nothing but the add-in: either the Pages site of a dedicated GitHub organization (`https://<organization>.github.io/`) or a custom subdomain. Not `https://dervisgenc.github.io/writehand/`: every Pages project of a personal account is served from the same `<account>.github.io` origin, so storage, service worker scope and permissions would be shared with any other project published there, and a mistake or compromise in one of them would fall inside the add-in's security boundary. The manifest also lives on that origin as `manifest.xml`. Microsoft requires only HTTPS with a trusted certificate and allows "any web hosting platform" ([Deploy and publish](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish)); no Microsoft page names GitHub Pages or forbids it (**unconfirmed** as an explicitly supported host).
- **How:** the release workflow builds the task pane into `writehand-<version>-outlook-addin.zip` and `writehand-<version>-outlook-manifest.xml`, both listed in `SHA256SUMS`, signed and attested like the other release files. A separate `pages.yml` runs when a release is published (and on demand): it downloads the release's archive, verifies the `SHA256SUMS` signature and deploys exactly those files. The deployed page is therefore reproducible from the signed release.
- **Why GitHub Pages:** the repository already depends on GitHub for releases, update checks and the privacy policy link; a static host adds no new party. A custom domain can be added later, but the manifest's source location is fixed for everyone who installed it, so the origin is a decision to make once (see decisions).
- **What it cannot do:** GitHub Pages sets no response headers, so the CSP is a `<meta>` tag (which cannot express `frame-ancestors`); the page therefore relies on Office.js working only inside Office hosts, and holds nothing of value for a page that frames it elsewhere. Subresource integrity is not possible for Office.js, because the CDN URL is a rolling latest version; the add-in's own files are same-origin and content-hashed by the build.
- **Self-hosting:** anyone can host the archive under their own origin and change the URLs in the manifest; `docs/BUILD.md` explains how.

### Distribution

| Path | Works for | Needs | Notes |
| --- | --- | --- | --- |
| Sideload (user) | Microsoft 365 mailboxes with the "My Custom Apps" role (the default unless an admin removed it), Outlook.com | The manifest file from the release | Outlook on the web → **Get Add-ins** → **My add-ins** → **Custom add-ins** → **Add from file** (`https://aka.ms/olksideload`); "The Add from URL option is no longer available". An add-in installed there appears in Windows and Mac for the same mailbox; classic Windows may take 24 hours ([Sideload Outlook add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/sideload-outlook-add-ins-for-testing), [Add-ins for Outlook in Exchange Online](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/add-ins-for-outlook/add-ins-for-outlook)). Whether Outlook.com personal accounts can add a custom add-in is **unconfirmed** in the docs |
| Admin deployment | Organizations (Exchange Online, Entra ID) | The manifest file or its URL in the Microsoft 365 admin center, **Integrated apps** | Assign to everyone, groups or users; 24 to 72 hours to appear; no AppSource listing needed ([Deploy add-ins in the admin center](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-deployment-of-add-ins), [Centralized deployment](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/centralized-deployment-of-add-ins)) |
| AppSource (Microsoft Marketplace) | Everyone, discoverable in the store | A Partner Center account, support, privacy and EULA URLs, screenshots, "Notes for certification" with a test connection (an API key for the reviewers), validation of up to four weeks; the add-in must work in Outlook on the web and on every platform supporting the declared requirement sets ([Publish to AppSource](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish-office-add-ins-to-appsource), [checklist](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/checklist), [certification policy 1120](https://learn.microsoft.com/en-us/legal/marketplace/certification-policies)) | Phase 3, after real-client verification |

The first release ships the first two paths and documents both in this file and in the README.

## Local development and testing

- **Tooling:** Vite for the task pane (Vue plugin, like the extension's WXT build underneath), `@types/office-js` for typings, `office-addin-manifest` to validate the manifest, `office-addin-dev-certs` for the local `https://localhost:3000` certificate (it installs a development CA in the user's trust store, as the Yeoman generator does; development only). Yeoman and the Agents Toolkit are not used: the build is part of this monorepo ([Yeoman generator](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/yeoman-generator-overview), [Troubleshoot manifest](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/troubleshoot-manifest)).
- **Commands:** `pnpm addin:dev` (dev server with the certificate), `pnpm addin:build` (production files plus `manifest.xml`), `pnpm addin:manifest --dev` (a manifest pointing at `localhost:3000` for sideloading), `pnpm addin:validate`. `pnpm check` gains the add-in's typecheck, lint, tests, build and package check.
- **Sideloading for development:** Outlook on the web **Add from file** with the development manifest; on macOS this is the documented way ("you must manually sideload"). Debugging: browser developer tools on the web, `olk.exe --devtools` for the new Outlook, Safari Web Inspector on Mac after `defaults write com.microsoft.Outlook OfficeWebAddinDeveloperExtras -bool true` ([Debug add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/debug-add-ins-overview)).
- **Automated tests:**
  - `tests/support/office/fake-office.ts`: an in-memory Office.js subset (`Office.onReady`, `context.mailbox.item` with `body.getAsync`, `setAsync`, `prependAsync`, `setSelectedDataAsync`, `getSelectedDataAsync`, `getComposeTypeAsync`, `conversationId`, `subject`, `from`, `dateTimeCreated`, `addHandlerAsync` for `ItemChanged`, `requirements.isSetSupported`, `partitionKey`, `officeTheme`) over synthetic draft HTML (user text, signature, quoted chain). Its selection and typing controls serve the shared contract tests.
  - A new Vitest project `outlook-addin`: the `MailConnector` contract tests against the fake, plus connector tests for body anatomy on synthetic fixtures in the three HTML dialects (Outlook on the web and new Outlook, Word HTML from classic Outlook, Mac), the writes and their verification, the `ItemChanged` flow and the read-mode reply target.
  - The moved controller tests run unchanged against `@writehand/session`.
  - Playwright: the built task pane served locally with the fake Office injected before Office.js would load, covering open → write reply → preview → apply → status, settings and the first-run connection with a stubbed provider.
  - A production package check (`scripts/verify-addin.mjs`): manifest ID, version and HTTPS URLs on the fixed origin, the CSP meta tag with exactly the allowed origins, one remote script (the Office.js CDN), no development markers.
- **Real clients:** a new section in `docs/MANUAL_TESTING.md` with a matrix (Outlook on the web in Chrome, Firefox and Safari with a work account and an Outlook.com account; new Outlook for Windows; classic Outlook for Windows; Outlook for Mac) and checks for install, first run, key persistence after restart, selection replace, insert into an empty draft, rich table rendering, the reply form, theme, pinning and item switch, and "nothing was sent". Synthetic test results and real-client results are always reported separately.

## Scope and phases

### First release (MVP)

1. Extract `@writehand/locales`, `@writehand/session`, `@writehand/ai-connection` and `@writehand/outlook-html`; move their tests; the extension passes `pnpm check` unchanged in behaviour.
2. Contract additions: `coverage.source`, `create-reply` target, `features`, `StorageArea`, brand constants (add-in ID, origin, provider name).
3. `@writehand/outlook-addin` connector with the fake Office and contract tests.
4. `apps/outlook-addin`: task pane with the panel (reply, revise, translate, write; refine; preview; apply; copy), settings (API key per provider and model, interface language, translation languages, standing instructions, tone, theme), a first-run view (connect a key, try the sample), five languages, Office theme, manifest generation in five languages, CSP, package check.
5. Writes: `replace-selection`, `insert-empty`, `replace-body` on a draft without a protected region, `create-reply` in read mode; undo only for the whole-body case.
6. Build and release: CI job, release assets, Pages deployment workflow, `BUILD.md`.
7. Documentation and policies: this file (install guide for users and admins), `README.md`, `DEVELOPMENT.md`, `MANUAL_TESTING.md`, `RELEASING.md`, `PRIVACY.md`, `SECURITY.md`, `CHANGELOG.md`.
8. Real-client verification on tier 1 clients, recorded in `MANUAL_TESTING.md`; classic Outlook when a machine is available.

### Phase 2

- Spike: loopback access to the helper app from the task pane on Windows and the web; then the bridge (pairing code, origin check, token, rate limit) and the ChatGPT and Claude plans in the add-in.
- Full conversation context through Microsoft Graph with nested app authentication, opt-in, with the Entra app registration documented.
- Splitting the quoted chain into messages by Outlook's quote header blocks, so each earlier message is a separate context card.
- `replace-body` on reply drafts in Outlook on the web and the new Outlook through `bodyMode`, after verification.
- Ribbon quick actions (Revise, Translate) next to the single "Open Writehand" button.

### Phase 3

- AppSource listing (Partner Center, certification notes, screenshots).
- Optional roaming of non-secret preferences, if users ask for it.

## Risks and open questions

Each item names its source and what the plan does about it.

| # | Risk or unknown | Source | Mitigation |
| --- | --- | --- | --- |
| 1 | `setSelectedDataAsync` inserts "at the top of the body content" if "the body lost focus in the UI"; the pane takes focus before the user presses the button | [Body reference](https://learn.microsoft.com/en-us/javascript/api/outlook/office.body?view=outlook-js-preview) | Re-check the selection right before the write; verify the body afterwards and report `uncertain` on a mismatch; a writer abstraction allows a whole-body rewrite strategy per client if the real-client check fails |
| 2 | Inline CSS "not supported" in body writes; `email-format` uses inline styles for tables and charts | Body reference (same page); contradicting examples in [append-on-send](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/append-on-send) | Real-client check first; attribute-based table markup or `features.richContent: false` as fallbacks |
| 3 | Body HTML differs per client (RoosterJS markup on the web and new Outlook, Word HTML in classic Outlook, WebKit markup on Mac), so signature and quote detection may miss | Not documented; known from the extension's selector work | Conservative `canReplaceBody`; anonymized synthetic fixtures per dialect; `insert-empty` and `replace-selection` do not depend on the boundary |
| 4 | Storage persistence per client: Safari session-only for partitioned storage; Mac WKWebView first-party status **unconfirmed**; WebView2 persists | [Persist add-in state](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/persisting-add-in-state-and-settings), [WebKit 168631](https://bugs.webkit.org/show_bug.cgi?id=168631) | Document per client; the key can always be entered again; nothing else depends on persistence |
| 5 | Office.js CDN endpoint moved to `officeapis.public.onecdn.static.microsoft`; the CSP must allow it and a Trusted Types policy | [Referencing Office.js](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/referencing-the-javascript-api-for-office-library-from-its-cdn) | CSP tuned in real clients; the package check keeps the list explicit |
| 6 | Pinnable panes and `ItemChanged` are not available for Outlook.com accounts | [Pinnable task panes](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/pinnable-taskpane) | The pane closes on item switch there; context is the quoted chain, which needs no pinning |
| 7 | Administrators can block sideloading; the new Outlook for Windows needs a work or school account on Exchange Online | [Add-ins for Outlook](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/add-ins-for-outlook/add-ins-for-outlook), [New Outlook on Windows](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/one-outlook) | Admin deployment path documented |
| 8 | GitHub Pages: no response headers, no documented Microsoft endorsement, availability outside Writehand's control | [Deploy and publish](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish) | CSP via meta tag; self-hosting documented; the origin is a one-time decision |
| 9 | Provider CORS is observed, not promised, by Groq and OpenRouter | Empirical check 2026-10-22; [groq-typescript README](https://github.com/groq/groq-typescript/blob/main/README.md) | A provider that closes CORS disables that method in the add-in only; the extension is unaffected |
| 10 | Helper app bridge: Safari blocks loopback; Chromium requires a Local Network Access permission a framed add-in must be granted; WebView2 behaviour inconsistent | [WebKit 171934](https://bugs.webkit.org/show_bug.cgi?id=171934), [Chrome LNA](https://developer.chrome.com/blog/local-network-access), [office-js 6400](https://github.com/OfficeDev/office-js/issues/6400) | Not in the first release; spike with explicit success criteria |
| 11 | `conversationId` is null for a new message until it is saved and "will change" if the user edits a reply's subject | [MessageCompose reference](https://learn.microsoft.com/en-us/javascript/api/outlook/office.messagecompose?view=outlook-js-preview) | Thread identity is read once per item and on `ItemChanged` only; a change restarts the session as it does in the extension |
| 12 | Mac stops at Mailbox 1.14: no `loadItemByIdAsync`, no `bodyMode` | [Requirement sets](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/outlook/outlook-api-requirement-sets) | Neither is needed in the first release |
| 13 | `displayReplyForm` support on Mac and classic Windows is by omission in the docs; the 32 KB limit applies | [MessageRead reference](https://learn.microsoft.com/en-us/javascript/api/outlook/office.messageread?view=outlook-js-preview) | Verify on real clients; results over 32 KB fall back to copy |
| 14 | Whether `getComposeTypeAsync` [1.10] works on Mac and classic Windows is not stated per client | MessageCompose reference | Fallback: a non-null `conversationId` counts as a reply |
| 15 | The page that holds the decrypted key is loaded from the host on every open; a compromised host or deploy reaches every user's key and open email at once, without store review | The add-in's files are served by its web host ([Deploy and publish](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish)) | Dedicated origin; deploy only from signed release files; strict CSP; keys with spending limits recommended in the guide, as for the extension |
| 16 | Clipboard writes inside Outlook's frame may be refused by the host page's permissions policy | Not documented for Outlook | Verify per client; the preview text stays selectable for manual copying |

## Decisions that stay fixed unless discussed

These are recorded here because changing them silently would break installed add-ins, the privacy promises or the architecture.

1. **Manifest format:** add-in only (XML) manifest, minimum Mailbox 1.5, `ReadWriteItem`, messages only, one task pane button in read and compose with pinning. No event-based activation, no on-send handlers.
2. **Identity:** the add-in ID (a GUID in `contracts/src/brand.ts`) and the hosting origin and path never change after the first release.
3. **No server, no mailbox access:** no Graph, EWS, roaming settings or any request beyond the open item without an explicit, documented, opt-in change. No analytics, error reporting or remote configuration on the page.
4. **Connections:** the page may connect only to the user's chosen provider among the three listed and to Microsoft's Office.js CDN; the CSP and the package check encode the list; any addition updates `PRIVACY.md` in the same change.
5. **Never sends:** no write path may send; `displayReplyForm` only opens a draft.
6. **Keys:** encrypted at rest with a non-extractable key in the add-in origin's storage, never shown again, never roamed.
7. **Package boundaries:** `session`, `ai-connection`, `locales`, `outlook-html` and `outlook-addin` with the ESLint rules above; `Office` globals only in the connector's `src/office/` and the app's `src/platform/`.
8. **Versioning:** one version for the extension, the helper app and the add-in; the manifest version is `x.y.z.0`.

## Office.js API use

| API | Set | Use | Source |
| --- | --- | --- | --- |
| `Office.onReady` | — | Bootstrap; the page does nothing until it resolves | [Initialize](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/initialize-add-in) |
| `item.itemType`, `conversationId`, `subject`, `from`, `dateTimeCreated` | 1.1 | Item identity, context header | [MessageRead](https://learn.microsoft.com/en-us/javascript/api/outlook/office.messageread?view=outlook-js-preview) |
| `item.body.getAsync` | 1.3 | Draft and message body (HTML); returns the whole thread in a reply on the web and new Outlook | [Body](https://learn.microsoft.com/en-us/javascript/api/outlook/office.body?view=outlook-js-preview) |
| `item.getSelectedDataAsync` | 1.2 | Draft selection (compose only) | [MessageCompose](https://learn.microsoft.com/en-us/javascript/api/outlook/office.messagecompose?view=outlook-js-preview) |
| `item.body.setSelectedDataAsync`, `prependAsync`, `setAsync` | 1.1 / 1.1 / 1.3 | Writes; 1,000,000 characters each | Body |
| `item.getComposeTypeAsync` | 1.10 | Reply, forward or new (feature-detected) | MessageCompose |
| `item.displayReplyFormAsync`, `displayReplyForm` | 1.9 / 1.1 | Read-mode reply draft, 32 KB | MessageRead |
| `mailbox.addHandlerAsync(ItemChanged)` | 1.5 | Pinned pane item switch | [Pinnable task panes](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/pinnable-taskpane) |
| `Office.context.officeTheme`, `OfficeThemeChanged` | 1.14 | Theme colours (feature-detected; `isDarkTheme` is not supported in Outlook, derived from the body colours) | [OfficeTheme](https://learn.microsoft.com/en-us/javascript/api/office/office.officetheme?view=outlook-js-preview) |
| `Office.context.partitionKey` | — | Storage namespace | [Persist add-in state](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/persisting-add-in-state-and-settings) |
| `Office.context.requirements.isSetSupported` | — | Feature detection | [Requirement sets](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/outlook/outlook-api-requirement-sets) |
