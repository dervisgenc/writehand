<script setup lang="ts">
import type { AiStatus } from '@writehand/contracts';
import { usePanelSession, type PanelSessionDependencies } from '@writehand/session';
import { AppIcon, WriterPanel } from '@writehand/ui';
import { computed } from 'vue';

import ConnectionIndicator from '../components/ConnectionIndicator.vue';

/** The extension's panel, filling the task pane. Outlook frames and closes the pane itself. */
const props = defineProps<{
  session: PanelSessionDependencies;
  status: AiStatus | null;
  noItemText: string;
  settingsLabel: string;
}>();
const emit = defineEmits<{ 'open-settings': [] }>();
const { view, handlers, limits } = usePanelSession(props.session);
/** A pinned pane while no email is selected: no draft to load and no conversation to reply to. */
const noItem = computed(() => !view.value.source.canLoadDraft && view.value.writeOperation === 'compose');
</script>

<template>
  <WriterPanel
    embedded
    :view="view"
    :limits="limits"
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
    <template #header-actions>
      <button
        type="button"
        class="ew-btn ew-btn--subtle ew-btn--icon"
        :aria-label="settingsLabel"
        :title="settingsLabel"
        @click="emit('open-settings')"
      >
        <AppIcon name="sliders" />
      </button>
    </template>
    <template #connection>
      <ConnectionIndicator :status="status" @open-settings="emit('open-settings')" />
      <p v-if="noItem" class="ew-alert" role="status">
        <AppIcon name="info" :size="16" />
        <span>{{ noItemText }}</span>
      </p>
    </template>
  </WriterPanel>
</template>
