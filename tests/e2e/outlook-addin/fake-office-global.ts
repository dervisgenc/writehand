/**
 * Loaded in place of Office.js from Microsoft's CDN: the in-memory Office.js of the unit tests,
 * as the global `Office`. The test passes the open item in `window.__fakeOfficeOptions` and
 * drives the draft through `window.__fakeOffice`.
 */
import {
  createFakeOffice,
  type FakeOfficeControls,
  type FakeOfficeOptions,
} from '../../support/office/fake-office';

declare global {
  interface Window {
    __fakeOfficeOptions?: FakeOfficeOptions;
    __fakeOffice?: FakeOfficeControls;
  }
}

const fake = createFakeOffice(window.__fakeOfficeOptions ?? { item: null });
const office = fake.office as {
  context: Record<string, unknown>;
  EventType: Record<string, string>;
  [key: string]: unknown;
};
office.HostType = { Outlook: 'Outlook' };
office.EventType.OfficeThemeChanged = 'officeThemeChanged';
office.onReady = () => Promise.resolve({ host: 'Outlook', platform: 'PC' });
office.context.displayLanguage = 'en-US';
(window as unknown as { Office: unknown }).Office = office;
window.__fakeOffice = fake.controls;
