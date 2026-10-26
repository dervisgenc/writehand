<script setup lang="ts">
import type { AiService } from '@writehand/ai-connection';
import {
  isHelperMode,
  type AiCommand,
  type AiMode,
  type AiStatus,
  type ErrorCode,
} from '@writehand/contracts';
import { AiConnectionSettings, AppIcon, useUiText } from '@writehand/ui';
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';

/**
 * The AI connection, as in the extension's settings: the methods this pane offers (`methods`),
 * the ChatGPT and Claude plans through the helper app that served the pane, and API keys in the
 * pane itself. `helperUnavailable` is shown in place of a plan while the helper app does not
 * answer.
 */
const props = defineProps<{
  ai: AiService;
  methods: readonly AiMode[];
  helperUnavailable: string;
}>();
const emit = defineEmits<{ ready: [ready: boolean] }>();
const text = useUiText();
const status = shallowRef<AiStatus | null>(null);
const error = ref<ErrorCode | null>(null);
const busy = ref(false);
const errorText = computed(() => {
  const code = error.value ?? status.value?.error;
  return code ? text.value.errors[code] : null;
});
watch(
  () => status.value?.ready === true,
  (ready) => emit('ready', ready),
);
/** Refresh also reloads the model list, except while the helper app signs in or does not answer. */
const refreshesModels = computed(() => {
  const current = status.value;
  return (
    current !== null && (current.helper !== null ? !current.helper.signingIn : !isHelperMode(current.mode))
  );
});
let disposed = false;
let timer: ReturnType<typeof setTimeout> | undefined;
/** The model list each method was last loaded for, so a failed load is not repeated by itself. */
let modelsRequestedFor: string | null = null;

function show(result: Awaited<ReturnType<AiService['command']>>) {
  if (result.ok) {
    status.value = result.value;
    error.value = null;
  } else error.value = result.error.code;
}

async function refresh(refreshModels = false) {
  if (busy.value || disposed) return;
  busy.value = true;
  const result = refreshModels
    ? await props.ai.command({ action: 'refresh-models' })
    : { ok: true as const, value: await props.ai.status() };
  busy.value = false;
  if (disposed) return;
  show(result);
  schedulePoll();
}

/** Polls while a ChatGPT sign-in is pending and while a plan waits for the helper app. */
function schedulePoll() {
  clearTimeout(timer);
  const current = status.value;
  if (disposed || current === null) return;
  if (current.helper?.signingIn) timer = setTimeout(() => void refresh(), 1_000);
  else if (isHelperMode(current.mode) && current.helper === null)
    timer = setTimeout(() => void refresh(), 3_000);
}

/** Loads the model list once, when the method can list models but has none yet. */
async function loadMissingModels() {
  const current = status.value;
  if (current === null) return;
  const { apiKey, helper } = current;
  const missing =
    current.mode === 'api-key'
      ? apiKey.savedKeys.includes(apiKey.provider) && apiKey.models.length === 0
      : current.mode === 'chatgpt' &&
        helper !== null &&
        !helper.signingIn &&
        helper.models.length === 0 &&
        helper.accounts.some(
          (account) => account.id === helper.activeAccountId && account.connected && account.planEnabled,
        );
  const target = current.mode === 'api-key' ? `api-key:${apiKey.provider}` : current.mode;
  if (!missing || modelsRequestedFor === target) return;
  modelsRequestedFor = target;
  await refresh(true);
}

async function command(next: AiCommand) {
  if (busy.value) return;
  busy.value = true;
  const result = await props.ai.command(next);
  busy.value = false;
  if (disposed) return;
  show(result);
  schedulePoll();
  await loadMissingModels();
}

onMounted(async () => {
  await refresh();
  await loadMissingModels();
});
onUnmounted(() => {
  disposed = true;
  clearTimeout(timer);
});
</script>

<template>
  <AiConnectionSettings
    :status="status"
    :text="text.ai"
    :error="errorText"
    :busy="busy"
    :modes="methods"
    @command="command"
    @refresh="refresh(refreshesModels)"
  >
    <template #helper>
      <div class="ew-alert" role="note">
        <AppIcon name="info" :size="16" />
        <span class="ew-alert__body">{{ helperUnavailable }}</span>
      </div>
    </template>
  </AiConnectionSettings>
</template>
