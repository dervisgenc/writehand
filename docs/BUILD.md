# Building Writehand from source

This note is for add-on store reviewers and anyone who wants to reproduce the release packages. The source archive attached to each release (`writehand-<version>-source.zip`) is `git archive` of the tagged commit. For development, see [DEVELOPMENT.md](./DEVELOPMENT.md); for the release process, see [RELEASING.md](./RELEASING.md).

## Requirements

- Node.js 24 LTS
- pnpm 12.11.2 (`npm install -g pnpm@12.11.2`; the version is pinned in `package.json` → `packageManager`)
- Linux, macOS or Windows; no other system tools are needed for the extension

## Extension packages

```sh
pnpm install --frozen-lockfile
pnpm --filter @writehand/browser-extension zip:all
```

This writes, under `apps/browser-extension/.output/`:

| File | Store | Unpacked build |
| --- | --- | --- |
| `writehand-<version>-firefox.zip` | Firefox Add-ons (AMO) | `firefox-mv3/` |
| `writehand-<version>-chrome.zip` (attached to releases as `-chromium.zip`) | Chrome Web Store, Microsoft Edge Add-ons; Brave installs from the Chrome Web Store | `chrome-mv3/` |

The build is WXT (Vite) with Vue 3; nothing is downloaded at run time and no code is minified away from its source beyond Vite's standard production build. `pnpm verify:packages` checks permissions, content script matches and that no development code is included.

## Helper app

For the ChatGPT and Claude plans, the extension talks to a small helper app on the user's computer through native messaging (`com.dervisgenc.writehand`); API keys need no helper app. Its source is in `apps/ai-companion`; release builds are single programs made with Node.js's single executable application support:

```sh
pnpm addin:build   # the Outlook add-in's task pane, which the program carries
pnpm ai:sea        # run with Node.js 24 on each target system
```

The program and its third-party licenses (including the packages inside the add-in's task pane) are written to `apps/ai-companion/dist/release/`. The build stops if the add-in has not been built.

## Where things are

| Path | Contents |
| --- | --- |
| `apps/browser-extension` | Extension entry points, settings, welcome wizard |
| `packages/*` | Shared contracts, core logic, UI components, Outlook connector, email formatting, AI providers |
| `apps/ai-companion` | Helper app (native messaging host, installer, updater) |
