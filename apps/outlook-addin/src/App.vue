<script setup lang="ts">
import {
  DEFAULT_SETTINGS,
  PRODUCT_NAME,
  type AiStatus,
  type Settings,
  type SettingsChanges,
} from '@writehand/contracts';
import { addinTextFor, uiLanguageFor } from '@writehand/locales';
import { resolveAppearance } from '@writehand/session';
import { provideUiText } from '@writehand/ui';
import { computed, onMounted, onUnmounted, ref, shallowRef, watchEffect } from 'vue';

import { createAddinSession, type AddinSession } from './bootstrap/create-addin-session';
import type { OfficeHost } from './platform/office-host';
import FirstRunView from './views/FirstRunView.vue';
import PanelView from './views/PanelView.vue';
import SettingsView from './views/SettingsView.vue';

/**
 * The task pane: the first run until a key is connected, then the panel, with the settings one
 * click away. `host` is null when the page is opened outside Outlook.
 */
const props = defineProps<{ host: OfficeHost | null }>();
const session = shallowRef<AddinSession | null>(null);
const view = ref<'loading' | 'first-run' | 'panel' | 'settings'>('loading');
/** The panel is created once and kept while the settings are open, so its work is not lost. */
const panelStarted = ref(false);
const aiStatus = shallowRef<AiStatus | null>(null);
/** Unsaved changes in the settings view; the interface language and theme follow them at once. */
const draft = shallowRef<SettingsChanges>({});
const pageTheme = shallowRef(props.host?.theme() ?? null);

const settings = computed<Settings>(() => ({
  ...(session.value?.settings.value ?? DEFAULT_SETTINGS),
  ...draft.value,
}));
const languages = computed(() => [
  ...(props.host?.displayLanguage ? [props.host.displayLanguage] : []),
  ...navigator.languages,
]);
const text = computed(() => addinTextFor(settings.value.uiLanguage, languages.value));
provideUiText(computed(() => text.value.ui));
const appearance = computed(() => resolveAppearance(settings.value.theme, pageTheme.value, 'fluent'));

watchEffect(() => {
  document.documentElement.lang = uiLanguageFor(settings.value.uiLanguage, languages.value);
  document.title = PRODUCT_NAME;
});

async function refreshStatus(): Promise<void> {
  if (session.value !== null) aiStatus.value = await session.value.ai.status();
}

function showPanel(): void {
  view.value = 'panel';
  if (!panelStarted.value) {
    panelStarted.value = true;
    session.value?.openForCurrentItem();
  }
  void refreshStatus();
}

let stopTheme: () => void = () => undefined;
onMounted(async () => {
  const { host } = props;
  if (host === null) return;
  stopTheme = host.onThemeChanged(() => (pageTheme.value = host.theme()));
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(text.value.ui.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    );
  session.value = await createAddinSession(host, formatDate);
  await refreshStatus();
  if (aiStatus.value?.ready === true) showPanel();
  else view.value = 'first-run';
});

onUnmounted(() => {
  stopTheme();
  session.value?.dispose();
});
</script>

<template>
  <div
    class="ew-root ew-addin"
    :class="{ 'ew-page': view !== 'panel' }"
    :data-theme="appearance.theme"
    :data-skin="appearance.skin"
    :style="appearance.style"
  >
    <p v-if="host === null" class="ew-addin__notice">{{ text.addin.pane.outsideOutlook }}</p>
    <p v-else-if="session === null || view === 'loading'" class="ew-addin__notice" role="status">
      {{ text.addin.pane.loading }}
    </p>
    <template v-else>
      <FirstRunView v-if="view === 'first-run'" :ai="session.ai" :text="text" @done="showPanel" />
      <SettingsView
        v-else-if="view === 'settings'"
        :ai="session.ai"
        :text="text"
        :settings="session.settings.value"
        :save="session.saveSettings"
        @back="showPanel"
        @draft="draft = $event"
      />
      <PanelView
        v-if="panelStarted"
        v-show="view === 'panel'"
        :session="session.panel"
        :status="aiStatus"
        :no-item-text="text.addin.pane.noItem"
        :settings-label="text.addin.pane.settings"
        @open-settings="view = 'settings'"
      />
    </template>
  </div>
</template>
