<script setup lang="ts">
import {
  MAX_FAVORITE_LANGUAGES,
  MAX_WRITING_INSTRUCTIONS,
  THEMES,
  TONES,
  UI_LANGUAGE_NAMES,
  UI_LANGUAGE_PREFERENCES,
  type Settings,
  type SettingsChanges,
  type TargetLanguage,
} from '@writehand/contracts';
import { computed, ref, useId } from 'vue';

import { useUiText } from '../i18n';
import { languageLabel } from '../languages';
import type { SettingsFormText } from '../settings-text';
import AppIcon from './AppIcon.vue';
import LanguagePicker from './LanguagePicker.vue';

/**
 * The settings both apps share: interface and translation languages, standing writing
 * instructions, tone and theme. It shows `settings` and emits each change; saving is the
 * caller's job. The `preferences` slot adds rows to the last card (the extension's per-site
 * switches).
 */
const props = defineProps<{ settings: Settings; text: SettingsFormText }>();
const emit = defineEmits<{ change: [changes: SettingsChanges] }>();

const ui = useUiText();
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
};
const addPicker = ref<InstanceType<typeof LanguagePicker> | null>(null);

const label = (language: TargetLanguage) => languageLabel(language, ui.value.locale);
const favoritesFull = computed(() => props.settings.favoriteLanguages.length >= MAX_FAVORITE_LANGUAGES);

function selectValue<T extends string>(event: Event, allowed: readonly T[]): T | undefined {
  const target = event.target;
  const value = target !== null && 'value' in target ? target.value : undefined;
  return allowed.find((item) => item === value);
}

function changeSelect<K extends 'uiLanguage' | 'tone'>(
  key: K,
  event: Event,
  allowed: readonly NonNullable<SettingsChanges[K]>[],
): void {
  const value = selectValue(event, allowed);
  if (value !== undefined) emit('change', { [key]: value });
}

function addFavorite(language: TargetLanguage): void {
  const favorites = props.settings.favoriteLanguages;
  if (favorites.includes(language) || favorites.length >= MAX_FAVORITE_LANGUAGES) return;
  emit('change', { favoriteLanguages: [...favorites, language] });
}

function removeFavorite(language: TargetLanguage): void {
  emit('change', { favoriteLanguages: props.settings.favoriteLanguages.filter((item) => item !== language) });
}

function setInstructions(value: string): void {
  emit('change', { writingInstructions: value.slice(0, MAX_WRITING_INSTRUCTIONS) });
}

/** Appends the example sentence to the instructions as a new line, unless it is already there. */
function addExample(example: string): void {
  const value = props.settings.writingInstructions;
  if (value.includes(example)) return;
  setInstructions(value.trim() === '' ? example : `${value.trimEnd()}\n${example}`);
}
</script>

<template>
  <section class="ew-settings-card" :aria-labelledby="ids.languages">
    <header class="ew-settings-card__header">
      <span class="ew-settings-card__icon"><AppIcon name="translate" :size="18" /></span>
      <div class="ew-settings-card__heading">
        <h2 :id="ids.languages" class="ew-settings-card__title">{{ text.languagesTitle }}</h2>
        <p class="ew-settings-card__description">{{ text.languagesDescription }}</p>
      </div>
    </header>
    <div class="ew-settings-form__grid">
      <div class="ew-settings-form__field">
        <label class="ew-label" :for="ids.ui">{{ text.uiLanguage }}</label>
        <select
          :id="ids.ui"
          class="ew-select"
          :value="settings.uiLanguage"
          @change="changeSelect('uiLanguage', $event, UI_LANGUAGE_PREFERENCES)"
        >
          <option v-for="code in UI_LANGUAGE_PREFERENCES" :key="code" :value="code">
            {{ code === 'auto' ? text.uiLanguageAuto : UI_LANGUAGE_NAMES[code] }}
          </option>
        </select>
      </div>
      <div class="ew-settings-form__field">
        <label class="ew-label" :for="ids.language">{{ text.targetLanguage }}</label>
        <LanguagePicker
          :id="ids.language"
          :model-value="settings.targetLanguage"
          :preferred="settings.favoriteLanguages"
          @update:model-value="emit('change', { targetLanguage: $event })"
        />
      </div>
    </div>
    <p class="ew-muted">{{ text.targetLanguageHint }}</p>
    <div class="ew-settings-form__field">
      <span :id="ids.favorites" class="ew-label">{{ text.favoriteLanguages }}</span>
      <ul class="ew-settings-form__chips" :aria-labelledby="ids.favorites">
        <li v-for="language in settings.favoriteLanguages" :key="language" class="ew-settings-form__chip">
          <span>{{ label(language) }}</span>
          <button
            type="button"
            class="ew-settings-form__chip-remove"
            :aria-label="text.removeLanguage(label(language))"
            :title="text.removeLanguage(label(language))"
            @click="removeFavorite(language)"
          >
            <AppIcon name="close" :size="12" />
          </button>
        </li>
      </ul>
      <div class="ew-settings-form__add">
        <label class="ew-visually-hidden" :for="ids.addLanguage">{{ text.addLanguage }}</label>
        <LanguagePicker
          :id="ids.addLanguage"
          ref="addPicker"
          :model-value="null"
          :exclude="settings.favoriteLanguages"
          :disabled="favoritesFull"
          clear-on-commit
          @update:model-value="addFavorite"
        />
        <button type="button" class="ew-btn" :disabled="favoritesFull" @click="addPicker?.commit()">
          <AppIcon name="plus" :size="14" />
          {{ text.addLanguage }}
        </button>
      </div>
      <p class="ew-muted">{{ favoritesFull ? text.favoritesFull : text.favoriteLanguagesHint }}</p>
    </div>
  </section>

  <section class="ew-settings-card" :aria-labelledby="ids.writing">
    <header class="ew-settings-card__header">
      <span class="ew-settings-card__icon"><AppIcon name="edit" :size="18" /></span>
      <div class="ew-settings-card__heading">
        <h2 :id="ids.writing" class="ew-settings-card__title">{{ text.instructionsTitle }}</h2>
        <p class="ew-settings-card__description">{{ text.instructionsDescription }}</p>
      </div>
    </header>
    <div class="ew-settings-form__field">
      <div class="ew-settings-form__label-row">
        <label class="ew-label" :for="ids.instructions">{{ text.instructionsLabel }}</label>
        <span class="ew-muted">
          {{ text.instructionsCount(settings.writingInstructions.length, MAX_WRITING_INSTRUCTIONS) }}
        </span>
      </div>
      <textarea
        :id="ids.instructions"
        class="ew-textarea ew-settings-form__instructions"
        rows="4"
        dir="auto"
        :maxlength="MAX_WRITING_INSTRUCTIONS"
        :placeholder="text.instructionsPlaceholder"
        :aria-describedby="ids.instructionsHint"
        :value="settings.writingInstructions"
        @input="setInstructions(($event.target as HTMLTextAreaElement).value)"
      />
      <div :id="ids.instructionsHint" class="ew-settings-form__examples">
        <span class="ew-muted">{{ text.instructionsExamplesLabel }}</span>
        <button
          v-for="example in text.instructionsExamples"
          :key="example"
          type="button"
          class="ew-chip"
          :disabled="settings.writingInstructions.includes(example)"
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
        <h2 :id="ids.preferences" class="ew-settings-card__title">{{ text.preferencesTitle }}</h2>
        <p class="ew-settings-card__description">{{ text.preferencesDescription }}</p>
      </div>
    </header>
    <div class="ew-settings-form__grid">
      <div class="ew-settings-form__field">
        <label class="ew-label" :for="ids.tone">{{ text.tone }}</label>
        <select
          :id="ids.tone"
          class="ew-select"
          :value="settings.tone"
          @change="changeSelect('tone', $event, TONES)"
        >
          <option v-for="tone in TONES" :key="tone" :value="tone">{{ ui.options.tones[tone] }}</option>
        </select>
      </div>
      <div class="ew-settings-form__field">
        <span :id="ids.theme" class="ew-label">{{ text.theme }}</span>
        <div class="ew-segmented" role="radiogroup" :aria-labelledby="ids.theme">
          <label
            v-for="theme in THEMES"
            :key="theme"
            class="ew-segmented__option"
            :data-checked="settings.theme === theme"
          >
            <input
              type="radio"
              class="ew-visually-hidden"
              :name="ids.theme"
              :value="theme"
              :checked="settings.theme === theme"
              @change="emit('change', { theme })"
            />
            {{ text.themeOptions[theme] }}
          </label>
        </div>
      </div>
    </div>
    <p class="ew-muted">{{ text.defaultsNote }} {{ text.themeHint }}</p>
    <slot name="preferences" />
  </section>
</template>
