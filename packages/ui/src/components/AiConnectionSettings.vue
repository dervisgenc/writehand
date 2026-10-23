<script setup lang="ts">
import {
  AI_MODES,
  API_PROVIDER_DETAILS,
  isHelperMode,
  type AiCommand,
  type AiMode,
  type AiStatus,
  type ApiProvider,
} from '@writehand/contracts';
import { computed, useId } from 'vue';

import type { AiText } from '../ai-text';
import ApiKeyConnection from './ApiKeyConnection.vue';
import AppIcon from './AppIcon.vue';
import ChatGptConnection from './ChatGptConnection.vue';
import ClaudeConnection from './ClaudeConnection.vue';
import type { IconName } from './icons';

/**
 * The AI connection card: the method choice and the chosen method's settings. The `helper`
 * slot replaces a helper app method's settings while the helper app is not connected.
 */
const props = withDefaults(
  defineProps<{
    status: AiStatus | null;
    text: AiText;
    error: string | null;
    busy: boolean;
    /** The methods this app offers; with only one, the method choice is not shown. */
    modes?: readonly AiMode[];
  }>(),
  { modes: () => AI_MODES },
);
const emit = defineEmits<{
  command: [command: AiCommand];
  refresh: [];
  'grant-access': [provider: ApiProvider];
}>();
const ids = { title: useId(), method: useId() };
const disabled = computed(() => props.busy || props.status?.helper?.signingIn === true);
const METHOD_ICONS: Record<AiMode, IconName> = {
  chatgpt: 'chat',
  'api-key': 'key',
  'claude-code': 'terminal',
};
const METHOD_BADGES: Partial<Record<AiMode, 'recommended' | 'experimental'>> = {
  chatgpt: 'recommended',
  'claude-code': 'experimental',
};
const methodTitle = (mode: AiMode) =>
  ({ chatgpt: props.text.chatgpt, 'api-key': props.text.apiKey, 'claude-code': props.text.claudeCode })[mode];
/** Short status at the top of the card: ready, needs setup, or needs a connection. */
const pill = computed<{ tone: 'success' | 'warning' | 'neutral'; label: string }>(() => {
  const status = props.status;
  if (status === null) {
    return props.busy
      ? { tone: 'neutral', label: props.text.checking }
      : { tone: 'warning', label: props.text.statusSetup };
  }
  if (status.ready) return { tone: 'success', label: props.text.statusReady };
  if (props.busy || status.helper?.signingIn) return { tone: 'neutral', label: props.text.checking };
  const helperMissing = isHelperMode(status.mode) && status.helper === null;
  if (helperMissing || (status.mode === 'claude-code' && status.helper?.claudeCode?.installed === false))
    return { tone: 'warning', label: props.text.statusSetup };
  return { tone: 'warning', label: props.text.statusAction };
});
const privacy = computed(() => {
  const status = props.status;
  if (status?.mode === 'claude-code') return props.text.claudePrivacy;
  if (status?.mode === 'api-key')
    return props.text.apiPrivacy(API_PROVIDER_DETAILS[status.apiKey.provider].name);
  return props.text.privacy;
});
function chooseMode(mode: AiMode) {
  if (props.status?.mode !== mode) emit('command', { action: 'set-mode', mode });
}
</script>

<template>
  <section class="ew-settings-card ew-ai-settings" :aria-labelledby="ids.title" :aria-busy="busy">
    <header class="ew-settings-card__header">
      <span class="ew-settings-card__icon"><AppIcon name="sparkle" :size="18" /></span>
      <div class="ew-settings-card__heading">
        <h2 :id="ids.title" class="ew-settings-card__title">{{ text.title }}</h2>
        <p class="ew-settings-card__description">{{ text.description }}</p>
      </div>
      <div class="ew-settings-card__aside">
        <span class="ew-status-pill" :data-tone="pill.tone" role="status">{{ pill.label }}</span>
        <button
          type="button"
          class="ew-btn ew-btn--subtle ew-btn--small"
          :disabled="busy"
          @click="emit('refresh')"
        >
          <AppIcon name="refresh" :size="14" />
          {{ text.refresh }}
        </button>
      </div>
    </header>
    <p v-if="error" class="ew-alert ew-alert--error" role="alert">
      <AppIcon name="warning" :size="16" />
      <span>{{ error }}</span>
    </p>
    <template v-if="status">
      <div v-if="modes.length > 1" class="ew-method-grid" role="radiogroup" :aria-label="text.methodLabel">
        <label
          v-for="mode in modes"
          :key="mode"
          class="ew-method"
          :data-mode="mode"
          :data-checked="status.mode === mode"
          :data-disabled="disabled"
        >
          <input
            type="radio"
            class="ew-visually-hidden"
            :name="ids.method"
            :value="mode"
            :checked="status.mode === mode"
            :disabled="disabled"
            @change="chooseMode(mode)"
          />
          <span class="ew-method__glyph"><AppIcon :name="METHOD_ICONS[mode]" :size="16" /></span>
          <span class="ew-method__title">
            {{ methodTitle(mode) }}
            <span
              v-if="METHOD_BADGES[mode]"
              class="ew-badge"
              :class="{ 'ew-badge--accent': mode === 'chatgpt' }"
            >
              {{ text[METHOD_BADGES[mode]] }}
            </span>
          </span>
          <span class="ew-method__hint">{{ text.methodHints[mode] }}</span>
          <span v-if="isHelperMode(mode)" class="ew-method__hint">{{ text.needsHelper }}</span>
          <AppIcon v-if="status.mode === mode" class="ew-method__check" name="check" :size="16" />
        </label>
      </div>
      <div class="ew-ai-settings__panel">
        <ApiKeyConnection
          v-if="status.mode === 'api-key'"
          :api-key="status.apiKey"
          :text="text"
          :busy="busy"
          @command="emit('command', $event)"
          @grant-access="emit('grant-access', $event)"
        />
        <slot v-else-if="status.helper === null" name="helper">
          <p class="ew-alert" role="note">
            <AppIcon name="info" :size="16" />
            <span>{{ text.helperRequired }}</span>
          </p>
        </slot>
        <ChatGptConnection
          v-else-if="status.mode === 'chatgpt'"
          :helper="status.helper"
          :text="text"
          :busy="busy"
          @command="emit('command', $event)"
        />
        <ClaudeConnection
          v-else
          :helper="status.helper"
          :text="text"
          :busy="busy"
          @command="emit('command', $event)"
        />
      </div>
    </template>
    <p class="ew-ai-settings__privacy">
      <AppIcon name="shield" :size="16" />
      <span>{{ privacy }}</span>
    </p>
  </section>
</template>
