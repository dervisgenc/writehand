<script setup lang="ts">
import type { ApiKeyService } from '@writehand/ai-connection';
import type { AddinText } from '@writehand/locales';
import { AppIcon } from '@writehand/ui';
import { computed, ref, useId } from 'vue';

import AiCard from '../components/AiCard.vue';

/**
 * First run: connect a key, then revise a made-up email to check that everything works. The
 * sample goes only to the chosen provider; nothing is written to a draft or sent.
 */
const props = defineProps<{ ai: ApiKeyService; text: AddinText }>();
const emit = defineEmits<{ done: [] }>();
const ids = { title: useId(), tryIt: useId() };
const ready = ref(false);
const trial = ref<
  | { readonly state: 'idle' | 'running' }
  | { readonly state: 'done'; readonly result: string }
  | { readonly state: 'failed'; readonly error: string }
>({ state: 'idle' });
const tryIt = computed(() => props.text.tryIt);
/** The add-in's icon next to the page, wherever the pane is hosted. */
const logo = new URL('assets/icon-64.png', document.baseURI).href;

async function tryRevision() {
  trial.value = { state: 'running' };
  const result = await props.ai.generate({
    operation: 'revise',
    source: tryIt.value.sample,
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
    : { state: 'failed', error: props.text.ui.errors[result.error.code] };
}
</script>

<template>
  <main class="ew-page__main ew-addin-page">
    <header class="ew-page__header">
      <img class="ew-page__logo" :src="logo" alt="" width="40" height="40" />
      <div>
        <h1 :id="ids.title" class="ew-page__title">{{ text.addin.firstRun.title }}</h1>
        <p class="ew-page__subtitle">{{ text.addin.firstRun.lead }}</p>
      </div>
    </header>

    <AiCard :ai="ai" @ready="ready = $event" />

    <section v-if="ready" class="ew-settings-card" :aria-labelledby="ids.tryIt">
      <header class="ew-settings-card__header">
        <span class="ew-settings-card__icon"><AppIcon name="proofread" :size="18" /></span>
        <div class="ew-settings-card__heading">
          <h2 :id="ids.tryIt" class="ew-settings-card__title">{{ tryIt.title }}</h2>
          <p class="ew-settings-card__description">{{ tryIt.lead }}</p>
        </div>
      </header>
      <div class="ew-ai-settings__field">
        <span class="ew-label">{{ tryIt.sampleLabel }}</span>
        <p class="ew-sample">{{ tryIt.sample }}</p>
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
          {{ trial.state === 'running' ? tryIt.running : tryIt.run }}
        </button>
      </div>
      <p v-if="trial.state === 'failed'" class="ew-alert ew-alert--error" role="alert">
        <AppIcon name="warning" :size="16" />
        <span>{{ trial.error }}</span>
      </p>
      <template v-if="trial.state === 'done'">
        <div class="ew-ai-settings__field">
          <span class="ew-label">{{ tryIt.resultLabel }}</span>
          <p class="ew-sample" data-kind="result">{{ trial.result }}</p>
        </div>
        <p class="ew-progress" data-tone="success" role="status">
          <AppIcon name="check" :size="16" />
          <span>{{ text.addin.firstRun.success }}</span>
        </p>
      </template>
    </section>

    <nav class="ew-wizard-nav">
      <button type="button" class="ew-btn ew-btn--primary" :disabled="!ready" @click="emit('done')">
        {{ text.addin.firstRun.start }}
      </button>
    </nav>
  </main>
</template>
