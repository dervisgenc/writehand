<script setup lang="ts">
import type { ApiKeyService } from '@writehand/ai-connection';
import type { AiCommand, AiStatus, ErrorCode } from '@writehand/contracts';
import { AiConnectionSettings, useUiText } from '@writehand/ui';
import { computed, onMounted, ref, shallowRef, watch } from 'vue';

/**
 * The API key connection: provider, key and model. The add-in has only this method, so the
 * method choice of the extension's card is not shown.
 */
const props = defineProps<{ ai: ApiKeyService }>();
const emit = defineEmits<{ ready: [ready: boolean] }>();
const text = useUiText();
const status = shallowRef<AiStatus | null>(null);
const error = ref<ErrorCode | null>(null);
const busy = ref(false);
/** The provider whose model list was last requested, so a failed load is not repeated by itself. */
let modelsRequestedFor: string | null = null;

const errorText = computed(() => (error.value === null ? null : text.value.errors[error.value]));
watch(
  () => status.value?.ready === true,
  (ready) => emit('ready', ready),
);

async function run(
  task: () => Promise<{ ok: true; value: AiStatus } | { ok: false; error: { code: ErrorCode } }>,
) {
  busy.value = true;
  const result = await task();
  busy.value = false;
  if (result.ok) {
    status.value = result.value;
    error.value = null;
  } else {
    error.value = result.error.code;
  }
}

/** Loads the selected provider's models once a key is saved and the list is still empty. */
async function loadMissingModels() {
  const apiKey = status.value?.apiKey;
  if (apiKey === undefined || !apiKey.savedKeys.includes(apiKey.provider) || apiKey.models.length > 0) return;
  if (modelsRequestedFor === apiKey.provider) return;
  modelsRequestedFor = apiKey.provider;
  await run(() => props.ai.command({ action: 'refresh-models' }));
}

async function command(next: AiCommand) {
  await run(() => props.ai.command(next));
  await loadMissingModels();
}

async function refresh() {
  modelsRequestedFor = null;
  await run(() => props.ai.command({ action: 'refresh-models' }));
}

onMounted(async () => {
  await run(async () => ({ ok: true, value: await props.ai.status() }));
  await loadMissingModels();
});
</script>

<template>
  <AiConnectionSettings
    :status="status"
    :text="text.ai"
    :error="errorText"
    :busy="busy"
    :modes="['api-key']"
    @command="command"
    @refresh="refresh"
  />
</template>
