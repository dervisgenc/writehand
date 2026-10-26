<script setup lang="ts">
import { usePanelSession, type PanelSessionDependencies } from '@writehand/session';
import { InlineAssistant } from '@writehand/ui';

import AiConnectionIndicator from './AiConnectionIndicator.vue';

const props = defineProps<{
  session: PanelSessionDependencies;
}>();

// The card shows the same session as the panel; "Open in panel" continues the work without losing it.
const { view, handlers } = usePanelSession(props.session);
</script>

<template>
  <InlineAssistant
    :view="view"
    @close="handlers.close"
    @expand="handlers.expandToPanel"
    @submit-instruction="handlers.submitInstruction"
    @translate-to="handlers.translateTo"
    @refine="handlers.refine"
    @refine-custom="handlers.refineCustom"
    @preview-change="handlers.previewChange"
    @apply="handlers.apply"
    @copy="handlers.copy"
    @undo="handlers.undo"
    @retry="handlers.retry"
    @dismiss="handlers.dismiss"
  >
    <template #connection><AiConnectionIndicator /></template>
  </InlineAssistant>
</template>
