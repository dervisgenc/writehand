<script setup lang="ts">
import {
  DEFAULT_SETTINGS,
  MAX_FAVORITE_LANGUAGES,
  MAX_WRITING_INSTRUCTIONS,
  SITE_IDS,
  THEMES,
  TONES,
  UI_LANGUAGE_NAMES,
  UI_LANGUAGE_PREFERENCES,
  type ErrorCode,
  type Settings,
  type SettingsChanges,
  type SiteId,
  type TargetLanguage,
} from '@writehand/contracts';
import { textFor, uiLanguageFor } from '@writehand/locales';
import { parseStoredSettings, SETTINGS_STORAGE_KEY } from '@writehand/session';
import { AppIcon, ExtensionPage, LanguagePicker, languageLabel, provideUiText } from '@writehand/ui';
import { computed, onMounted, onUnmounted, ref, shallowRef, useId, watchEffect } from 'vue';

import { brandIconUrl, onSettingsStorageChanged } from '../../src/platform/extension-browser';
import { fetchSettings, patchSettings } from '../../src/platform/extension-client';
import AiSettings from '../../src/pages/AiSettings.vue';
import HelperSettings from '../../src/pages/HelperSettings.vue';

const settings = shallowRef<Settings>(DEFAULT_SETTINGS);
const draft = ref<SettingsChanges>({});
const saving = ref(false);
const message = ref<{ kind: 'success' | 'info' | 'error'; text: string } | null>(null);
const ids = {
  ui: useId(),
  language: useId(),
  favorites: useId(),
  addLanguage: useId(),
  instructions: useId(),
  instructionsHint: useId(),
  tone: useId(),
  theme: useId(),
  languages: useId(),
  writing: useId(),
  preferences: useId(),
  privacy: useId(),
};

const current = computed<Settings>(() => ({ ...settings.value, ...draft.value }));
const text = computed(() => textFor(current.value.uiLanguage));
const locale = computed(() => text.value.ui.locale);
provideUiText(computed(() => text.value.ui));
const errorText = (code: ErrorCode) => text.value.ui.errors[code];
const dirty = computed(() => Object.keys(draft.value).length > 0);
const addPicker = ref<InstanceType<typeof LanguagePicker> | null>(null);

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

function change<K extends keyof SettingsChanges>(key: K, value: SettingsChanges[K]): void {
  draft.value = { ...draft.value, [key]: value };
  message.value = null;
}

function selectValue<T extends string>(event: Event, allowed: readonly T[]): T | undefined {
  const target = event.target;
  const value = target !== null && 'value' in target ? target.value : undefined;
  return allowed.find((item) => item === value);
}

function checkedValue(event: Event): boolean {
  const target = event.target;
  return target !== null && 'checked' in target && target.checked === true;
}

const label = (language: TargetLanguage) => languageLabel(language, locale.value);
const favoritesFull = computed(() => current.value.favoriteLanguages.length >= MAX_FAVORITE_LANGUAGES);

function addFavorite(language: TargetLanguage): void {
  const favorites = current.value.favoriteLanguages;
  if (favorites.includes(language) || favorites.length >= MAX_FAVORITE_LANGUAGES) return;
  change('favoriteLanguages', [...favorites, language]);
}

function removeFavorite(language: TargetLanguage): void {
  change(
    'favoriteLanguages',
    current.value.favoriteLanguages.filter((item) => item !== language),
  );
}

function setSiteEnabled(site: SiteId, enabled: boolean): void {
  change('siteEnabled', { ...current.value.siteEnabled, [site]: enabled });
}

function setInstructions(value: string): void {
  change('writingInstructions', value.slice(0, MAX_WRITING_INSTRUCTIONS));
}

/** Appends the example sentence to the instructions as a new line, unless it is already there. */
function addExample(example: string): void {
  const value = current.value.writingInstructions;
  if (value.includes(example)) return;
  setInstructions(value.trim() === '' ? example : `${value.trimEnd()}\n${example}`);
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
      <section class="ew-settings-card" :aria-labelledby="ids.languages">
        <header class="ew-settings-card__header">
          <span class="ew-settings-card__icon"><AppIcon name="translate" :size="18" /></span>
          <div class="ew-settings-card__heading">
            <h2 :id="ids.languages" class="ew-settings-card__title">{{ text.options.languagesTitle }}</h2>
            <p class="ew-settings-card__description">{{ text.options.languagesDescription }}</p>
          </div>
        </header>
        <div class="options__grid">
          <div class="options__field">
            <label class="ew-label" :for="ids.ui">{{ text.options.uiLanguage }}</label>
            <select
              :id="ids.ui"
              class="ew-select"
              :value="current.uiLanguage"
              @change="change('uiLanguage', selectValue($event, UI_LANGUAGE_PREFERENCES))"
            >
              <option v-for="code in UI_LANGUAGE_PREFERENCES" :key="code" :value="code">
                {{ code === 'auto' ? text.options.uiLanguageAuto : UI_LANGUAGE_NAMES[code] }}
              </option>
            </select>
          </div>
          <div class="options__field">
            <label class="ew-label" :for="ids.language">{{ text.options.targetLanguage }}</label>
            <LanguagePicker
              :id="ids.language"
              :model-value="current.targetLanguage"
              :preferred="current.favoriteLanguages"
              @update:model-value="change('targetLanguage', $event)"
            />
          </div>
        </div>
        <p class="ew-muted">{{ text.options.targetLanguageHint }}</p>
        <div class="options__field">
          <span :id="ids.favorites" class="ew-label">{{ text.options.favoriteLanguages }}</span>
          <ul class="options__chips" :aria-labelledby="ids.favorites">
            <li v-for="language in current.favoriteLanguages" :key="language" class="options__chip">
              <span>{{ label(language) }}</span>
              <button
                type="button"
                class="options__chip-remove"
                :aria-label="text.options.removeLanguage(label(language))"
                :title="text.options.removeLanguage(label(language))"
                @click="removeFavorite(language)"
              >
                <AppIcon name="close" :size="12" />
              </button>
            </li>
          </ul>
          <div class="options__add">
            <label class="ew-visually-hidden" :for="ids.addLanguage">{{ text.options.addLanguage }}</label>
            <LanguagePicker
              :id="ids.addLanguage"
              ref="addPicker"
              :model-value="null"
              :exclude="current.favoriteLanguages"
              :disabled="favoritesFull"
              clear-on-commit
              @update:model-value="addFavorite"
            />
            <button type="button" class="ew-btn" :disabled="favoritesFull" @click="addPicker?.commit()">
              <AppIcon name="plus" :size="14" />
              {{ text.options.addLanguage }}
            </button>
          </div>
          <p class="ew-muted">
            {{ favoritesFull ? text.options.favoritesFull : text.options.favoriteLanguagesHint }}
          </p>
        </div>
      </section>

      <section class="ew-settings-card" :aria-labelledby="ids.writing">
        <header class="ew-settings-card__header">
          <span class="ew-settings-card__icon"><AppIcon name="edit" :size="18" /></span>
          <div class="ew-settings-card__heading">
            <h2 :id="ids.writing" class="ew-settings-card__title">{{ text.options.instructionsTitle }}</h2>
            <p class="ew-settings-card__description">{{ text.options.instructionsDescription }}</p>
          </div>
        </header>
        <div class="options__field">
          <div class="options__label-row">
            <label class="ew-label" :for="ids.instructions">{{ text.options.instructionsLabel }}</label>
            <span class="ew-muted">
              {{
                text.options.instructionsCount(current.writingInstructions.length, MAX_WRITING_INSTRUCTIONS)
              }}
            </span>
          </div>
          <textarea
            :id="ids.instructions"
            class="ew-textarea options__instructions"
            rows="4"
            dir="auto"
            :maxlength="MAX_WRITING_INSTRUCTIONS"
            :placeholder="text.options.instructionsPlaceholder"
            :aria-describedby="ids.instructionsHint"
            :value="current.writingInstructions"
            @input="setInstructions(($event.target as HTMLTextAreaElement).value)"
          />
          <div :id="ids.instructionsHint" class="options__examples">
            <span class="ew-muted">{{ text.options.instructionsExamplesLabel }}</span>
            <button
              v-for="example in text.options.instructionsExamples"
              :key="example"
              type="button"
              class="ew-chip"
              :disabled="current.writingInstructions.includes(example)"
              @click="addExample(example)"
            >
              <AppIcon name="plus" :size="12" />
              {{ example }}
            </button>
          </div>
        </div>
      </section>

      <section class="ew-settings-card" :aria-labelledby="ids.preferences">
        <header class="ew-settings-card__header">
          <span class="ew-settings-card__icon"><AppIcon name="sliders" :size="18" /></span>
          <div class="ew-settings-card__heading">
            <h2 :id="ids.preferences" class="ew-settings-card__title">
              {{ text.options.preferencesTitle }}
            </h2>
            <p class="ew-settings-card__description">{{ text.options.preferencesDescription }}</p>
          </div>
        </header>
        <div class="options__grid">
          <div class="options__field">
            <label class="ew-label" :for="ids.tone">{{ text.options.tone }}</label>
            <select
              :id="ids.tone"
              class="ew-select"
              :value="current.tone"
              @change="change('tone', selectValue($event, TONES))"
            >
              <option v-for="tone in TONES" :key="tone" :value="tone">
                {{ text.ui.options.tones[tone] }}
              </option>
            </select>
          </div>
          <div class="options__field">
            <span :id="ids.theme" class="ew-label">{{ text.options.theme }}</span>
            <div class="ew-segmented" role="radiogroup" :aria-labelledby="ids.theme">
              <label
                v-for="theme in THEMES"
                :key="theme"
                class="ew-segmented__option"
                :data-checked="current.theme === theme"
              >
                <input
                  type="radio"
                  class="ew-visually-hidden"
                  :name="ids.theme"
                  :value="theme"
                  :checked="current.theme === theme"
                  @change="change('theme', theme)"
                />
                {{ text.options.themeOptions[theme] }}
              </label>
            </div>
          </div>
        </div>
        <p class="ew-muted">{{ text.options.defaultsNote }} {{ text.options.themeHint }}</p>
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
      </section>

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
.options__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 16px;
}

.options__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.options__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.options__label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.options__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.options__chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 28px;
  padding: 0 4px 0 10px;
  border: 1px solid var(--ew-color-border);
  border-radius: 999px;
  background: var(--ew-color-surface);
  font-size: 13px;
}

.options__chip-remove {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ew-color-muted);
}

.options__chip-remove:hover {
  background: var(--ew-color-surface-hover);
  color: var(--ew-color-text);
}

.options__add {
  display: flex;
  gap: 8px;
  max-width: 420px;
}

.options__instructions {
  min-height: 96px;
  resize: vertical;
}

.options__examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.options__examples .ew-chip {
  white-space: normal;
  text-align: left;
}

.options__examples .ew-chip:disabled {
  opacity: 0.5;
  cursor: default;
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
