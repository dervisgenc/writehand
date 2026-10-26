<script setup lang="ts">
import { CHATGPT_USAGE_URL, type AiCommand, type HelperStatus } from '@writehand/contracts';
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue';

import type { AiText } from '../ai-text';
import { inputValue } from '../input-value';
import AiAccountActions from './AiAccountActions.vue';
import AppIcon from './AppIcon.vue';
import ModelSelect from './ModelSelect.vue';

/** ChatGPT plan accounts, kept by the helper app. */
const props = defineProps<{ helper: HelperStatus; text: AiText; busy: boolean }>();
const emit = defineEmits<{ command: [command: AiCommand] }>();
const ids = {
  account: useId(),
  accountHint: useId(),
  welcome: useId(),
  codexHint: useId(),
  codexWarning: useId(),
};
const welcome = useTemplateRef<HTMLDialogElement>('welcome');
/**
 * The Codex sign-in is offered for work accounts that Sign in with ChatGPT does not serve. It uses a
 * client OpenAI has not published for other apps, so the risk is shown and confirmed before it starts.
 */
const codexWarningOpen = ref(false);
const codexContinue = useTemplateRef<HTMLButtonElement>('codexContinue');
const codexButton = useTemplateRef<HTMLButtonElement>('codexButton');
async function showCodexWarning() {
  codexWarningOpen.value = true;
  await nextTick();
  codexContinue.value?.focus();
}
async function closeCodexWarning() {
  codexWarningOpen.value = false;
  await nextTick();
  codexButton.value?.focus();
}
function startCodexSignIn() {
  codexWarningOpen.value = false;
  emit('command', { action: 'connect', accountId: null, signIn: 'codex' });
}
const selectedId = ref<string | null>(null);
const active = computed(() =>
  props.helper.accounts.find((account) => account.id === props.helper.activeAccountId),
);
const selected = computed(
  () =>
    props.helper.accounts.find((account) => account.id === selectedId.value) ??
    active.value ??
    props.helper.accounts[0],
);
const selectedIsActive = computed(() => selected.value?.id === props.helper.activeAccountId);
watch(
  () => props.helper.activeAccountId,
  (id) => {
    if (id) selectedId.value = id;
  },
  { immediate: true },
);
const disabled = computed(() => props.busy || props.helper.signingIn);
const connectionState = computed(() => {
  if (!selected.value) return null;
  if (!selected.value.verified) return props.text.registrationIncomplete;
  if (!selected.value.connected) return props.text.disconnected;
  if (!selected.value.planEnabled) return props.text.planDisabled;
  if (!selectedIsActive.value) return props.text.savedConnection;
  return props.helper.ready ? props.text.connected : props.text.generationUnavailable;
});
watch(
  () => props.helper.needsPlanAcknowledgement,
  async (visible) => {
    await nextTick();
    if (visible && welcome.value?.showModal) welcome.value.showModal();
    else welcome.value?.close?.();
  },
  { immediate: true },
);
</script>

<template>
  <p class="ew-muted">{{ text.planNote }}</p>
  <p v-if="active?.connected" class="ew-ai-settings__meta">
    {{ text.activeAccount }}: <strong>{{ active.label }}</strong>
  </p>
  <div v-if="helper.accounts.length" class="ew-ai-settings__field">
    <label class="ew-label" :for="ids.account">{{ text.account }}</label>
    <select
      :id="ids.account"
      class="ew-select"
      :value="selected?.id ?? ''"
      :aria-describedby="ids.accountHint"
      :disabled="busy"
      @change="selectedId = inputValue($event)"
    >
      <option disabled value="">{{ text.account }}</option>
      <option v-for="account in helper.accounts" :key="account.id" :value="account.id">
        {{ account.label }}{{ account.email && account.email !== account.label ? ` · ${account.email}` : ''
        }}{{ account.signIn === 'codex' ? ` · ${text.codexSignIn}` : '' }}
      </option>
    </select>
    <p :id="ids.accountHint" class="ew-muted">{{ text.savedAccountHint }}</p>
  </div>
  <p
    v-if="connectionState"
    class="ew-ai-settings__state"
    :data-ready="helper.ready && selectedIsActive"
    role="status"
  >
    {{ connectionState }}
  </p>
  <div class="ew-ai-settings__actions">
    <button
      v-if="!selected?.connected || !selected.planEnabled"
      type="button"
      class="ew-btn ew-ai-sign-in"
      :disabled="disabled"
      @click="emit('command', { action: 'connect', accountId: selected?.id ?? null })"
    >
      {{ text.connect }}
    </button>
    <button
      v-else-if="!selectedIsActive"
      type="button"
      class="ew-btn ew-btn--primary"
      :disabled="disabled"
      @click="emit('command', { action: 'select-account', accountId: selected.id })"
    >
      {{ text.useAccount }}
    </button>
    <button
      v-else
      type="button"
      class="ew-btn"
      :disabled="disabled"
      @click="emit('command', { action: 'connect', accountId: selected.id })"
    >
      {{ text.reconnect }}
    </button>
    <button
      v-if="helper.accounts.length"
      type="button"
      class="ew-btn"
      :disabled="busy"
      @click="emit('command', { action: 'connect', accountId: null })"
    >
      <AppIcon name="plus" :size="14" />
      {{ text.addAccount }}
    </button>
    <button
      ref="codexButton"
      type="button"
      class="ew-btn ew-ai-codex"
      :disabled="busy"
      :aria-describedby="ids.codexHint"
      :aria-expanded="codexWarningOpen"
      :aria-controls="ids.codexWarning"
      @click="codexWarningOpen ? closeCodexWarning() : showCodexWarning()"
    >
      {{ text.codexConnect }}
    </button>
  </div>
  <p :id="ids.codexHint" class="ew-muted">{{ text.codexHint }}</p>
  <section
    v-if="codexWarningOpen"
    :id="ids.codexWarning"
    class="ew-alert ew-alert--warning ew-ai-codex-warning"
    :aria-labelledby="`${ids.codexWarning}-title`"
    @keydown.esc.stop="closeCodexWarning()"
  >
    <div class="ew-ai-codex-warning__body">
      <h3 :id="`${ids.codexWarning}-title`" class="ew-ai-codex-warning__title">
        {{ text.codexWarningTitle }}
      </h3>
      <p v-for="line in text.codexWarning" :key="line">{{ line }}</p>
      <div class="ew-ai-settings__actions">
        <button
          ref="codexContinue"
          type="button"
          class="ew-btn ew-btn--primary"
          :disabled="busy"
          @click="startCodexSignIn()"
        >
          {{ text.codexWarningContinue }}
        </button>
        <button type="button" class="ew-btn" @click="closeCodexWarning()">{{ text.cancel }}</button>
      </div>
    </div>
  </section>
  <div v-if="selected" class="ew-ai-settings__manage">
    <button
      v-if="selected.connected"
      type="button"
      class="ew-btn ew-btn--subtle ew-btn--small"
      :disabled="disabled"
      @click="emit('command', { action: 'disconnect', accountId: selected.id })"
    >
      {{ text.disconnect }}
    </button>
    <AiAccountActions :account="selected" :text="text" :busy="busy" @command="emit('command', $event)" />
  </div>
  <div v-if="helper.signingIn" class="ew-alert" role="status">
    <span class="ew-spinner" aria-hidden="true" />
    <span class="ew-alert__body">
      {{ text.signingIn }}
      <button type="button" class="ew-link" @click="emit('command', { action: 'cancel-sign-in' })">
        {{ text.cancel }}
      </button>
    </span>
  </div>
  <a
    class="ew-link ew-ai-settings__usage"
    :href="CHATGPT_USAGE_URL"
    target="_blank"
    rel="noopener noreferrer"
  >
    {{ text.manageUsage }}
    <AppIcon name="external" :size="14" />
  </a>
  <p class="ew-muted">
    {{ selected?.signIn === 'codex' ? text.codexConnectionHelp : text.connectionHelp }}
  </p>
  <ModelSelect
    v-if="helper.models.length && selectedIsActive"
    :models="helper.models"
    :selected="helper.selectedModel"
    :text="text"
    :disabled="disabled"
    @select="emit('command', { action: 'set-model', model: $event })"
  />
  <dialog
    ref="welcome"
    class="ew-ai-welcome"
    :aria-labelledby="ids.welcome"
    @cancel.prevent="emit('command', { action: 'acknowledge-plan' })"
  >
    <h2 :id="ids.welcome">{{ text.welcome }}</h2>
    <p>{{ text.welcomeBody }}</p>
    <div class="ew-ai-settings__actions">
      <a class="ew-link" :href="CHATGPT_USAGE_URL" target="_blank" rel="noopener noreferrer">{{
        text.manageUsage
      }}</a>
      <button
        type="button"
        autofocus
        class="ew-btn ew-btn--primary"
        :disabled="busy"
        @click="emit('command', { action: 'acknowledge-plan' })"
      >
        {{ text.gotIt }}
      </button>
    </div>
  </dialog>
</template>
