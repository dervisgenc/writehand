# Contributing to Writehand

Thanks for your interest in improving Writehand! Bug reports, ideas and pull requests are welcome.

## Before you start

- **Security issues:** do not open a public issue. Follow the [security policy](./SECURITY.md).
- **Bugs and ideas:** open an [issue](https://github.com/dervisgenc/writehand/issues/new/choose). For larger changes, please open an issue first so we can agree on the approach.
- **Privacy:** never include real email content, access tokens, API keys or account details in issues, code, tests, fixtures or screenshots. Use made-up text.

## Development setup

Requirements: Node.js 22 or newer (24 LTS to build the single-file helper app) and pnpm 12.

```sh
pnpm install
pnpm dev     # Chromium development build with live reload
pnpm check   # typecheck, lint, format, tests, builds and package checks
```

See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for the architecture, all commands and the testing setup, and [docs/HELPER_APP.md](./docs/HELPER_APP.md) for the helper app.

## Pull requests

- Keep each pull request focused on one change and make sure `pnpm check` passes. CI also runs on Linux, macOS and Windows and builds the helper app for every supported system.
- Add or update tests for behavior changes. Tests use synthetic Outlook and Gmail pages and made-up emails (`tests/fixtures/`).
- User-facing text lives in `packages/locales/src/` and must be provided in all five languages (English, Turkish, German, French, Spanish).
- Write commit messages in English using [Conventional Commits](https://www.conventionalcommits.org/), for example `fix(outlook-web): keep the selection after a re-render`.
- Add user-visible changes to `CHANGELOG.md` under `[Unreleased]`.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
