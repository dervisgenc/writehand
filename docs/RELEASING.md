# Releasing

This guide is for maintainers. The extension and the helper app are released together from this repository with one version. GitHub Actions builds every release file from a `vX.Y.Z` tag and creates a signed **draft** release; publishing it and submitting to the browser stores are manual steps.

See also: [Development guide](./DEVELOPMENT.md), [Helper app](./HELPER_APP.md), [Manual testing](./MANUAL_TESTING.md), [Building from source](./BUILD.md).

## Versioning

- **Single version source:** `version` in the root `package.json` (`MAJOR.MINOR.PATCH`, no pre-release suffixes). The extension manifest (`apps/browser-extension/wxt.config.ts`) and the helper app (`apps/ai-companion/src/version.ts`) take it at build time; internal packages have no version field.
- **Tags** are named `vX.Y.Z`. `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
- **Names and IDs:** internal package names (`@writehand/*`) are independent of the product name. The user-facing name and every external ID (native host name, Firefox ID, Chromium store IDs, repository) are in `packages/contracts/src/brand.ts`.

### Version compatibility

- **Protocol version.** The message envelope version (`PROTOCOL_VERSION` in `packages/contracts/src/protocol.ts`) increases only when the envelope format changes. New capabilities are added as new request types of the host protocol (`host-protocol.ts`). An older helper app answers a request type it does not know with `AI_VERSION_MISMATCH` right away, and the extension shows **Update needed**. The host protocol's existing requests keep their format; helper app 0.1.0 still accepts every request the extension sends.
- **Minimum helper version.** `MIN_HOST_VERSION` in `packages/contracts/src/host.ts` is the oldest helper app the extension works with.
- **Two-minor-versions rule.** A new extension release keeps working with a helper app up to two minor versions older; for example, extension 0.5.0 works with helper 0.3.x. When a release adds a request type, the extension hides that feature or suggests an update if the installed helper does not know it. Raise `MIN_HOST_VERSION` only after that window has passed. `SECURITY.md` states the same support window.
- **How each part updates.** The extension updates automatically from the browser stores. The helper app updates with the user's consent (**Settings → Helper app → Update**, or `writehand update`) and checks for a new version at most once a day.

## Release steps

1. Record user-visible changes in `CHANGELOG.md` under `## [Unreleased]`.
2. Set the version:

   ```sh
   pnpm release:version 0.2.0
   pnpm check
   git commit -am "chore: release v0.2.0"
   ```

   `release:version` updates the root `package.json` and adds a `## [0.2.0] - <date>` heading below `## [Unreleased]`, so the collected entries become that version's notes. It refuses a lower version or one that already has a section.

3. Merge the release commit into `main`, then tag that commit and push the tag:

   ```sh
   git tag v0.2.0
   git push origin v0.2.0
   ```

4. `release.yml` runs:
   1. Checks that the tag matches `package.json` and that `CHANGELOG.md` has a section for the version.
   2. Calls `helper.yml`, which builds the single-file helper app on five systems and tests it with the install scripts (see [CI](#ci)).
   3. Builds the store packages (`wxt zip`), runs `pnpm verify:packages` and creates the source archive with `git archive`.
   4. Writes `SHA256SUMS` for every file and signs it as `SHA256SUMS.sig` (`scripts/sign-release.mjs`).
   5. Attests the build provenance of every file (`actions/attest-build-provenance`).
   6. Creates a **draft** GitHub release titled "Writehand 0.2.0" with notes from `scripts/release-notes.mjs`: the changelog section followed by the install commands.

5. Verify the draft (see [Verifying a draft release](#verifying-a-draft-release)).
6. Select **Publish release**. `releases/latest` now points to this version: the install command uses it at once, and installed helper apps see the update within a day.
7. Submit the extension packages to the stores (see [Store submission](#store-submission)).

### Verifying a draft release

The draft must contain these files:

| File | Contents |
| --- | --- |
| `writehand-darwin-arm64.tar.gz`, `writehand-darwin-x64.tar.gz` | Helper app for macOS (Apple silicon, Intel) |
| `writehand-linux-x64.tar.gz`, `writehand-linux-arm64.tar.gz` | Helper app for Linux |
| `writehand-windows-x64.zip` | Helper app for Windows (also runs on Windows on Arm) |
| `writehand-<version>-firefox.zip` | Firefox Add-ons package |
| `writehand-<version>-chromium.zip` | Chrome Web Store and Edge Add-ons package |
| `writehand-<version>-source.zip` | Source archive of the tagged commit (for AMO review) |
| `install.sh`, `install.ps1`, `install-outlook.ps1` | Install scripts (the last one: Windows, with the Outlook add-in server) |
| `SHA256SUMS`, `SHA256SUMS.sig` | Checksums of every file and their Ed25519 signature (base64) |

Draft assets are not public, so download them with the GitHub CLI into a folder outside the repository and run the checks from the repository root:

```sh
draft=~/writehand-v0.2.0
gh release download v0.2.0 --repo dervisgenc/writehand --dir "$draft"

# Checksums (Linux: sha256sum -c SHA256SUMS)
(cd "$draft" && shasum -a 256 -c SHA256SUMS)

# Signature, independently of the helper app. Needs OpenSSL 3; the LibreSSL that ships
# with macOS has no Ed25519 support (use Homebrew's openssl@3).
{ echo '-----BEGIN PUBLIC KEY-----'
  node -p "require('./apps/ai-companion/release-key.json').ed25519PublicKey"
  echo '-----END PUBLIC KEY-----'; } > "$draft.pem"
base64 -d < "$draft/SHA256SUMS.sig" > "$draft.sig"
openssl pkeyutl -verify -pubin -inkey "$draft.pem" -rawin -in "$draft/SHA256SUMS" -sigfile "$draft.sig"
# Expected: Signature Verified Successfully

# Build provenance (works for any of the files)
gh attestation verify "$draft/writehand-linux-x64.tar.gz" --repo dervisgenc/writehand
```

Then install the draft's helper app on a test machine from the downloaded folder, without touching `releases/latest`:

```sh
WRITEHAND_DOWNLOAD_BASE="file://$draft" sh "$draft/install.sh"
```

```powershell
$draft = "$HOME\writehand-v0.2.0"
$env:WRITEHAND_DOWNLOAD_BASE = $draft
Get-Content -Raw "$draft\install.ps1" | Invoke-Expression
# or with the Outlook add-in server (Windows asks to trust its certificate):
Get-Content -Raw "$draft\install-outlook.ps1" | Invoke-Expression
```

Add `--extension-id=ID` (or `$env:WRITEHAND_EXTENSION_ID`) when testing with a Chromium build whose ID is not yet in `CHROMIUM_EXTENSION_IDS`. In the extension's settings, the helper app card must show **Connected** with the new version. Remove it again with `sh "$draft/install.sh" uninstall` (or the PowerShell uninstall command). For a full pass on clean machines, follow [Manual testing](./MANUAL_TESTING.md).

## Store submission

Submission is manual. Submit to **Firefox Add-ons (AMO)** and **Microsoft Edge Add-ons** first, and to the **Chrome Web Store** one to two days later. Brave installs from the Chrome Web Store.

| Store | Package | Also upload |
| --- | --- | --- |
| Firefox Add-ons | `writehand-<version>-firefox.zip` | `writehand-<version>-source.zip` as the source code (build instructions: [BUILD.md](./BUILD.md)); screenshots from `store/screenshots/en/`. AMO does not accept a video. Desktop Firefox only: the manifest has no `gecko_android`, so the listing is not offered on Firefox for Android |
| Microsoft Edge Add-ons | `writehand-<version>-chromium.zip` | `store/icons/edge-store-logo-300.png`; all screenshots; `store/promo/small-promo-440x280.png` and `marquee-1400x560.png`; the YouTube video link |
| Chrome Web Store | the same `writehand-<version>-chromium.zip` | `store/icons/chrome-store-icon-128.png`; screenshots `01` to `05` (the store accepts five); the two promo tiles; the YouTube video link |

For every store listing:

- **Privacy policy:** Edge Add-ons and the Chrome Web Store take a link: `https://github.com/dervisgenc/writehand/blob/main/PRIVACY.md`. Firefox Add-ons takes the text itself: paste the content of [PRIVACY.md](../PRIVACY.md) into the listing's privacy policy field, and paste it again whenever the policy changes. Keep the stores' data use answers consistent with it: text is sent to the AI provider the user chose only on request; there is no analytics or server. The Firefox manifest declares `personalCommunications` and `authenticationInfo`; in the Chrome Web Store's privacy practices, select *Personal communications* and *Authentication information*, and answer *No* for remote code.
- **Description:** say that the API key method needs nothing else, and that the ChatGPT and Claude plans need the separate, open-source helper app (link to the repository). Edge Add-ons requires this disclosure for software outside the extension. Describe the plans as the user's own signed-in accounts; never describe Writehand as a way around a provider's usage limits.
- **Permission justification:** `storage` holds the settings; the optional `nativeMessaging` permission lets the extension talk to the open-source helper app that holds the AI connection on the user's computer, and the welcome wizard asks for it with an explanation. Content scripts run only on the four Outlook on the web origins and on Gmail (`mail.google.com`).
- **Review notes:** reviewers do not contact you, so the notes must let them test without help:

  ```text
  How to test without installing anything else:
  1. Install the extension. The welcome page opens; choose "API key" and select Groq.
  2. Paste this test key (spending limit set): <key>. Allow the browser to connect to api.groq.com.
  3. Select "Try it" to revise a sample email, or open a draft in Outlook on the web or Gmail.

  The optional nativeMessaging permission is requested only when the user chooses the
  ChatGPT or Claude plan. It talks to Writehand's own open-source helper app
  (https://github.com/dervisgenc/writehand/tree/main/apps/ai-companion), which the user
  installs separately; the extension works without it.

  web-ext lint warnings come from bundled libraries only: Zod's Function() capability probe
  (code generation is disabled with jitless and blocked by the extension CSP) and Vue's
  runtime innerHTML path. There is no remote code.
  ```

  For Firefox Add-ons also add: "Build: Node.js 24, pnpm 12.11.2; `pnpm install --frozen-lockfile && pnpm --filter @writehand/browser-extension zip:all`. See docs/BUILD.md in the source archive." Create a separate Groq key for reviewers and delete it after approval.

### Adding the store IDs

Edge Add-ons and the Chrome Web Store assign an extension ID per listing. Add both IDs to `CHROMIUM_EXTENSION_IDS` in `packages/contracts/src/brand.ts` and publish a new release:

- The helper app then allows these IDs without `--extension-id`, and the welcome wizard of a store build no longer adds an ID to the install command.
- Existing installations receive the new list with the helper app update: the new program's `install` refreshes the browser registrations and keeps every ID that was allowed before.
- Until then, the wizard of a store build appends `--extension-id=<its ID>` to the command, so users can install the helper app in the meantime.

The Firefox ID (`writehand@dervisgenc.com`) is fixed and must never change.

## Store assets

`pnpm store:assets` generates every store image and the demo video. Without arguments it runs all steps; pass `icons`, `screenshots`, `promo` or `video` to run only some, and `--scene=01-reply` for a single scene. It needs Playwright's Chromium (`pnpm exec playwright install chromium`).

- **Logo sources:** `assets/brand/writehand-icon.svg`, and `assets/brand/writehand-icon-small.svg` (heavier strokes) for 32 px and smaller. The extension icons (`apps/browser-extension/public/icon/`, which WXT adds to the manifest) and the store icons are generated only from these two files. After changing the logo, run `pnpm store:assets icons` first.
- **Demo mailbox:** screenshots and the video are captured with the extension's demo build (`wxt build --mode demo`: real AI connection path, local address support) in the made-up mailbox in `scripts/store-assets/demo-mailbox/`. A fake helper app returns the pre-written texts in `scripts/store-assets/story.mjs`; no real account, Outlook page or AI is involved. The demo page mirrors Outlook's verified DOM structure but carries no Microsoft name or logo. Scenes are defined in `scenes.mjs`, the video flow in `video.mjs`.
- **Re-run** after interface text or a flow changes. A scene that gets stuck leaves its last frame at `scripts/store-assets/.output/raw/<scene>-failed.png`.

| Output | Contents |
| --- | --- |
| `store/icons/` | `chrome-store-icon-128.png` (96 px artwork with 16 px transparent padding), `edge-store-logo-300.png`, `writehand-icon-512.png` |
| `store/screenshots/en/` | 1280×800 screenshots `01-reply` to `07-privacy`. The Chrome Web Store accepts five (`01` to `05`); Edge and AMO take all |
| `store/promo/` | `small-promo-440x280.png`, `marquee-1400x560.png`, `social-preview-1280x640.png` (the repository's social preview in GitHub settings), `video-thumbnail-1280x720.png` (YouTube thumbnail) |
| `store/video/writehand-demo-en.mp4` | 1920×1080, 30 fps, H.264, no audio. Upload it to YouTube and enter the link in the Chrome Web Store and Edge Add-ons listings |

The video step needs `ffmpeg` with libx264 on `PATH` (`brew install ffmpeg` on macOS) or its location in `FFMPEG=<path>`.

## Signing key

Release checksums are signed with an Ed25519 key. The public key is committed as `apps/ai-companion/release-key.json` and built into every helper app, which uses it to verify updates. The private key exists only outside the repository and in a GitHub Actions secret.

**Generating a key pair:**

```sh
node scripts/generate-release-key.mjs ~/writehand-release-signing-key.pem
```

The script writes the private key (PKCS#8 PEM, file mode `0600`) only to the file you name and refuses a path inside the repository or an existing file. It writes the public key to `apps/ai-companion/release-key.json`; commit that file.

**The GitHub Actions secret** is named `WRITEHAND_RELEASE_SIGNING_KEY`. Its value is the **full PEM text of the Ed25519 private key**, from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----` inclusive. It is not a password or passphrase. Set it with:

```sh
gh secret set WRITEHAND_RELEASE_SIGNING_KEY < ~/writehand-release-signing-key.pem
```

or paste the whole file under **Settings → Secrets and variables → Actions → New repository secret**.

- Keep the private key outside the repository and back it up in a password manager.
- `scripts/sign-release.mjs` verifies every new signature against the committed public key; if the secret does not match `release-key.json`, the release workflow stops before a draft is created.
- **Rotating the key** (only if it is lost or compromised): generate a new pair, commit the new `release-key.json`, replace the secret and release. Helper apps built with the old public key cannot verify releases signed with the new key, so they cannot update themselves (`HOST_UPDATE_UNVERIFIED`); their users must run the install command again. Say so in the release notes.

## CI

All workflows are in `.github/workflows/`. The pnpm store is cached through `pnpm/action-setup`, and every job uses Node.js 24.

| Workflow | Runs on | What it does |
| --- | --- | --- |
| `ci.yml` | Every pull request and every push to `main` | `pnpm check` on Ubuntu, macOS and Windows; the Chromium end-to-end tests and the Firefox smoke test on Ubuntu (test results are uploaded on failure); calls `helper.yml` |
| `helper.yml` | Called by `ci.yml` and `release.yml` | Builds the Outlook add-in's task pane, then the single-file helper app, which carries it, on macOS arm64 and x64, Linux x64 and arm64, and Windows x64. Installs it with `install.sh` or `install.ps1` from a local folder (`WRITEHAND_DOWNLOAD_BASE`, unsigned `SHA256SUMS`), runs `writehand status`, starts the program the way a browser does, with a minimal environment, and asks `HOST_INFO` over native messaging framing (`scripts/smoke-helper.mjs`), uninstalls it and checks that its files (and on Windows its registry keys) are gone. Uploads the archives as artifacts |
| `release.yml` | Tags matching `v*` | Version check, `helper.yml`, extension packages and source archive, then signing, provenance attestation and the draft release (see [Release steps](#release-steps)). Only the final job has write permissions (`contents`, `id-token`, `attestations`) and the signing secret, and it runs in the `release` environment |

### Supply chain

- **Pinned actions.** Every third-party action is pinned to a full commit SHA with its version in a comment (`uses: actions/checkout@<sha> # v7.0.1`). A moved or hijacked tag cannot change what runs, which matters because the release build is signed and attested. Dependabot (`.github/dependabot.yml`) opens one grouped pull request a month with new SHAs; read the actions' release notes before merging it.
- **No stored token.** `actions/checkout` runs with `persist-credentials: false`, so the job token is not left in `.git/config`; the draft release is created with `gh` and `GH_TOKEN`.
- **Pull requests from forks** run `ci.yml` with read-only permissions and no secrets.

### Release protection (GitHub settings)

These settings live in the repository settings, not in the code. They make sure that only you can produce a signed release, even if a token with write access leaks. Every release run that reaches the signing job is recorded as a deployment to `release`; that is the **Deployments → release** entry on the repository page. It is not a separate release and needs no action. Set them up once:

1. **Environment.** Settings → Environments → `release` (the first release run creates it; you can also create it with **New environment**). Under **Deployment branches and tags**, choose **Selected branches and tags**, select **Add deployment branch or tag rule**, set **Ref type** to **Tag** (the default is Branch) and enter `v*`. A branch rule named `v*` does not match a tag, and the next release would stop at the signing job. Optional: under **Required reviewers**, add yourself; every release then waits until you select **Approve and deploy** on the run.
2. **Signing key as an environment secret.** In the same environment, **Add environment secret** named `WRITEHAND_RELEASE_SIGNING_KEY` with the same PEM text as the repository secret (`gh secret set WRITEHAND_RELEASE_SIGNING_KEY --env release < ~/writehand-release-signing-key.pem`). Start a release to check it, then delete the repository secret (`gh secret delete WRITEHAND_RELEASE_SIGNING_KEY`). From then on only a job in `release`, started by a `v*` tag, can read the key.
3. **Tag ruleset.** Settings → Rules → Rulesets → **New ruleset → New tag ruleset**: name `release tags`, enforcement **Active**, target pattern `v*`, rules **Restrict creations**, **Restrict updates** and **Restrict deletions**, and add **Repository admin** to the bypass list. Only admins can then create or move release tags.

