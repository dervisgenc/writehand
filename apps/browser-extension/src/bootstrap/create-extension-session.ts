import { createSession } from '@writehand/core';
import { ok, type TextProcessor } from '@writehand/contracts';
import { textFor } from '@writehand/locales';
import {
  createActionController,
  createApplyController,
  createMessageHistory,
  createPanelController,
  createRandomIds,
  createSessionStore,
  createSettingsStore,
  parseStoredSettings,
  resolveAppearance,
  SETTINGS_STORAGE_KEY,
  systemClock,
} from '@writehand/session';
import { computed, shallowRef, watch } from 'vue';
import type { ContentScriptContext } from '#imports';

import { createLauncherMounter } from '../mounting/mount-launchers';
import { mountPanel } from '../mounting/mount-panel';
import { removeOrphanedUi } from '../mounting/orphaned-ui';
import { copyText } from '../platform/clipboard';
import { reportDiagnostic } from '../platform/diagnostics';
import {
  addRuntimeMessageListener,
  isOwnExtensionPage,
  localStorageArea,
  onSettingsStorageChanged,
} from '../platform/extension-browser';
import { createRuntimeHandler, toMessageListener } from '../platform/runtime-messaging';
import { createLauncherPositionStore, type LauncherOffset } from '../platform/launcher-position-store';
import type { MailPageProvider } from './mail-provider';

export interface ExtensionSessionOptions {
  readonly ctx: ContentScriptContext;
  readonly provider: MailPageProvider;
  /** The real AI connection, or the sample result source in the test build. */
  readonly processor: TextProcessor | null;
}

/**
 * Wires together all parts of the page session. Dependencies are passed as function
 * parameters; no dependency injection library or app-wide event bus is used.
 */
export async function createExtensionSession(options: ExtensionSessionOptions): Promise<() => void> {
  const { ctx, provider, processor } = options;
  const { connector } = provider;
  const ids = createRandomIds();
  const settingsStore = createSettingsStore(localStorageArea);
  const settings = shallowRef((await settingsStore.read()).settings);

  const siteEnabled = computed(() => settings.value.siteEnabled[provider.siteId]);

  const store = createSessionStore(
    createSession({
      sessionId: ids.next(),
      thread: connector.getPageState().activeThread,
      defaults: { targetLanguage: settings.value.targetLanguage, tone: settings.value.tone },
    }),
  );
  const history = createMessageHistory({ connector, isEnabled: () => siteEnabled.value });
  const actions = createActionController({ store, connector, processor, history, clock: systemClock, ids });
  const applier = createApplyController({ store, connector, ids, copyText });
  const panel = createPanelController({ store, connector, actions, ids, settings: () => settings.value });
  const stopHistory = history.subscribe((snapshot) => actions.threadCaptured(snapshot));
  const session = {
    store,
    connector,
    panel,
    actions,
    applier,
    history,
    processingAvailable: processor !== null,
  };

  const text = computed(() => textFor(settings.value.uiLanguage).ui);
  const pageTheme = shallowRef(provider.readTheme());
  const refreshPageTheme = () => {
    pageTheme.value = provider.readTheme();
  };
  const appearance = computed(() =>
    resolveAppearance(settings.value.theme, pageTheme.value, provider.skin ?? 'fluent'),
  );
  const surface = shallowRef(panel.surface());

  // Remove UI orphaned by a previous (stopped) script before mounting the new one.
  removeOrphanedUi(document);
  const mountedPanel = await mountPanel(ctx, { session, text, appearance });
  const stopSurface = panel.onSurfaceChange((next) => {
    surface.value = next;
    // The Outlook theme may have changed in the user's settings; re-read it when the UI opens.
    refreshPageTheme();
    mountedPanel.setOpen(next.kind === 'panel');
  });

  // Where the user dragged the conversation button on this mail service; kept on the device.
  const positions = createLauncherPositionStore(localStorageArea, provider.siteId);
  let threadOffset: LauncherOffset | null = await positions.load().catch(() => null);

  const launchers = createLauncherMounter(ctx, {
    text,
    appearance,
    session,
    surface,
    threadPosition: {
      get: () => threadOffset,
      set(offset) {
        threadOffset = offset;
        void positions
          .save(offset)
          .catch(() => reportDiagnostic({ code: 'UNEXPECTED', area: 'content-script' }));
      },
    },
    defaultLanguage: computed(() => settings.value.targetLanguage),
    favoriteLanguages: computed(() => settings.value.favoriteLanguages),
    onOpenThread(anchor, opener) {
      if (anchor.target.kind === 'thread') {
        mountedPanel.rememberOpener(opener);
        panel.open({ origin: 'thread-launcher', thread: anchor.target.thread });
      }
    },
    onQuickAction(anchor, request) {
      if (anchor.target.kind === 'composer') {
        void panel.runQuickAction(anchor.target.composer, request);
      }
    },
    onOpenPanel(anchor, opener) {
      if (anchor.target.kind === 'composer') {
        mountedPanel.rememberOpener(opener);
        panel.open({ origin: 'composer-launcher', composer: anchor.target.composer });
      }
    },
  });

  const syncLaunchers = () => {
    const isReady = connector.getPageState().support === 'ready';
    if (siteEnabled.value && isReady) {
      launchers.sync(provider.locateLauncherAnchors());
    } else {
      launchers.removeAll();
    }
  };
  const stopConnector = connector.subscribe((event) => {
    if (
      event.type === 'page-state-changed' ||
      event.type === 'composer-added' ||
      event.type === 'composer-removed' ||
      event.type === 'composer-rebound'
    ) {
      refreshPageTheme();
      syncLaunchers();
    }
  });
  const stopSiteWatch = watch(siteEnabled, syncLaunchers);
  syncLaunchers();

  const stopSettings = onSettingsStorageChanged(SETTINGS_STORAGE_KEY, (raw) => {
    // A change to the default language/tone does not alter open work; it applies to the next session.
    settings.value = parseStoredSettings(raw).settings;
  });

  const handleMessage = createRuntimeHandler(
    {
      GET_PAGE_STATUS: async () => {
        const { support } = connector.getPageState();
        return ok({
          providerId: connector.providerId,
          support: siteEnabled.value ? support : 'disabled',
          canOpenPanel: siteEnabled.value && support === 'ready',
          panelOpen: panel.isOpen(),
        });
      },
      GET_SELECTOR_REPORT: async () => ok({ entries: [...provider.selectorReport()] }),
      OPEN_PANEL: async () => {
        // Only opens the panel; carries no email or result text and cannot write.
        const canOpen = siteEnabled.value && connector.getPageState().support === 'ready';
        if (canOpen) {
          mountedPanel.rememberOpener(null);
          panel.open({ origin: 'toolbar' });
        }
        return ok({ opened: canOpen });
      },
    },
    { context: 'content-script', isAllowedSender: isOwnExtensionPage },
  );
  const stopMessages = addRuntimeMessageListener(toMessageListener(handleMessage));

  const dispose = () => {
    stopMessages();
    stopSettings();
    stopConnector();
    stopSurface();
    stopHistory();
    stopSiteWatch();
    actions.dispose();
    history.dispose();
    panel.dispose();
    launchers.removeAll();
    mountedPanel.remove();
    connector.dispose();
  };
  ctx.onInvalidated(() => {
    reportDiagnostic({ code: 'EXTENSION_RELOADED', area: 'content-script' });
    dispose();
  });
  return dispose;
}
