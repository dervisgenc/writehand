import { API_PROVIDER_PERMISSIONS, OUTLOOK_ADDIN_ID, PRODUCT_NAME, UI_LANGUAGES } from '@writehand/contracts';
import { addinTextFor } from '@writehand/locales';
import { describe, expect, it } from 'vitest';

import {
  contentSecurityPolicy,
  DEV_ORIGIN,
  HELPER_ORIGIN,
  OFFICE_JS_URL,
  PROVIDER_ORIGINS,
} from '../../../apps/outlook-addin/build/addin-config';
import {
  createManifest,
  MANIFEST_LOCALES,
  manifestVersion,
} from '../../../apps/outlook-addin/build/manifest';
import { PANE_COMMANDS, paneCommand } from '../../../apps/outlook-addin/src/pane-commands';
import { createLocalStorageArea, keyDatabaseName } from '../../../apps/outlook-addin/src/platform/storage';

const ORIGIN = 'https://addin.example.org';

function parse(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  expect(document.querySelector('parsererror')).toBeNull();
  return document;
}

const byTag = (root: Document | Element, tag: string) => [...root.getElementsByTagName(tag)];

describe('Outlook add-in manifest', () => {
  const xml = createManifest({ origin: ORIGIN, version: '1.2.3' });
  const manifest = parse(xml);

  it('names the fixed add-in ID, the x.y.z.0 version and the product', () => {
    expect(byTag(manifest, 'Id')[0]?.textContent).toBe(OUTLOOK_ADDIN_ID);
    expect(byTag(manifest, 'Version')[0]?.textContent).toBe('1.2.3.0');
    expect(byTag(manifest, 'DisplayName')[0]?.getAttribute('DefaultValue')).toBe(PRODUCT_NAME);
    expect(manifest.documentElement.getAttribute('xsi:type')).toBe('MailApp');
    expect(() => manifestVersion('1.2')).toThrow();
  });

  it('asks only for ReadWriteItem on messages in read and compose mode, from Mailbox 1.5', () => {
    expect(byTag(manifest, 'Permissions')[0]?.textContent).toBe('ReadWriteItem');
    const rules = byTag(manifest, 'Rule').filter((rule) => rule.getAttribute('xsi:type') === 'ItemIs');
    expect(rules.map((rule) => [rule.getAttribute('ItemType'), rule.getAttribute('FormType')])).toEqual([
      ['Message', 'Read'],
      ['Message', 'Edit'],
    ]);
    expect(byTag(manifest, 'Set')[0]?.getAttribute('MinVersion')).toBe('1.5');
    for (const forbidden of ['LaunchEvent', 'ItemSend', 'OnMessageSend', 'ReadWriteMailbox', 'Appointment']) {
      expect(xml).not.toContain(forbidden);
    }
  });

  it('opens the task pane from a button on a received email and a menu on a draft, pinnable only in v1.1', () => {
    const outer = byTag(manifest, 'VersionOverrides');
    expect(outer.map((element) => element.getAttribute('xsi:type'))).toEqual([
      'VersionOverridesV1_0',
      'VersionOverridesV1_1',
    ]);
    // v1.1 must be the last child of v1.0.
    expect(outer[0]?.lastElementChild).toBe(outer[1]);
    const points = byTag(outer[1]!, 'ExtensionPoint');
    expect(points.map((point) => point.getAttribute('xsi:type'))).toEqual([
      'MessageReadCommandSurface',
      'MessageComposeCommandSurface',
    ]);
    const controls = points.map((point) => byTag(point, 'Control').map((c) => c.getAttribute('xsi:type')));
    expect(controls).toEqual([['Button'], ['Menu']]);
    // The read button and the menu's four commands each open the pane, pinnable.
    expect(byTag(outer[1]!, 'SupportsPinning').map((element) => element.textContent)).toEqual(
      Array(5).fill('true'),
    );
    const v10Only = [...outer[0]!.children].filter((child) => child !== outer[1]);
    expect(v10Only.flatMap((child) => byTag(child, 'SupportsPinning'))).toEqual([]);
    expect(
      byTag(manifest, 'Action').every((action) => action.getAttribute('xsi:type') === 'ShowTaskpane'),
    ).toBe(true);
  });

  it("lists revise, translate, write and open in the draft's menu; each opens the pane with its command", () => {
    // v1.1 holds its own commands and resources.
    const v11 = byTag(manifest, 'VersionOverrides')[1]!;
    const resource = (tag: string, id: string | null) =>
      byTag(v11, tag).find((element) => element.getAttribute('id') === id);
    const compose = byTag(v11, 'ExtensionPoint')[1]!;
    const items = byTag(compose, 'Item');

    const addresses = items.map((item) =>
      resource('bt:Url', byTag(item, 'SourceLocation')[0]!.getAttribute('resid'))?.getAttribute(
        'DefaultValue',
      ),
    );
    expect(addresses).toEqual([
      `${ORIGIN}/taskpane.html?command=revise`,
      `${ORIGIN}/taskpane.html?command=translate`,
      `${ORIGIN}/taskpane.html?command=write`,
      `${ORIGIN}/taskpane.html`,
    ]);
    // The pane reads from its address the operation the menu names.
    expect(addresses.map((address) => paneCommand(new URL(address!).search))).toEqual([
      PANE_COMMANDS.revise,
      PANE_COMMANDS.translate,
      PANE_COMMANDS.write,
      null,
    ]);

    const label = (item: Element, locale?: string) => {
      const string = resource('bt:String', byTag(item, 'Label')[0]!.getAttribute('resid'))!;
      if (locale === undefined) return string.getAttribute('DefaultValue');
      const override = byTag(string, 'bt:Override').find(
        (element) => element.getAttribute('Locale') === locale,
      );
      return override?.getAttribute('Value');
    };
    expect(items.map((item) => label(item))).toEqual(['Revise', 'Translate', 'Write', 'Open Writehand']);
    expect(items.map((item) => label(item, 'tr-TR'))).toEqual(['Düzelt', 'Çevir', 'Yaz', 'Writehand’i aç']);
    const tooltip = resource('bt:String', byTag(items[0]!, 'Description')[0]!.getAttribute('resid'));
    expect(tooltip?.getAttribute('DefaultValue')).toBe(
      addinTextFor('en').addin.manifest.commands.reviseTooltip,
    );

    // Resource IDs: at most 32 characters. Control and item IDs: unique.
    const resourceIds = byTag(v11, 'Resources').flatMap((resources) =>
      [...resources.querySelectorAll('[id]')].map((element) => element.getAttribute('id')!),
    );
    expect(Math.max(...resourceIds.map((id) => id.length))).toBeLessThanOrEqual(32);
    const commandIds = [...byTag(v11, 'Control'), ...byTag(v11, 'Item')].map((element) =>
      element.getAttribute('id'),
    );
    expect(new Set(commandIds).size).toBe(commandIds.length);
  });

  it('loads every page and icon over HTTPS from the one origin', () => {
    const urls = [...xml.matchAll(/DefaultValue="(https:[^"]+)"/g)].map((match) => match[1]!);
    const hosted = urls.filter((url) => !url.startsWith('https://github.com/'));
    expect(new Set(hosted.map((url) => new URL(url).origin))).toEqual(new Set([ORIGIN]));
    expect(hosted).toEqual(
      expect.arrayContaining([
        `${ORIGIN}/taskpane.html`,
        `${ORIGIN}/commands.html`,
        `${ORIGIN}/assets/icon-64.png`,
        `${ORIGIN}/assets/icon-128.png`,
        `${ORIGIN}/assets/icon-80.png`,
      ]),
    );
  });

  it('translates the description and button texts for every interface language, escaped', () => {
    const overrides = byTag(manifest, 'Description')[0]!.getElementsByTagName('Override');
    const locales = [...overrides].map((override) => override.getAttribute('Locale'));
    expect(locales).toEqual(Object.values(MANIFEST_LOCALES).flat());
    for (const language of UI_LANGUAGES.filter((language) => language !== 'en')) {
      const [locale] = MANIFEST_LOCALES[language];
      const override = [...overrides].find((element) => element.getAttribute('Locale') === locale);
      expect(override?.getAttribute('Value')).toBe(addinTextFor(language).addin.manifest.description);
    }
    const tooltip = [...byTag(manifest, 'bt:String')].find(
      (element) => element.getAttribute('id') === 'ButtonTooltip',
    );
    expect(tooltip?.getAttribute('DefaultValue')).toBe(addinTextFor('en').addin.manifest.buttonTooltip);
  });
});

describe("The pane's command", () => {
  it("is read from the pane's address, next to Outlook's own parameters", () => {
    expect(paneCommand('?command=revise&_host_Info=Outlook$Win32$16.02$en-US$$$$0')).toEqual({
      operation: 'revise',
    });
    expect(paneCommand('?_host_Info=Outlook&command=translate')).toEqual({
      operation: 'translate',
      language: null,
    });
    expect(paneCommand('?command=write')).toEqual({ operation: 'compose' });
  });

  it('is nothing for the plain pane or an unknown name', () => {
    expect(paneCommand('')).toBeNull();
    expect(paneCommand('?_host_Info=Outlook')).toBeNull();
    for (const name of ['send', 'toString', '__proto__', 'REVISE'])
      expect(paneCommand(`?command=${name}`)).toBeNull();
  });
});

describe('Outlook add-in page policy', () => {
  it('lets the page connect only to the three providers and Office.js, with no inline code in production', () => {
    const policy = contentSecurityPolicy({ dev: false });
    expect(PROVIDER_ORIGINS).toEqual(
      API_PROVIDER_PERMISSIONS.map((permission) => new URL(permission.replace(/\*$/, '')).origin),
    );
    expect(policy).toContain(
      `connect-src 'self' ${PROVIDER_ORIGINS.join(' ')} ${new URL(OFFICE_JS_URL).origin}`,
    );
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("style-src 'self'; style-src-attr 'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toMatch(/script-src[^;]*unsafe/);
    expect(contentSecurityPolicy({ dev: true })).toContain('wss://localhost:3000');
  });

  it("serves the release build from the helper app's fixed local origin", () => {
    expect(HELPER_ORIGIN).toBe('https://localhost:41537');
    expect(HELPER_ORIGIN).not.toBe(DEV_ORIGIN);
  });
});

describe('Outlook add-in storage', () => {
  it("keeps every value under Office's partition key, apart from other pages of the origin", async () => {
    localStorage.clear();
    const partitioned = createLocalStorageArea('partition-1');
    await partitioned.set({ settings: { theme: 'dark' } });

    expect(localStorage.getItem('partition-1:writehand:settings')).toBe('{"theme":"dark"}');
    expect(await createLocalStorageArea(undefined).get('settings')).toEqual({});
    expect(await partitioned.get('settings')).toEqual({ settings: { theme: 'dark' } });
    expect(keyDatabaseName('partition-1')).toBe('writehand-vault:partition-1');
    expect(keyDatabaseName(undefined)).toBe('writehand-vault');
  });

  it('treats an unreadable value as missing', async () => {
    localStorage.setItem('writehand:aiConnection', '{broken');
    expect(await createLocalStorageArea(undefined).get('aiConnection')).toEqual({});
  });
});
