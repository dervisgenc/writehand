import '@writehand/ui/styles/panel.css';
import '@writehand/ui/styles/pages.css';
import './taskpane.css';

import { createApp } from 'vue';

import App from './App.vue';
import { connectOffice } from './platform/office-host';

void connectOffice().then((host) => createApp(App, { host }).mount('#app'));
