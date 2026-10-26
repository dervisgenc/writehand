<script setup lang="ts">
import type { AiService } from '@writehand/ai-connection';
import type { AiMode, Settings, SettingsChanges } from '@writehand/contracts';
import type { AddinText } from '@writehand/locales';
import type { PatchSettingsResult } from '@writehand/session';
import { AppIcon, SettingsForm } from '@writehand/ui';
import { computed, ref, useId } from 'vue';

import AiCard from '../components/AiCard.vue';

/** The AI connection, the shared settings form and what the add-in does with email, in this Outlook app. */
const props = defineProps<{
  ai: AiService;
  methods: readonly AiMode[];
  text: AddinText;
  settings: Settings;
  save: (changes: SettingsChanges) => Promise<PatchSettingsResult>;
}>();
const emit = defineEmits<{ back: []; draft: [changes: SettingsChanges] }>();
const ids = { privacy: useId() };
const draft = ref<SettingsChanges>({});
const saving = ref(false);
const message = ref<{ kind: 'success' | 'info' | 'error'; text: string } | null>(null);

const current = computed<Settings>(() => ({ ...props.settings, ...draft.value }));
const dirty = computed(() => Object.keys(draft.value).length > 0);
const options = computed(() => props.text.options);

function change(changes: SettingsChanges): void {
  draft.value = { ...draft.value, ...changes };
  message.value = null;
  // The interface language and theme show at once, before saving.
  emit('draft', draft.value);
}

function discard(): void {
  draft.value = {};
  message.value = null;
  emit('draft', {});
}

async function submit(): Promise<void> {
  saving.value = true;
  const result = await props.save(draft.value);
  saving.value = false;
  draft.value = {};
  emit('draft', {});
  message.value =
    result.status === 'saved'
      ? { kind: 'success', text: options.value.saved }
      : {
          kind: 'info',
          text: props.text.ui.errors[result.status === 'conflict' ? 'SETTINGS_CONFLICT' : 'SETTINGS_INVALID'],
        };
}
</script>

<template>
  <main class="ew-page__main ew-addin-page">
    <header class="ew-page__header ew-addin-page__header">
      <button type="button" class="ew-btn ew-btn--subtle" @click="emit('back')">
        <AppIcon name="back" :size="16" />
        {{ text.addin.pane.back }}
      </button>
      <h1 class="ew-page__title">{{ text.addin.pane.settings }}</h1>
    </header>

    <AiCard :ai="ai" :methods="methods" :helper-unavailable="text.addin.pane.helperUnavailable" />

    <form class="ew-addin-settings" @submit.prevent="submit">
      <SettingsForm :settings="current" :text="options" @change="change" />
      <div v-if="dirty || message" class="ew-addin-savebar" :data-kind="message?.kind ?? 'info'">
        <p class="ew-addin-savebar__message" :data-kind="message?.kind ?? 'info'" role="status">
          {{ message ? message.text : options.unsaved }}
        </p>
        <button v-if="dirty" type="button" class="ew-btn ew-btn--subtle" :disabled="saving" @click="discard">
          {{ text.ui.source.cancel }}
        </button>
        <button v-if="dirty" type="submit" class="ew-btn ew-btn--primary" :disabled="saving">
          {{ saving ? options.saving : options.save }}
        </button>
      </div>
    </form>

    <section class="ew-settings-card" :aria-labelledby="ids.privacy">
      <header class="ew-settings-card__header">
        <span class="ew-settings-card__icon"><AppIcon name="shield" :size="18" /></span>
        <div class="ew-settings-card__heading">
          <h2 :id="ids.privacy" class="ew-settings-card__title">{{ options.privacyTitle }}</h2>
          <p class="ew-settings-card__description">{{ options.privacyDescription }}</p>
        </div>
      </header>
      <ul class="ew-points">
        <li v-for="(point, index) in text.addin.privacyPoints" :key="index">
          <AppIcon name="check" :size="16" />
          <span>{{ point }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>
