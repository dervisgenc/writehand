<script setup lang="ts">
import type { Operation, RefinementKind, TargetLanguage, Tone } from '@writehand/contracts';
import { TONES } from '@writehand/contracts';
import { computed, onMounted, useId, useTemplateRef } from 'vue';

import { useUiText } from '../i18n';
import { inputChecked, inputValue } from '../input-value';
import type { BindTargetMode, PanelView, SourceReloadKind } from '../view-model';
import AppIcon from './AppIcon.vue';
import ApplyControls from './ApplyControls.vue';
import ContextInspector from './ContextInspector.vue';
import RefineBar from './RefineBar.vue';
import LanguagePicker from './LanguagePicker.vue';
import OperationSelector from './OperationSelector.vue';
import ResultPreview from './ResultPreview.vue';
import SourceEditor from './SourceEditor.vue';
import StatusNotice from './StatusNotice.vue';

const props = defineProps<{
  view: PanelView;
  limits: { source: number; instruction: number };
}>();

const emit = defineEmits<{
  close: [];
  'operation-change': [operation: Operation];
  'source-change': [text: string];
  'instruction-change': [text: string];
  'reload-source': [kind: SourceReloadKind, confirmReplace: boolean];
  'cancel-reload': [];
  'language-change': [language: TargetLanguage];
  'tone-change': [tone: Tone];
  'use-conversation-change': [enabled: boolean];
  'context-selection-change': [messageKey: string, included: boolean];
  'context-text-change': [messageKey: string, text: string | null];
  'block-include': [messageKey: string, blockIndex: number];
  'reply-target-change': [messageKey: string];
  'refresh-context': [];
  prepare: [];
  'preview-change': [text: string];
  refine: [kind: RefinementKind];
  'refine-custom': [instruction: string];
  apply: [];
  copy: [];
  undo: [];
  'bind-target': [mode: BindTargetMode];
  retry: [];
  dismiss: [];
}>();

const text = useUiText();
const root = useTemplateRef<HTMLElement>('root');
const titleId = useId();
const languageId = useId();
const toneId = useId();

// Focus moves to the panel on open, so even if a button is disabled during an
// operation, focus stays inside the panel and Escape keeps working.
onMounted(() => root.value?.focus({ preventScroll: true }));

const isBusy = computed(() => props.view.status.kind === 'busy' && props.view.status.activity !== 'reading');
const canPrepare = computed(() => props.view.prepare.canPrepare && !props.view.prepare.isPreparing);
const hasOptions = computed(
  () =>
    props.view.options.showTargetLanguage ||
    props.view.options.showTone ||
    props.view.options.showUseConversation,
);

const targetLabel = computed(() => {
  const { target } = props.view;
  const labels = text.value.target;
  if (target.kind === 'composer') {
    return target.isReply ? labels.replyComposer : labels.composer;
  }
  if (target.kind === 'new-reply') {
    return labels.newReply;
  }
  return target.kind === 'received-message' ? labels.receivedMessage : labels.none;
});

function onToneChange(event: Event): void {
  const value = inputValue(event);
  const tone = TONES.find((item) => item === value);
  if (tone !== undefined) {
    emit('tone-change', tone);
  }
}
</script>

<template>
  <!-- The panel does not block the page, so it has no aria-modal and does not trap focus. -->
  <div
    ref="root"
    class="ew-panel"
    role="dialog"
    tabindex="-1"
    :aria-labelledby="titleId"
    @keydown.escape="emit('close')"
  >
    <header class="ew-panel__header">
      <span class="ew-brand-mark" aria-hidden="true"><AppIcon name="sparkle" :size="18" /></span>
      <div class="ew-panel__heading">
        <h2 :id="titleId" class="ew-panel__title">{{ text.panelTitle }}</h2>
        <p class="ew-panel__subtitle">
          <span class="ew-visually-hidden">{{ text.target.label }}: </span>{{ targetLabel }}
        </p>
      </div>
      <button
        type="button"
        class="ew-btn ew-btn--subtle ew-btn--icon"
        :aria-label="text.close"
        :title="text.close"
        @click="emit('close')"
      >
        <AppIcon name="close" />
      </button>
    </header>

    <div class="ew-panel__tabs">
      <OperationSelector
        :operation="view.operation"
        :write-operation="view.writeOperation"
        :disabled="isBusy"
        @operation-change="emit('operation-change', $event)"
      />
    </div>
    <slot name="connection" />

    <div class="ew-panel__body">
      <p v-if="view.staleNotice !== null" class="ew-alert ew-alert--warning" role="alert">
        <AppIcon name="warning" />
        <span>{{ text.errors[view.staleNotice] }}</span>
      </p>

      <SourceEditor
        :operation="view.operation"
        :source="view.source"
        :source-error="view.fieldErrors.source ?? null"
        :instruction-error="view.fieldErrors.instruction ?? null"
        :limits="limits"
        :disabled="isBusy"
        @source-change="emit('source-change', $event)"
        @instruction-change="emit('instruction-change', $event)"
        @reload-source="(kind, confirm) => emit('reload-source', kind, confirm)"
        @cancel-reload="emit('cancel-reload')"
      />

      <div v-if="hasOptions" class="ew-options">
        <div v-if="view.options.showTargetLanguage" class="ew-options__field">
          <label class="ew-label" :for="languageId">{{ text.options.targetLanguage }}</label>
          <LanguagePicker
            :id="languageId"
            :model-value="view.options.targetLanguage"
            :disabled="isBusy"
            :invalid="view.fieldErrors.targetLanguage !== undefined"
            @update:model-value="emit('language-change', $event)"
          />
        </div>
        <div v-if="view.options.showTone" class="ew-options__field">
          <label class="ew-label" :for="toneId">{{ text.options.tone }}</label>
          <select
            :id="toneId"
            class="ew-select"
            :value="view.options.tone"
            :disabled="isBusy"
            @change="onToneChange"
          >
            <option v-for="tone in TONES" :key="tone" :value="tone">{{ text.options.tones[tone] }}</option>
          </select>
        </div>
        <label v-if="view.options.showUseConversation" class="ew-options__toggle">
          <input
            class="ew-checkbox"
            type="checkbox"
            :checked="view.options.useConversation"
            :disabled="isBusy"
            @change="emit('use-conversation-change', inputChecked($event))"
          />
          {{ text.options.useConversation }}
        </label>
      </div>

      <ContextInspector
        v-if="view.context.required"
        :context="view.context"
        :disabled="isBusy"
        @context-selection-change="(key, included) => emit('context-selection-change', key, included)"
        @context-text-change="(key, value) => emit('context-text-change', key, value)"
        @block-include="(key, index) => emit('block-include', key, index)"
        @reply-target-change="emit('reply-target-change', $event)"
        @refresh-context="emit('refresh-context')"
      />

      <ResultPreview
        v-if="view.preview !== null"
        :preview="view.preview"
        :error="view.fieldErrors.preview ?? null"
        :disabled="view.apply.isApplying"
        :can-regenerate="canPrepare"
        @preview-change="emit('preview-change', $event)"
        @regenerate="emit('prepare')"
      />
      <RefineBar
        v-if="view.preview !== null && (view.refine.available || isBusy)"
        :rich="view.refine.rich"
        :disabled="!view.refine.available"
        @refine="emit('refine', $event)"
        @refine-custom="emit('refine-custom', $event)"
      />
    </div>

    <footer class="ew-panel__footer">
      <StatusNotice :status="view.status" @retry="emit('retry')" @dismiss="emit('dismiss')" />
      <ApplyControls
        v-if="view.preview !== null"
        :apply="view.apply"
        @apply="emit('apply')"
        @copy="emit('copy')"
        @undo="emit('undo')"
        @bind-target="emit('bind-target', $event)"
      />
      <div v-else class="ew-prepare">
        <button
          type="button"
          class="ew-btn ew-btn--primary ew-btn--block"
          :disabled="!canPrepare"
          @click="emit('prepare')"
        >
          <span v-if="view.prepare.isPreparing" class="ew-spinner" aria-hidden="true" />
          <AppIcon v-else name="sparkle" />
          {{ text.prepareButton[view.operation] }}
        </button>
        <!-- When preparing is blocked, explain why the button is unavailable. -->
        <p v-if="view.prepare.blocker !== null" class="ew-muted">{{ text.errors[view.prepare.blocker] }}</p>
      </div>
    </footer>
  </div>
</template>
