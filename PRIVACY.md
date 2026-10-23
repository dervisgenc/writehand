# Privacy policy

_Effective date: October 23, 2026_

Writehand is a free, open-source writing assistant for Outlook on the web and Gmail. It consists of a browser extension and, for the ChatGPT and Claude plans, a small helper app that runs on your computer. An add-in for the Outlook applications is in development; how it differs is described in [Outlook add-in](#outlook-add-in-in-development). This policy covers all three.

**In short:** Writehand has no server, no account system, no analytics, no advertising and no error reporting. The developer never receives your emails, your text or your sign-in details. Your text goes only to the AI provider you choose, and only when you ask for it.

## What Writehand handles

### Email content and your text

When you select **Write reply**, **Write**, **Revise** or **Translate**, Writehand sends the following to the AI provider you selected:

- the text you selected or typed, and your instruction;
- the messages you chose as context (sender name, subject, displayed date and message text), which you can review, edit or remove before sending;
- your options (target language, tone) and your standing writing instructions from the settings.

With an API key, the extension sends this request from your browser directly to the provider. With the ChatGPT or Claude plan, it goes from the extension to the helper app on your computer and from there directly to the provider:

| Connection method | Provider | Provider's privacy policy |
| --- | --- | --- |
| API key from Groq | Groq | <https://groq.com/privacy-policy> |
| API key from OpenRouter | OpenRouter, which forwards it to the model's provider according to your OpenRouter privacy settings | <https://openrouter.ai/privacy> |
| ChatGPT plan or API key from OpenAI | OpenAI | <https://openai.com/policies/privacy-policy> |
| Claude Code on your computer (experimental) | Anthropic | <https://www.anthropic.com/legal/privacy> |

How the provider processes and retains your request is governed by its own terms and by your account settings with that provider.

Nothing is sent when you only open or read an email. To suggest context, the extension keeps the emails you open in memory while the Outlook or Gmail tab is open; they are never written to disk and are discarded when the tab is closed or reloaded.

If a reply draft is already open and its earlier conversation was not captured, a recognized quote inside that draft can provide context instead. In Gmail, when you reply from the message list without opening the email, Gmail hides the earlier message behind the draft's "•••" button; when you start writing the reply with Writehand, it presses that button so Gmail shows the earlier message in your draft, as it would if you pressed it yourself, and uses it as context. It is shown as partial context for review; the editable draft and the signature before the quote are excluded from that conversation context. It is sent only when you request generation, under the same rules as other selected context.

Writehand never sends email. Results are shown as a preview first and are written into your draft only after you approve them; sending is always up to you.

### Settings

Your preferences (interface language, translation languages, tone, standing instructions, theme, and where you dragged the **Draft reply** button) and your connection choice (method, API key provider and model) are stored in your browser's extension storage on your device. They are not synchronized or sent anywhere.

### Sign-in details and API keys

- **API key (Groq, OpenRouter or OpenAI):** the key you enter is stored in your browser's extension storage, encrypted with a key that the browser keeps for the extension and that no script can export. Web pages, including Outlook, cannot read it. It is never shown again, never synchronized and sent only to the provider it belongs to, to authenticate your requests. Before the first request, the browser asks you to allow Writehand to connect to that provider.
- **ChatGPT plan:** when you sign in with ChatGPT or through Codex, the helper app receives sign-in tokens from OpenAI on your computer. With the Codex sign-in, requests go to OpenAI's ChatGPT service (`chatgpt.com`) instead of the OpenAI API. The helper app stores the tokens in a file that only your user account can read (`~/.config/writehand` on macOS and Linux, `%LOCALAPPDATA%\writehand` on Windows). They are never stored in the browser and never sent back to the extension. They are sent only to OpenAI, to authenticate your requests.

- **Claude Code:** Writehand never reads or stores your Claude credentials. The helper app only runs your locally installed Claude Code, which handles its own sign-in.

### Update checks

While update checks are turned on (the default), the helper app asks GitHub at most once a day for the version number of the latest Writehand release (`api.github.com/repos/dervisgenc/writehand/releases/latest`). The request contains no email content and no account details. Like any web request, it reveals your IP address to GitHub ([GitHub's privacy statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement)). You can turn update checks off in the extension settings under **Helper app**. Updates are downloaded only when you choose to install them.

## Browser permissions

| Permission | Why it is needed |
| --- | --- |
| Access to `outlook.office.com`, `outlook.office365.com`, `outlook.live.com`, `outlook.cloud.microsoft` and `mail.google.com` | To show the Writehand buttons in Outlook on the web and Gmail, read the draft or the emails you work with, and write approved results into your draft. Writehand does not run on any other website. |
| Storage | To save your preferences on your device. |
| Native messaging (optional, requested when you choose the ChatGPT or Claude plan) | To talk to the helper app on your computer, which holds those connections. |
| Access to `api.groq.com`, `openrouter.ai` or `api.openai.com` (optional, requested when you connect an API key for that provider) | To send your generation requests to the provider whose key you connected. Writehand does not get access to any other site. |

## Outlook add-in (in development)

The Outlook add-in brings Writehand to the Outlook applications (first the new Outlook and classic Outlook for Windows) as an Office add-in. It is not released yet. It uses only the API key method; the ChatGPT and Claude plans are not available in it. Everything above applies, with these differences:

- **Where it runs.** The add-in is a web page that Outlook loads from the address in its manifest each time you open it, and Microsoft's Office.js library, which Outlook requires, is loaded from Microsoft. Like any website, that host and Microsoft see the request for the files (your IP address and browser details). No email content, text or key is ever sent to them. Writehand still has no server: the page sends your text only to the provider you chose.
- **What it reads.** Only the item that is open in Outlook: the email you are reading, or the draft you are writing and the earlier messages quoted in it. It reads it only while you use the add-in, keeps it in memory and never writes it to disk. It cannot read other emails.
- **What it writes.** Only the open draft, and only after you approve the preview. In a received email it can open a new reply with the result; that reply is a draft, and sending it is up to you.
- **Permission.** The add-in asks Outlook for "read and write the current item" (`ReadWriteItem`), the narrowest permission that lets it write a draft. It does not ask for access to your mailbox, does not run when its pane is closed and has no access to sending.
- **Settings and API keys.** Your preferences and your API key (encrypted as described above, with a key that no script can export) are stored in the add-in's storage in that Outlook application on that device. They are not synchronized, not stored in your mailbox and not shared with the browser extension, so you connect a key in each Outlook application you use.
- **Network.** Besides loading its page and Office.js, the add-in connects only to the provider whose key you connected (`api.groq.com`, `openrouter.ai` or `api.openai.com`), and only when you request a generation or connect a key. Its Content Security Policy blocks every other address.
- **Deleting your data.** Remove the key in the add-in's **Settings → AI connection → Remove key**, then remove the add-in in Outlook (**Get Add-ins → My add-ins**). Removing the add-in does not necessarily delete the data Outlook keeps for it.

## What Writehand does not do

- It does not collect, sell or share personal data, and it has no server that could receive it.
- It does not use analytics, tracking, advertising or crash reporting.
- It does not read your mailbox in the background or send email.
- It does not use your data to train models. (Whether a provider uses your requests is governed by your agreement with that provider.)

## Deleting your data

- Remove the extension from your browser to delete its settings and any saved API key. You can also remove a key in **Settings → AI connection → Remove key**, and revoke it on the provider's website.
- Uninstall the helper app with `--delete-data` (macOS and Linux) or `-DeleteData` (Windows) to delete stored sign-in tokens; see the [README](./README.md#install). You can also revoke Writehand's access in your ChatGPT settings under **Security and login**; a Codex sign-in is ended by removing the account in Writehand.
- Data that a provider has already received is subject to that provider's retention policy.

## Changes and contact

Changes to this policy are published in this repository, and its history shows every revision. For questions, open an issue at <https://github.com/dervisgenc/writehand/issues>. To report a security issue, follow the [security policy](./SECURITY.md).
