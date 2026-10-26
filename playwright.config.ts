import { defineConfig } from '@playwright/test';

/**
 * Playwright can only drive extension flows in Chromium. Firefox is covered
 * separately by `tests/e2e/extension-firefox/run-smoke.mjs` and a real install;
 * a passing Chromium run does not count for Firefox.
 *
 * The Outlook add-in's task pane runs from its production build with an in-memory Office.js
 * and a stubbed provider; a passing run does not show that it works in a real Outlook.
 */
export default defineConfig({
  timeout: 30_000,
  workers: 1,
  reporter: [['list']],
  projects: [
    { name: 'extension-chromium', testDir: 'tests/e2e/extension-chromium' },
    { name: 'outlook-addin', testDir: 'tests/e2e/outlook-addin' },
  ],
  webServer: {
    command: 'node scripts/serve-fixtures.mjs',
    url: 'http://127.0.0.1:4517/mail/inbox',
    reuseExistingServer: true,
  },
});
