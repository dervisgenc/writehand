<script setup lang="ts">
import {
  DEFAULT_SETTINGS,
  SITE_IDS,
  type ErrorCode,
  type Settings,
  type SettingsChanges,
  type SiteId,
} from '@writehand/contracts';
import { textFor, uiLanguageFor } from '@writehand/locales';
import { parseStoredSettings, SETTINGS_STORAGE_KEY } from '@writehand/session';
import { AppIcon, ExtensionPage, provideUiText, SettingsForm } from '@writehand/ui';
import { computed, onMounted, onUnmounted, ref, shallowRef, useId, watchEffect } from 'vue';

import { brandIconUrl, onSettingsStorageChanged } from '../../src/platform/extension-browser';
import { fetchSettings, patchSettings } from '../../src/platform/extension-client';
import AiSettings from '../../src/pages/AiSettings.vue';
import HelperSettings from '../../src/pages/HelperSettings.vue';

const settings = shallowRef<Settings>(DEFAULT_SETTINGS);
const draft = ref<SettingsChanges>({});
const saving = ref(false);
const message = ref<{ kind: 'success' | 'info' | 'error'; text: string } | null>(null);
const ids = { privacy: useId() };

const current = computed<Settings>(() => ({ ...settings.value, ...draft.value }));
const text = computed(() => textFor(current.value.uiLanguage));
provideUiText(computed(() => text.value.ui));
const errorText = (code: ErrorCode) => text.value.ui.errors[code];
const dirty = computed(() => Object.keys(draft.value).length > 0);

// Keep the page language in sync with the UI language for screen readers and correct case conversion.
watchEffect(() => {
  document.documentElement.lang = uiLanguageFor(current.value.uiLanguage);
  document.title = text.value.options.title;
});

let stopWatching: (() => void) | null = null;

onMounted(async () => {
  const result = await fetchSettings();
  if (result.ok) {
    settings.value = result.value.settings;
  } else {
    message.value = { kind: 'error', text: errorText(result.error.code) };
  }
  // Changes made on another screen are reflected here.
  stopWatching = onSettingsStorageChanged(SETTINGS_STORAGE_KEY, (raw) => {
    settings.value = parseStoredSettings(raw).settings;
  });
});
onUnmounted(() => stopWatching?.());

function change(changes: SettingsChanges): void {
  draft.value = { ...draft.value, ...changes };
  message.value = null;
}

function checkedValue(event: Event): boolean {
  const target = event.target;
  return target !== null && 'checked' in target && target.checked === true;
}

function setSiteEnabled(site: SiteId, enabled: boolean): void {
  change({ siteEnabled: { ...current.value.siteEnabled, [site]: enabled } });
}

function discard(): void {
  draft.value = {};
  message.value = null;
}

/** Switches on the cards (update check) bypass the draft and are saved immediately. */
async function saveNow(changes: SettingsChanges): Promise<void> {
  const result = await patchSettings(settings.value.revision, changes);
  if (result.ok) settings.value = result.value.settings;
  else message.value = { kind: 'error', text: errorText(result.error.code) };
}

async function save(): Promise<void> {
  saving.value = true;
  // Only the changed fields and the known revision are sent.
  const result = await patchSettings(settings.value.revision, draft.value);
  saving.value = false;
  if (!result.ok) {
    message.value = { kind: 'error', text: errorText(result.error.code) };
    return;
  }
  settings.value = result.value.settings;
  draft.value = {};
  message.value =
    result.value.status === 'saved'
      ? { kind: 'success', text: text.value.options.saved }
      : {
          kind: 'info',
          text: errorText(result.value.status === 'conflict' ? 'SETTINGS_CONFLICT' : 'SETTINGS_INVALID'),
        };
}
</script>

<template>
  <ExtensionPage
    :theme="current.theme"
    :title="text.options.title"
    :subtitle="text.options.subtitle"
    :logo="brandIconUrl()"
  >
    <AiSettings :text="text.ui" />

    <!-- Needed only for the ChatGPT and Claude plans, so it follows the connection card. -->
    <HelperSettings
      :text="text.ui"
      :check-updates="settings.checkHelperUpdates"
      @toggle-updates="saveNow({ checkHelperUpdates: $event })"
    />

    <form class="options__form" @submit.prevent="save">
      <SettingsForm :settings="current" :text="text.options" @change="change">
        <template #preferences>
          <label v-for="site in SITE_IDS" :key="site" class="ew-switch-row" :data-site="site">
            <span class="ew-switch-row__text">
              <span class="ew-switch-row__label">{{
                text.options.siteEnabled(text.options.siteNames[site])
              }}</span>
              <span class="ew-muted">{{ text.options.siteEnabledHint(text.options.siteNames[site]) }}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              class="ew-switch"
              :checked="current.siteEnabled[site]"
              @change="setSiteEnabled(site, checkedValue($event))"
            />
          </label>
        </template>
      </SettingsForm>

      <div v-if="dirty || message" class="options__savebar" :data-kind="message?.kind ?? 'info'">
        <p class="options__message" :data-kind="message?.kind ?? 'info'" role="status">
          {{ message ? message.text : text.options.unsaved }}
        </p>
        <button v-if="dirty" type="button" class="ew-btn ew-btn--subtle" :disabled="saving" @click="discard">
          {{ text.ui.source.cancel }}
        </button>
        <button v-if="dirty" type="submit" class="ew-btn ew-btn--primary" :disabled="saving">
          {{ saving ? text.options.saving : text.options.save }}
        </button>
      </div>
    </form>

    <section class="ew-settings-card" :aria-labelledby="ids.privacy">
      <header class="ew-settings-card__header">
        <span class="ew-settings-card__icon"><AppIcon name="shield" :size="18" /></span>
        <div class="ew-settings-card__heading">
          <h2 :id="ids.privacy" class="ew-settings-card__title">{{ text.options.privacyTitle }}</h2>
          <p class="ew-settings-card__description">{{ text.options.privacyDescription }}</p>
        </div>
      </header>
      <ul class="ew-points">
        <li v-for="(point, index) in text.options.privacyPoints" :key="index">
          <AppIcon name="check" :size="16" />
          <span>{{ point }}</span>
        </li>
      </ul>
    </section>
  </ExtensionPage>
</template>

<style>
.options__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Save bar that sticks to the bottom of the page while there are unsaved changes. */
.options__savebar {
  position: sticky;
  bottom: 16px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 10px 16px;
  border: 1px solid var(--ew-color-border);
  border-radius: 12px;
  background: var(--ew-color-bg);
  box-shadow: var(--ew-shadow-16);
  animation: ew-rise var(--ew-duration) var(--ew-ease);
}

.options__message {
  margin: 0 auto 0 0;
  font-size: 13px;
}

.options__message[data-kind='info'] {
  color: var(--ew-color-muted);
}

.options__message[data-kind='error'] {
  color: var(--ew-color-danger);
}

.options__message[data-kind='success'] {
  color: var(--ew-color-success);
}
</style>
