import type { TextProcessor } from '@writehand/contracts';
import { createSettingsStore } from '@writehand/session';
import type { ContentScriptContext } from '#imports';

import { createConnectedProcessor } from '../platform/connected-processor';
import { reportDiagnostic } from '../platform/diagnostics';
import { localStorageArea, sendToBackground } from '../platform/extension-browser';
import { createExtensionSession } from './create-extension-session';
import type { MailPageProvider } from './mail-provider';

/**
 * Regular and development builds use the real AI connection. Only the test build has labeled
 * sample results; that module is stripped from the production bundle at build time.
 */
async function loadTextProcessor(): Promise<TextProcessor | null> {
  if (import.meta.env.MODE !== 'test') {
    const settings = createSettingsStore(localStorageArea);
    return createConnectedProcessor(sendToBackground, async () => ({
      standingInstructions: (await settings.read()).settings.writingInstructions,
    }));
  }
  const { createFixtureProcessor } = await import('../development/fixture-results');
  return createFixtureProcessor();
}

/**
 * SPA navigation for a connector: a location change only triggers rediscovery; it does not
 * identify the right conversation. WXT removes the listener itself when the context is
 * invalidated.
 */
export function locationChanges(ctx: ContentScriptContext) {
  return (listener: () => void): (() => void) => {
    let active = true;
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      if (active) {
        listener();
      }
    });
    return () => {
      active = false;
    };
  };
}

/** Starts the panel session for a mail page. A failure must not break normal use of the mail app. */
export async function startMailSession(ctx: ContentScriptContext, provider: MailPageProvider): Promise<void> {
  try {
    await createExtensionSession({ ctx, provider, processor: await loadTextProcessor() });
  } catch {
    provider.connector.dispose();
    reportDiagnostic({ code: 'UNEXPECTED', area: 'content-script' });
  }
}
