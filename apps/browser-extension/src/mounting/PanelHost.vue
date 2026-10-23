<script setup lang="ts">
import { usePanelSession, type Appearance, type PanelSessionDependencies } from '@writehand/session';
import { provideUiText, WriterPanel, type UiText } from '@writehand/ui';
import { toRef, type Ref } from 'vue';

import AiConnectionIndicator from './AiConnectionIndicator.vue';

const props = defineProps<{
  session: PanelSessionDependencies;
  text: Readonly<Ref<UiText>>;
  appearance: Readonly<Ref<Appearance>>;
  open: Readonly<Ref<boolean>>;
}>();

provideUiText(props.text);
const { view, handlers, limits } = usePanelSession(props.session);
const isOpen = toRef(() => props.open.value);
</script>

<template>
  <div
    class="ew-root"
    :data-theme="appearance.value.theme"
    :data-skin="appearance.value.skin"
    :style="appearance.value.style"
  >
    <WriterPanel
      v-if="isOpen"
      :view="view"
      :limits="limits"
      @close="handlers.close"
      @operation-change="handlers.operationChange"
      @source-change="handlers.sourceChange"
      @instruction-change="handlers.instructionChange"
      @reload-source="handlers.reloadSource"
      @cancel-reload="handlers.cancelReload"
      @language-change="handlers.languageChange"
      @tone-change="handlers.toneChange"
      @use-conversation-change="handlers.useConversationChange"
      @context-selection-change="handlers.contextSelectionChange"
      @context-text-change="handlers.contextTextChange"
      @block-include="handlers.blockInclude"
      @reply-target-change="handlers.replyTargetChange"
      @refresh-context="handlers.refreshContext"
      @prepare="handlers.prepare"
      @preview-change="handlers.previewChange"
      @refine="handlers.refine"
      @refine-custom="handlers.refineCustom"
      @apply="handlers.apply"
      @copy="handlers.copy"
      @undo="handlers.undo"
      @bind-target="handlers.bindTarget"
      @retry="handlers.retry"
      @dismiss="handlers.dismiss"
    >
      <template #connection><AiConnectionIndicator /></template>
    </WriterPanel>
  </div>
</template>
