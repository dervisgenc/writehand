import {
  createAiConnectionStore,
  createApiKeyConnection,
  createApiKeyProviders,
  createApiKeyService,
  createDirectProcessor,
  createIndexedDbKeyStore,
  createSecretVault,
  type ApiKeyProvider,
  type ApiKeyService,
} from '@writehand/ai-connection';
import {
  type ApiProvider,
  type MailConnector,
  type Settings,
  type SettingsChanges,
  type TextProcessor,
} from '@writehand/contracts';
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
 * `pnpm addin:build:sample` builds the pane for checks in a real Outlook without an AI account:
 * local providers return labeled samples and nothing goes over the network. Other builds strip
 * that module (the mode is replaced at build time).
 */
const SAMPLE_BUILD = import.meta.env.MODE === 'localhost-sample';

async function loadProviders(): Promise<Readonly<Record<ApiProvider, ApiKeyProvider>>> {
  if (!SAMPLE_BUILD) return createApiKeyProviders();
  const { createSampleProviders } = await import('../development/sample-providers');
  return createSampleProviders();
}

/**
 * Office.js tells a draft's compose type asynchronously; the session starts once the page knows
 * whether the open draft is a reply. After `timeoutMs` it starts anyway and follows the events.
 */
function whenPageReady(connector: MailConnector, timeoutMs = 5_000): Promise<void> {
  if (connector.getPageState().support !== 'waiting') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      stop();
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    const stop = connector.subscribe((event) => {
      if (event.type === 'page-state-changed' && event.state.support !== 'waiting') done();
    });
  });
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
    providers: await loadProviders(),
    // The page's Content Security Policy allows exactly the three providers.
    access: async () => true,
  });
  const ai = createApiKeyService({ store: connectionStore, apiKeys });
  const direct = createDirectProcessor(ai, async () => ({
    standingInstructions: (await settingsStore.read()).settings.writingInstructions,
  }));
  // The sample build labels its results as samples, as the extension's test build does.
  const processor: TextProcessor = SAMPLE_BUILD
    ? {
        kind: 'development-sample',
        process: async (action, signal) => {
          const result = await direct.process(action, signal);
          return result.ok ? { ...result, value: { ...result.value, sample: true } } : result;
        },
      }
    : direct;

  const connector = createOutlookAddinConnector({ mailbox: host.mailbox, formatDate });
  await whenPageReady(connector);
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
