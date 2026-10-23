<script setup lang="ts">
import type { Operation, TargetLanguage } from '@writehand/contracts';
import { isSessionBusy } from '@writehand/core';
import type { Appearance, PanelSessionDependencies, PanelSurface } from '@writehand/session';
import {
  ComposeToolbar,
  provideUiText,
  ThreadLauncher,
  type QuickActionRequest,
  type UiText,
} from '@writehand/ui';
import { computed, onScopeDispose, shallowRef, type Ref } from 'vue';

import { requestOpenOptions } from '../platform/extension-client';
import InlineAssistantHost from './InlineAssistantHost.vue';
import type { LauncherTarget } from './mount-launchers';

const props = defineProps<{
  text: Readonly<Ref<UiText>>;
  appearance: Readonly<Ref<Appearance>>;
  /** Updated in place: when the draft later becomes a reply, the label changes but the button is kept. */
  target: Readonly<Ref<LauncherTarget>>;
  session: PanelSessionDependencies;
  surface: Readonly<Ref<PanelSurface>>;
  defaultLanguage: Readonly<Ref<TargetLanguage>>;
  favoriteLanguages: Readonly<Ref<readonly TargetLanguage[]>>;
}>();

const emit = defineEmits<{
  'open-thread': [];
  'quick-action': [request: QuickActionRequest];
  'open-panel': [];
}>();

provideUiText(props.text);

const state = shallowRef(props.session.store.getState());
const unsubscribe = props.session.store.subscribe((next) => {
  state.value = next;
});
onScopeDispose(unsubscribe);

/** The card opens only on the toolbar of the draft where the operation started. */
const cardOpen = computed(() => {
  const surface = props.surface.value;
  const target = props.target.value;
  return (
    target.kind === 'composer' && surface.kind === 'inline' && surface.composerKey === target.composerKey
  );
});

const busyOperation = computed<Operation | null>(() =>
  cardOpen.value && isSessionBusy(state.value) ? state.value.form.operation : null,
);
</script>

<template>
  <div
    class="ew-root"
    :data-theme="appearance.value.theme"
    :data-skin="appearance.value.skin"
    :style="appearance.value.style"
  >
    <ThreadLauncher v-if="target.value.kind === 'thread'" @open="emit('open-thread')" />
    <div v-else class="ew-compose-anchor">
      <InlineAssistantHost v-if="cardOpen" :session="session" />
      <ComposeToolbar
        :is-reply="target.value.isReply"
        :busy-operation="busyOperation"
        :default-language="defaultLanguage.value"
        :favorite-languages="favoriteLanguages.value"
        @quick-action="emit('quick-action', $event)"
        @open-panel="emit('open-panel')"
        @manage-languages="requestOpenOptions()"
      />
    </div>
  </div>
</template>
