import type { Appearance, PanelSessionDependencies } from '@writehand/session';
import type { UiText } from '@writehand/ui';
import { createApp, ref, type Ref } from 'vue';
import { createShadowRootUi, type ContentScriptContext } from '#imports';

import { OWN_UI_ATTRIBUTE } from '../bootstrap/mail-provider';
import PanelHost from './PanelHost.vue';

/**
 * These events are kept from leaving the shadow root so that Outlook's keyboard
 * shortcuts do not fire while typing in the panel.
 */
export const ISOLATED_EVENTS = [
  'keydown',
  'keyup',
  'keypress',
  'beforeinput',
  'input',
  'paste',
  'copy',
  'cut',
];

export interface MountedPanel {
  setOpen(open: boolean): void;
  /** On close, focus returns to the button that opened the panel when possible. */
  rememberOpener(element: HTMLElement | null): void;
  remove(): void;
}

export async function mountPanel(
  ctx: ContentScriptContext,
  options: {
    session: PanelSessionDependencies;
    text: Readonly<Ref<UiText>>;
    appearance: Readonly<Ref<Appearance>>;
  },
): Promise<MountedPanel> {
  const open = ref(false);
  let opener: HTMLElement | null = null;

  const ui = await createShadowRootUi(ctx, {
    name: 'writehand-panel',
    position: 'inline',
    anchor: 'body',
    append: 'last',
    isolateEvents: ISOLATED_EVENTS,
    onMount(container, _shadow, host) {
      host.setAttribute(OWN_UI_ATTRIBUTE, 'panel');
      const app = createApp(PanelHost, {
        session: options.session,
        text: options.text,
        appearance: options.appearance,
        open,
      });
      app.mount(container);
      return app;
    },
    onRemove(app) {
      app?.unmount();
    },
  });
  ui.mount();

  return {
    setOpen(value) {
      open.value = value;
      if (!value && opener?.isConnected) {
        opener.focus({ preventScroll: true });
      }
    },
    rememberOpener(element) {
      opener = element;
    },
    remove() {
      ui.remove();
    },
  };
}
