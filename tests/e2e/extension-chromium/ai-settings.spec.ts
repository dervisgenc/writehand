import { expect, test } from './extension-fixture';

test('without the helper app, settings offer the API key method, the permission and the setup wizard with no developer instructions', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.getByRole('heading', { name: 'AI bağlantısı', exact: true })).toBeVisible();
  // The API key method works without the helper app, so its absence is not an error here.
  await expect(page.locator('.ew-method[data-mode="api-key"]')).toHaveAttribute('data-checked', 'true');
  await expect(page.getByLabel('Groq API anahtarı')).toBeVisible();
  await expect(page.locator('.ew-ai-settings').getByRole('alert')).toHaveCount(0);
  // A plan method points to the setup wizard instead.
  await page.locator('.ew-method[data-mode="chatgpt"]').click();
  await expect(page.locator('.ew-ai-settings')).toContainText('henüz bağlı değil');
  await expect(
    page.locator('.ew-ai-settings').getByRole('button', { name: 'Kurulum sihirbazını aç' }),
  ).toBeVisible();
  const helper = page.locator('.ew-helper');
  await expect(helper.locator('.ew-status-pill')).toHaveText('İzin gerekli');
  await expect(helper.getByRole('button', { name: 'Kurulum sihirbazını aç' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(extensionId);
  await expect(page.locator('body')).not.toContainText('pnpm');
  await page.screenshot({
    path: 'test-results/ai-settings-light.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByText('Koyu', { exact: true }).click();
  await page.screenshot({
    path: 'test-results/ai-settings-dark.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('ChatGPT account, first-use notice and model selection over a simulated native connection', async ({
  context,
  extensionId,
}) => {
  const worker = context.serviceWorkers()[0]!;
  await worker.evaluate(() => {
    const runtime = (globalThis as unknown as { chrome: { runtime: { connectNative: () => unknown } } })
      .chrome.runtime;
    const status = {
      mode: 'chatgpt',
      accounts: [] as {
        id: string;
        label: string;
        email: string;
        verified: boolean;
        connected: boolean;
        planEnabled: boolean;
      }[],
      activeAccountId: null as string | null,
      apiKeyConfigured: false,
      models: [] as { id: string; label: string }[],
      selectedModel: null as string | null,
      ready: false,
      signingIn: false,
      needsPlanAcknowledgement: false,
      claudeCode: null,
      error: null,
    };
    runtime.connectNative = () => {
      let receive: (message: unknown) => void;
      return {
        onMessage: {
          addListener: (listener: (message: unknown) => void) => {
            receive = listener;
          },
        },
        onDisconnect: { addListener: () => undefined },
        disconnect: () => undefined,
        postMessage(request: {
          protocolVersion: number;
          requestId: string;
          type: string;
          payload: { action?: string; model?: string; accountId?: string; label?: string };
        }) {
          if (request.type === 'AI_COMMAND') {
            if (request.payload.action === 'connect')
              Object.assign(status, {
                accounts: [
                  {
                    id: 'oaiapp_test',
                    label: 'ChatGPT 1',
                    email: 'demo@example.test',
                    verified: true,
                    connected: true,
                    planEnabled: true,
                  },
                ],
                activeAccountId: 'oaiapp_test',
                models: [
                  { id: 'model-a', label: 'Test model A' },
                  { id: 'model-b', label: 'Test model B' },
                ],
                selectedModel: 'model-a',
                ready: true,
                needsPlanAcknowledgement: true,
              });
            if (request.payload.action === 'acknowledge-plan') status.needsPlanAcknowledgement = false;
            if (request.payload.action === 'set-model') status.selectedModel = request.payload.model ?? null;
            if (request.payload.action === 'rename-account') {
              const account = status.accounts.find((item) => item.id === request.payload.accountId);
              if (account && request.payload.label) account.label = request.payload.label;
            }
            if (request.payload.action === 'remove-account') {
              status.accounts = status.accounts.filter((item) => item.id !== request.payload.accountId);
              status.activeAccountId = null;
              status.selectedModel = null;
              status.models = [];
              status.ready = false;
            }
            if (request.payload.action === 'disconnect') {
              status.accounts[0]!.connected = false;
              status.accounts[0]!.planEnabled = false;
              status.ready = false;
              status.models = [];
            }
          }
          setTimeout(
            () =>
              receive({
                protocolVersion: request.protocolVersion,
                requestId: request.requestId,
                ok: true,
                payload: structuredClone(status),
              }),
            0,
          );
        },
      };
    };
  });
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.getByRole('button', { name: 'Continue with ChatGPT' }).click();
  const welcome = page.getByRole('dialog', { name: 'ChatGPT planınızı kullanıyorsunuz' });
  await expect(welcome).toBeVisible();
  await page.screenshot({ path: 'test-results/ai-plan-welcome.png', fullPage: true, animations: 'disabled' });
  await welcome.getByRole('button', { name: 'Anladım' }).click();
  await expect(welcome).not.toBeVisible();
  await page.getByLabel('Model', { exact: true }).selectOption('model-b');
  await expect(page.getByLabel('Model', { exact: true })).toHaveValue('model-b');
  await page.getByRole('button', { name: 'Yeniden adlandır', exact: true }).click();
  await page.getByLabel('Bağlantı adı', { exact: true }).fill('Kişisel · Yazışmalar');
  await page.getByRole('button', { name: 'Adı kaydet', exact: true }).click();
  await expect(page.getByLabel('Bağlantı adı', { exact: true })).toHaveCount(0);
  await expect(page.locator('.ew-ai-settings option:checked').first()).toContainText('Kişisel · Yazışmalar');
  await page.screenshot({
    path: 'test-results/ai-connected-light.png',
    fullPage: true,
    animations: 'disabled',
  });
  // The Codex sign-in starts only after its risks are shown and confirmed.
  const codex = page.getByRole('button', { name: 'Codex girişiyle bağlan', exact: true });
  await codex.click();
  const codexWarning = page.getByRole('region', { name: 'Codex girişini kullanmadan önce' });
  await expect(codexWarning).toBeVisible();
  await expect(codexWarning.getByRole('button', { name: 'Anladım, devam et' })).toBeFocused();
  await codexWarning.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/ai-codex-warning-light.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(codexWarning).toHaveCount(0);
  await expect(codex).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText('Koyu', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Writehand ayarları', exact: true })).toHaveCount(1);
  await page.getByRole('heading', { name: 'Writehand ayarları', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading', { name: 'Writehand ayarları', exact: true })).toBeInViewport();
  await page.screenshot({
    path: 'test-results/ai-connected-narrow-dark.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await codex.click();
  await expect(codexWarning).toBeVisible();
  await codexWarning.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/ai-codex-warning-narrow-dark.png', animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await codexWarning.getByRole('button', { name: 'İptal', exact: true }).click();
  await expect(codexWarning).toHaveCount(0);
  await page.getByRole('button', { name: 'Bağlantıyı kes' }).click();
  await expect(page.getByText('Oturum kapalı', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hesabı kaldır', exact: true }).click();
  const removal = page.getByRole('dialog', { name: 'Bu bağlantı kaldırılsın mı?' });
  await expect(removal).toBeVisible();
  await expect(removal).toContainText('Kişisel · Yazışmalar');
  await expect(removal.getByRole('button', { name: 'İptal', exact: true })).toBeFocused();
  await page.screenshot({ path: 'test-results/ai-account-remove-narrow-dark.png', animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await removal.getByRole('button', { name: 'İptal', exact: true }).click();
  await expect(removal).not.toBeVisible();
  await expect(page.getByText('Oturum kapalı', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hesabı kaldır', exact: true }).click();
  await removal.getByRole('button', { name: 'Kaldır', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hesabı kaldır', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with ChatGPT' })).toBeEnabled();
});
