import {
  createAiConnectionStore,
  createApiKeyConnection,
  createApiKeyProviders,
  createApiKeyService,
  createDirectProcessor,
  createIndexedDbKeyStore,
  createSecretVault,
  type ApiKeyService,
} from '@writehand/ai-connection';
import { type Settings, type SettingsChanges } from '@writehand/contracts';
import { createSession } from '@writehand/core';
import { createOutlookAddinConnector } from '@writehand/outlook-addin';
import {
  createActionController,
  createApplyController,
  createMessageHistory,
  createPanelController,
  createRandomIds,
  createSessionStore,
  createSettingsStore,
  SETTINGS_STORAGE_KEY,
  systemClock,
  type PanelSessionDependencies,
  type PatchSettingsResult,
} from '@writehand/session';
import { shallowRef, type ShallowRef } from 'vue';

import { copyText } from '../platform/clipboard';
import type { OfficeHost } from '../platform/office-host';
import { createLocalStorageArea, keyDatabaseName, onStorageChanged } from '../platform/storage';

export interface AddinSession {
  readonly panel: PanelSessionDependencies;
  readonly settings: Readonly<ShallowRef<Settings>>;
  saveSettings(changes: SettingsChanges): Promise<PatchSettingsResult>;
  readonly ai: ApiKeyService;
  /** Opens the panel's work for the item Outlook shows: its draft, its email, or nothing yet. */
  openForCurrentItem(): void;
  dispose(): void;
}

/**
 * Wires the task pane together, like the extension's content script does, without messaging:
 * the pane is one page, so the session calls the API key service directly. Dependencies are
 * passed as parameters; there is no dependency injection library or event bus.
 */
export async function createAddinSession(
  host: OfficeHost,
  formatDate: (iso: string) => string,
): Promise<AddinSession> {
  const area = createLocalStorageArea(host.partitionKey);
  const settingsStore = createSettingsStore(area);
  const settings = shallowRef((await settingsStore.ensureInitialized()).settings);

  const connectionStore = createAiConnectionStore(area);
  const apiKeys = createApiKeyConnection({
    store: connectionStore,
    vault: createSecretVault({
      area,
      keys: createIndexedDbKeyStore(indexedDB, keyDatabaseName(host.partitionKey)),
    }),
    providers: createApiKeyProviders(),
    // The page's Content Security Policy allows exactly the three providers.
    access: async () => true,
  });
  const ai = createApiKeyService({ store: connectionStore, apiKeys });
  const processor = createDirectProcessor(ai, async () => ({
    standingInstructions: (await settingsStore.read()).settings.writingInstructions,
  }));

  const connector = createOutlookAddinConnector({ mailbox: host.mailbox, formatDate });
  const ids = createRandomIds();
  const store = createSessionStore(
    createSession({
      sessionId: ids.next(),
      thread: connector.getPageState().activeThread,
      defaults: { targetLanguage: settings.value.targetLanguage, tone: settings.value.tone },
    }),
  );
  const history = createMessageHistory({ connector, isEnabled: () => true });
  const actions = createActionController({ store, connector, processor, history, clock: systemClock, ids });
  const applier = createApplyController({ store, connector, ids, copyText });
  const panel = createPanelController({ store, connector, actions, ids, settings: () => settings.value });
  const stopHistory = history.subscribe((snapshot) => actions.threadCaptured(snapshot));
  const stopSettings = onStorageChanged(host.partitionKey, SETTINGS_STORAGE_KEY, () => {
    void settingsStore.read().then((stored) => (settings.value = stored.settings));
  });

  return {
    panel: { store, connector, panel, actions, applier, history, processingAvailable: true },
    settings,
    async saveSettings(changes) {
      const result = await settingsStore.patch(settings.value.revision, changes);
      settings.value = result.settings;
      return result;
    },
    ai,
    openForCurrentItem() {
      const { activeThread, composers } = connector.getPageState();
      const [composer] = composers;
      if (composer !== undefined) panel.open({ origin: 'composer-launcher', composer });
      else if (activeThread !== null) panel.open({ origin: 'thread-launcher', thread: activeThread });
      else panel.open({ origin: 'toolbar' });
    },
    dispose() {
      stopSettings();
      stopHistory();
      actions.dispose();
      history.dispose();
      panel.dispose();
      connector.dispose();
    },
  };
}
