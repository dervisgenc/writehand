import '@writehand/ui/styles/panel.css';
import '@writehand/ui/styles/pages.css';

import { DEFAULT_SETTINGS } from '@writehand/contracts';
import { textFor, uiLanguageFor } from '@writehand/locales';
import { createApp } from 'vue';

import { fetchSettings } from '../../src/platform/extension-client';
import PopupApp from './PopupApp.vue';

async function start(): Promise<void> {
  const result = await fetchSettings();
  const settings = result.ok ? result.value.settings : DEFAULT_SETTINGS;
  document.documentElement.lang = uiLanguageFor(settings.uiLanguage);
  createApp(PopupApp, { text: textFor(settings.uiLanguage), theme: settings.theme }).mount('#app');
}

void start();
