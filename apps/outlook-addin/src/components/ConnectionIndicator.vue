<script setup lang="ts">
import { API_PROVIDER_DETAILS, type AiStatus } from '@writehand/contracts';
import { useUiText } from '@writehand/ui';
import { computed } from 'vue';

/** Which key the panel generates with, under the panel's tabs, as in the extension. */
const props = defineProps<{ status: AiStatus | null }>();
const emit = defineEmits<{ 'open-settings': [] }>();
const text = useUiText();

const label = computed(() => {
  const status = props.status;
  if (status === null) return text.value.ai.checking;
  if (!status.ready) return text.value.ai.notReady;
  return text.value.ai.useApi(API_PROVIDER_DETAILS[status.apiKey.provider].name);
});
</script>

<template>
  <div class="ew-ai-indicator">
    <span class="ew-ai-indicator__label">{{ label }}</span>
    <button type="button" class="ew-link" @click="emit('open-settings')">{{ text.ai.openSettings }}</button>
  </div>
</template>
