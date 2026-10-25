import {
  createAiConnection,
  createAiConnectionStore,
  createApiKeyConnection,
  createApiKeyProviders,
  createHelperClient,
  createIndexedDbKeyStore,
  createSecretVault,
} from '@writehand/ai-connection';
import { ok } from '@writehand/contracts';
import { createSettingsStore } from '@writehand/session';
import { browser, defineBackground } from '#imports';

import { reportDiagnostic } from '../src/platform/diagnostics';
import {
  addRuntimeMessageListener,
  hasProviderAccess,
  isOwnExtensionPage,
  localStorageArea,
  connectAiHost,
  extensionId,
  openOptionsPage,
  openWelcomePage,
} from '../src/platform/extension-browser';
import { createAiHandlers } from '../src/platform/ai-background';
import { createAiSenderPolicy } from '../src/platform/ai-sender-policy';
import { createNativeClient } from '../src/platform/native-client';
import { isSupportedUrl } from '../src/platform/extension-client';
import { createRuntimeHandler, toMessageListener } from '../src/platform/runtime-messaging';

/**
 * Validated message routing for setup/settings and the AI connection. Generation text stays
 * in memory only for the duration of a request. API keys are decrypted here, only to send
 * them to their provider; helper app tokens never reach this context. If the worker
 * restarts, a pending request fails.
 */
export default defineBackground(() => {
  const settings = createSettingsStore(localStorageArea);
  const helper = createHelperClient(createNativeClient(connectAiHost).send);
  const store = createAiConnectionStore(localStorageArea);
  const connection = createAiConnection({
    store,
    helper,
    apiKeys: createApiKeyConnection({
      store,
      vault: createSecretVault({ area: localStorageArea, keys: createIndexedDbKeyStore() }),
      providers: createApiKeyProviders(),
      access: hasProviderAccess,
    }),
  });

  browser.runtime.onInstalled.addListener((details) => {
    // On first install the welcome wizard helps choose and set up a connection method.
    if (details.reason === 'install') void openWelcomePage();
    void settings.ensureInitialized().then((stored) => {
      if (stored.issue === 'invalid' || stored.issue === 'newer-schema') {
        reportDiagnostic({ code: 'SETTINGS_INVALID', area: 'background' });
      }
    });
  });

  const handle = createRuntimeHandler(
    {
      ...createAiHandlers({ connection, helper, openOptions: openOptionsPage }),
      GET_SETTINGS: async () => ok({ settings: (await settings.read()).settings }),
      // Writes are processed in order; success is returned only once storage completes.
      PATCH_SETTINGS: async (payload) => ok(await settings.patch(payload.expectedRevision, payload.changes)),
    },
    {
      context: 'background',
      isAllowedSender: createAiSenderPolicy({
        extensionId: extensionId(),
        isOwnPage: isOwnExtensionPage,
        isMailUrl: isSupportedUrl,
      }),
    },
  );
  addRuntimeMessageListener(toMessageListener(handle));
});
