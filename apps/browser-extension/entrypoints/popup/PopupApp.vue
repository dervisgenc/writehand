<script setup lang="ts">
import type { SelectorReport, Theme } from '@writehand/contracts';
import type { ExtensionText, PopupStatusKey } from '@writehand/locales';
import { computed, onMounted, ref } from 'vue';

import {
  activeTab,
  hasSiteAccess,
  openOptionsPage,
  openWelcomePage,
} from '../../src/platform/extension-browser';
import { SITE_MATCHES } from '../../src/bootstrap/supported-sites';
import {
  fetchAiSummary,
  fetchSelectorReport,
  queryPageStatus,
  requestOpenPanel,
  siteOfUrl,
} from '../../src/platform/extension-client';

const props = defineProps<{
  text: ExtensionText;
  theme: Theme;
}>();

const status = ref<PopupStatusKey>('checking');
const canOpen = ref(false);
const siteAccessMissing = ref(false);
const tabId = ref<number | null>(null);
const selectorReport = ref<SelectorReport['entries']>([]);
const isDevelopment = import.meta.env.MODE !== 'production';
// Until a connection method can generate, the user is sent to the wizard to finish setup.
const setupNeeded = ref(false);

const statusText = computed(() => props.text.popup.statuses[status.value]);

onMounted(async () => {
  void fetchAiSummary().then((summary) => {
    setupNeeded.value = summary.ok && !summary.value.ready;
  });
  const tab = await activeTab();
  const site = siteOfUrl(tab?.url);
  if (tab === null || site === null) {
    status.value = 'not-mail-site';
    return;
  }
  tabId.value = tab.id;
  const result = await queryPageStatus(tab.id);
  if (!result.ok) {
    // Explain missing site access or the need to reload instead of silently looking broken.
    status.value = 'unreachable';
    siteAccessMissing.value = !(await hasSiteAccess(SITE_MATCHES[site]));
    return;
  }
  status.value = result.value.support;
  canOpen.value = result.value.canOpenPanel;
  if (isDevelopment) {
    const report = await fetchSelectorReport(tab.id);
    selectorReport.value = report.ok ? report.value.entries : [];
  }
});

async function finishSetup(): Promise<void> {
  await openWelcomePage();
  window.close();
}

async function openPanel(): Promise<void> {
  if (tabId.value === null) {
    return;
  }
  const result = await requestOpenPanel(tabId.value);
  if (result.ok && result.value.opened) {
    window.close();
  }
}
</script>

<template>
  <main class="ew-root popup" :data-theme="theme">
    <h1 class="popup__title">{{ text.popup.title }}</h1>
    <p class="popup__status" role="status">{{ statusText }}</p>
    <p v-if="siteAccessMissing" class="ew-warning">{{ text.popup.siteAccessMissing }}</p>
    <div v-if="setupNeeded" class="ew-alert ew-alert--warning" role="status">
      <span class="ew-alert__body">
        {{ text.popup.setupNeeded }}
        <button type="button" class="ew-btn ew-btn--primary ew-btn--small" @click="finishSetup">
          {{ text.popup.finishSetup }}
        </button>
      </span>
    </div>
    <div class="popup__actions">
      <button type="button" class="ew-button ew-button--primary" :disabled="!canOpen" @click="openPanel">
        {{ text.popup.openPanel }}
      </button>
      <button type="button" class="ew-link" @click="openOptionsPage">{{ text.popup.openSettings }}</button>
    </div>
    <details v-if="isDevelopment && selectorReport.length > 0" class="popup__diagnostics">
      <summary>{{ text.popup.developmentBuild }} · selectors</summary>
      <table>
        <tbody>
          <tr v-for="entry in selectorReport" :key="entry.key">
            <td>{{ entry.key }}</td>
            <td>{{ entry.status }}</td>
            <td>{{ entry.matches }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </main>
</template>

<style>
.popup {
  width: 320px;
  padding: 16px;
  background: var(--ew-color-bg);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.popup__title {
  margin: 0;
  font-size: 16px;
}

.popup__status {
  margin: 0;
}

.popup__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.popup__diagnostics {
  font-size: 11px;
  color: var(--ew-color-muted);
}

.popup__diagnostics td {
  padding: 1px 6px 1px 0;
}
</style>
