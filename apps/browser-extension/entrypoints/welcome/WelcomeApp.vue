<script setup lang="ts">
import { DEFAULT_SETTINGS, REPOSITORY_URL, type Settings } from '@writehand/contracts';
import { textFor, uiLanguageFor } from '@writehand/locales';
import { parseStoredSettings, SETTINGS_STORAGE_KEY } from '@writehand/session';
import { AppIcon, ExtensionPage, provideUiText, StepList } from '@writehand/ui';
import { computed, onMounted, onUnmounted, ref, shallowRef, useId, watch, watchEffect } from 'vue';

import { GMAIL_WEB_START, OUTLOOK_WEB_START } from '../../src/bootstrap/supported-sites';
import AiSettings from '../../src/pages/AiSettings.vue';
import HelperInstall from '../../src/pages/HelperInstall.vue';
import {
  brandIconUrl,
  onSettingsStorageChanged,
  openOptionsPage,
} from '../../src/platform/extension-browser';
import { fetchSettings, generateText } from '../../src/platform/extension-client';

/**
 * Welcome wizard: the two ways to connect, setting up the chosen method (with the helper app's
 * one-command install when the method needs it) and a trial run on a made-up email. Opens on
 * first install; can be reopened from settings.
 */
const settings = shallowRef<Settings>(DEFAULT_SETTINGS);
const text = computed(() => textFor(settings.value.uiLanguage));
const welcome = computed(() => text.value.welcome);
provideUiText(computed(() => text.value.ui));
const ids = { intro: useId(), tryIt: useId() };
const LAST_STEP = 2;

const step = ref(0);
const furthest = ref(0);
watch(step, (value) => (furthest.value = Math.max(furthest.value, value)));
const aiReady = ref(false);
const trial = ref<
  | { readonly state: 'idle' | 'running' }
  | { readonly state: 'done'; readonly result: string }
  | { readonly state: 'failed'; readonly error: string }
>({ state: 'idle' });

const done = computed(() =>
  [furthest.value > 0, aiReady.value, trial.value.state === 'done'].flatMap((complete, index) =>
    complete ? [index] : [],
  ),
);

watchEffect(() => {
  document.documentElement.lang = uiLanguageFor(settings.value.uiLanguage);
  document.title = welcome.value.title;
});

let stopWatching: (() => void) | null = null;
onMounted(async () => {
  const result = await fetchSettings();
  if (result.ok) settings.value = result.value.settings;
  stopWatching = onSettingsStorageChanged(SETTINGS_STORAGE_KEY, (raw) => {
    settings.value = parseStoredSettings(raw).settings;
  });
});
onUnmounted(() => stopWatching?.());

async function tryRevision() {
  trial.value = { state: 'running' };
  const result = await generateText({
    operation: 'revise',
    source: welcome.value.tryIt.sample,
    instruction: '',
    targetLanguage: null,
    tone: 'neutral',
    standingInstructions: '',
    format: 'plain',
    refinement: null,
    messages: [],
  });
  trial.value = result.ok
    ? { state: 'done', result: result.value.text }
    : { state: 'failed', error: text.value.ui.errors[result.error.code] };
}
</script>

<template>
  <ExtensionPage
    :theme="settings.theme"
    :title="welcome.title"
    :subtitle="welcome.subtitle"
    :logo="brandIconUrl()"
  >
    <StepList
      :label="welcome.stepsLabel"
      :steps="welcome.steps"
      :current="step"
      :furthest="furthest"
      :done="done"
      @select="step = $event"
    />

    <section v-if="step === 0" class="ew-settings-card" :aria-labelledby="ids.intro">
      <header class="ew-settings-card__header">
        <span class="ew-settings-card__icon"><AppIcon name="sparkle" :size="18" /></span>
        <div class="ew-settings-card__heading">
          <h2 :id="ids.intro" class="ew-settings-card__title">{{ welcome.intro.title }}</h2>
          <p class="ew-settings-card__description">{{ welcome.intro.lead }}</p>
        </div>
      </header>
      <div class="ew-split">
        <div
          v-for="option in [welcome.intro.apiKey, welcome.intro.plan]"
          :key="option.title"
          class="ew-split__column"
        >
          <h3 class="ew-ai-guide__label">{{ option.title }}</h3>
          <ul class="ew-points">
            <li v-for="point in option.points" :key="point">
              <AppIcon name="check" :size="16" />
              <span>{{ point }}</span>
            </li>
          </ul>
        </div>
      </div>
      <a class="ew-ai-guide__link" :href="REPOSITORY_URL" target="_blank" rel="noopener noreferrer">
        {{ welcome.intro.source }}
        <AppIcon name="external" :size="14" />
      </a>
      <div class="ew-split">
        <div class="ew-split__column">
          <h3 class="ew-ai-guide__label">{{ welcome.intro.doesTitle }}</h3>
          <ul class="ew-points">
            <li v-for="item in welcome.intro.does" :key="item">
              <AppIcon name="check" :size="16" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
        <div class="ew-split__column">
          <h3 class="ew-ai-guide__label">{{ welcome.intro.doesNotTitle }}</h3>
          <ul class="ew-points" data-kind="never">
            <li v-for="item in welcome.intro.doesNot" :key="item">
              <AppIcon name="close" :size="16" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <AiSettings v-else-if="step === 1" :text="text.ui" :guide="false" @ready="aiReady = $event">
      <template #helper><HelperInstall :text="text" /></template>
    </AiSettings>

    <section v-else class="ew-settings-card" :aria-labelledby="ids.tryIt">
      <header class="ew-settings-card__header">
        <span class="ew-settings-card__icon"><AppIcon name="proofread" :size="18" /></span>
        <div class="ew-settings-card__heading">
          <h2 :id="ids.tryIt" class="ew-settings-card__title">{{ welcome.tryIt.title }}</h2>
          <p class="ew-settings-card__description">{{ welcome.tryIt.lead }}</p>
        </div>
      </header>
      <div class="ew-ai-settings__field">
        <span class="ew-label">{{ welcome.tryIt.sampleLabel }}</span>
        <p class="ew-sample">{{ welcome.tryIt.sample }}</p>
      </div>
      <div class="ew-actions">
        <button
          type="button"
          class="ew-btn"
          :class="{ 'ew-btn--primary': trial.state !== 'done' }"
          :disabled="trial.state === 'running'"
          @click="tryRevision"
        >
          <span v-if="trial.state === 'running'" class="ew-spinner" aria-hidden="true" />
          <AppIcon v-else name="proofread" :size="16" />
          {{ trial.state === 'running' ? welcome.tryIt.running : welcome.tryIt.run }}
        </button>
      </div>
      <p v-if="trial.state === 'failed'" class="ew-alert ew-alert--error" role="alert">
        <AppIcon name="warning" :size="16" />
        <span>{{ trial.error }}</span>
      </p>
      <template v-if="trial.state === 'done'">
        <div class="ew-ai-settings__field">
          <span class="ew-label">{{ welcome.tryIt.resultLabel }}</span>
          <p class="ew-sample" data-kind="result">{{ trial.result }}</p>
        </div>
        <p class="ew-progress" data-tone="success" role="status">
          <AppIcon name="check" :size="16" />
          <span>{{ welcome.tryIt.success }}</span>
        </p>
        <div class="ew-actions">
          <a
            class="ew-btn ew-btn--primary"
            :href="OUTLOOK_WEB_START.work"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AppIcon name="mail" :size="16" />
            {{ welcome.tryIt.openOutlook }}
          </a>
          <a class="ew-btn" :href="OUTLOOK_WEB_START.personal" target="_blank" rel="noopener noreferrer">
            {{ welcome.tryIt.personalOutlook }}
          </a>
          <a class="ew-btn" :href="GMAIL_WEB_START" target="_blank" rel="noopener noreferrer">
            {{ welcome.tryIt.openGmail }}
          </a>
          <button type="button" class="ew-btn ew-btn--subtle" @click="openOptionsPage">
            {{ welcome.tryIt.openSettings }}
          </button>
        </div>
      </template>
    </section>

    <nav class="ew-wizard-nav">
      <button v-if="step > 0" type="button" class="ew-btn" @click="step--">
        {{ welcome.back }}
      </button>
      <button v-if="step < LAST_STEP" type="button" class="ew-btn ew-btn--primary" @click="step++">
        {{ welcome.next }}
      </button>
    </nav>
  </ExtensionPage>
</template>
