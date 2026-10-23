<script setup lang="ts">
import {
  HELPER_DELETE_DATA_OPTION,
  helperInstallCommand,
  helperUninstallCommand,
  HOST_OPERATING_SYSTEM_NAMES,
  HOST_OPERATING_SYSTEMS,
  type HostOperatingSystem,
} from '@writehand/contracts';
import type { ExtensionText } from '@writehand/locales';
import { AppIcon, CommandBox } from '@writehand/ui';
import { computed, onMounted, ref, useId } from 'vue';

import { useHelper } from '../composables/use-helper';
import { copyText } from '../platform/clipboard';
import { extensionId, operatingSystem } from '../platform/extension-browser';

/**
 * The helper app's permission and one-command install, shown in the wizard when the chosen
 * method needs the helper app. It notices the helper app by itself once the command has run.
 */
const props = defineProps<{ text: ExtensionText }>();
const welcome = computed(() => props.text.welcome);
const ids = { title: useId(), system: useId() };
const helper = useHelper();
const system = ref<HostOperatingSystem>('linux');
const copied = ref<string | null>(null);
const connected = computed(() => helper.view.value.kind === 'connected');
const installCommand = computed(() => helperInstallCommand(system.value, extensionId()));
const uninstallCommand = computed(() => helperUninstallCommand(system.value));

onMounted(async () => {
  system.value = await operatingSystem();
  await helper.refresh();
});

async function copy(command: string) {
  if ((await copyText({ text: command, html: null })).ok) copied.value = command;
}
</script>

<template>
  <section class="ew-helper-install" :aria-labelledby="ids.title">
    <h3 :id="ids.title" class="ew-ai-guide__label">{{ welcome.install.title }}</h3>
    <p class="ew-muted">{{ welcome.install.lead }}</p>
    <div v-if="helper.view.value.kind === 'permission'" class="ew-progress" data-tone="warning">
      <AppIcon name="info" :size="16" />
      <span class="ew-alert__body">
        {{ text.ui.helper.permissionBody }}
        <button type="button" class="ew-btn ew-btn--primary ew-btn--small" @click="helper.grant">
          {{ text.ui.helper.grant }}
        </button>
      </span>
    </div>
    <div class="ew-ai-settings__field">
      <span :id="ids.system" class="ew-label">{{ welcome.install.system }}</span>
      <div class="ew-segmented" role="radiogroup" :aria-labelledby="ids.system">
        <label
          v-for="os in HOST_OPERATING_SYSTEMS"
          :key="os"
          class="ew-segmented__option"
          :data-checked="system === os"
        >
          <input
            type="radio"
            class="ew-visually-hidden"
            :name="ids.system"
            :value="os"
            :checked="system === os"
            @change="system = os"
          />
          {{ HOST_OPERATING_SYSTEM_NAMES[os] }}
        </label>
      </div>
    </div>
    <CommandBox
      :command="installCommand"
      :label="welcome.install.command"
      :copy-label="text.ui.helper.copy"
      :copied-label="text.ui.helper.copied"
      :copied="copied === installCommand"
      @copy="copy"
    />
    <p class="ew-muted">{{ welcome.install.terminal[system] }}</p>
    <p
      class="ew-progress"
      :data-tone="connected ? 'success' : helper.view.value.kind === 'outdated' ? 'warning' : undefined"
      role="status"
    >
      <template v-if="helper.view.value.kind === 'connected'">
        <AppIcon name="check" :size="16" />
        <span>{{ welcome.install.connected(helper.view.value.info.version) }}</span>
      </template>
      <template v-else-if="helper.view.value.kind === 'outdated'">
        <AppIcon name="warning" :size="16" />
        <span>{{ text.ui.helper.outdatedBody }}</span>
      </template>
      <template v-else>
        <span class="ew-spinner" aria-hidden="true" />
        <span>{{ welcome.install.waiting }}</span>
      </template>
    </p>
    <details class="ew-disclosure">
      <summary><AppIcon name="chevronRight" :size="14" />{{ welcome.install.whatTitle }}</summary>
      <div class="ew-disclosure__body">
        <ul class="ew-points">
          <li v-for="item in welcome.install.what" :key="item">
            <AppIcon name="check" :size="16" />
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </details>
    <details class="ew-disclosure">
      <summary><AppIcon name="chevronRight" :size="14" />{{ text.ui.helper.uninstallTitle }}</summary>
      <div class="ew-disclosure__body">
        <p class="ew-muted">{{ text.ui.helper.uninstallBody(HELPER_DELETE_DATA_OPTION[system]) }}</p>
        <CommandBox
          :command="uninstallCommand"
          :label="text.ui.helper.uninstallTitle"
          :copy-label="text.ui.helper.copy"
          :copied-label="text.ui.helper.copied"
          :copied="copied === uninstallCommand"
          @copy="copy"
        />
      </div>
    </details>
  </section>
</template>
