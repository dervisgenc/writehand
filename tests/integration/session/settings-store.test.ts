import { DEFAULT_SETTINGS, type StorageArea } from '@writehand/contracts';
import {
  applySettingsChanges,
  createSettingsStore,
  parseStoredSettings,
  SETTINGS_STORAGE_KEY,
} from '@writehand/session';
import { describe, expect, it } from 'vitest';

function memoryArea(initial: Record<string, unknown> = {}): StorageArea & { data: Record<string, unknown> } {
  const data = { ...initial };
  return {
    data,
    get: async (key) => (key in data ? { [key]: data[key] } : {}),
    set: async (items) => {
      Object.assign(data, items);
    },
  };
}

describe('Settings store', () => {
  it('fills a missing record with defaults', () => {
    expect(parseStoredSettings(undefined)).toEqual({
      settings: DEFAULT_SETTINGS,
      issue: 'missing',
      writable: true,
    });
  });

  it('recovers the valid fields from an invalid record and returns an issue code without content', () => {
    const result = parseStoredSettings({
      schemaVersion: 1,
      revision: 4,
      uiLanguage: 'en',
      tone: 'bağırarak',
      extra: 'x',
    });
    expect(result.issue).toBe('invalid');
    expect(result.settings).toMatchObject({ uiLanguage: 'en', tone: 'neutral', revision: 4 });
  });

  it('migrates a version 1 record to the current version, keeping choices and filling new fields with defaults', async () => {
    const v1 = {
      schemaVersion: 1,
      revision: 7,
      uiLanguage: 'en',
      targetLanguage: 'de',
      tone: 'formal',
      theme: 'dark',
      siteEnabled: { 'outlook-web': false },
      onboardingSeen: true,
    };
    const area = memoryArea({ [SETTINGS_STORAGE_KEY]: v1 });
    const stored = await createSettingsStore(area).ensureInitialized();

    expect(stored.issue).toBe('migrated');
    expect(stored.settings).toEqual({
      ...v1,
      schemaVersion: 4,
      favoriteLanguages: ['en', 'tr', 'de', 'fr', 'es'],
      writingInstructions: '',
      checkHelperUpdates: true,
      // Outlook stays off; Gmail, which version 1 did not know, gets its default.
      siteEnabled: { 'outlook-web': false, 'gmail-web': true },
    });
    expect(area.data[SETTINGS_STORAGE_KEY]).toEqual(stored.settings);
  });

  it('adds the update check preference, turned on, to a version 2 record', async () => {
    const { checkHelperUpdates: _added, ...v2 } = {
      ...DEFAULT_SETTINGS,
      schemaVersion: 2,
      revision: 4,
      tone: 'formal',
      siteEnabled: { 'outlook-web': true },
    };
    const area = memoryArea({ [SETTINGS_STORAGE_KEY]: v2 });
    const stored = await createSettingsStore(area).ensureInitialized();

    expect(stored.issue).toBe('migrated');
    expect(stored.settings).toEqual({
      ...v2,
      schemaVersion: 4,
      checkHelperUpdates: true,
      siteEnabled: DEFAULT_SETTINGS.siteEnabled,
    });
  });

  it('adds the Gmail switch, turned on, to a version 3 record and keeps the Outlook switch', async () => {
    const v3 = { ...DEFAULT_SETTINGS, schemaVersion: 3, revision: 6, siteEnabled: { 'outlook-web': false } };
    const area = memoryArea({ [SETTINGS_STORAGE_KEY]: v3 });
    const stored = await createSettingsStore(area).ensureInitialized();

    expect(stored.issue).toBe('migrated');
    expect(stored.settings).toEqual({
      ...v3,
      schemaVersion: 4,
      siteEnabled: { 'outlook-web': false, 'gmail-web': true },
    });
    expect(area.data[SETTINGS_STORAGE_KEY]).toEqual(stored.settings);
  });

  it('keeps standing instructions and favorite languages within their limits, and accepts a hand-typed language name', () => {
    const current = { ...DEFAULT_SETTINGS, revision: 2 };
    expect(
      applySettingsChanges(current, 2, { favoriteLanguages: ['en', 'Kurmancî'] }).settings.favoriteLanguages,
    ).toEqual(['en', 'Kurmancî']);
    expect(() => applySettingsChanges(current, 2, { writingInstructions: 'x'.repeat(1001) })).toThrow();
    expect(() => applySettingsChanges(current, 2, { favoriteLanguages: ['en', 'en'] })).toThrow();
    expect(() => applySettingsChanges(current, 2, { targetLanguage: 'line\nbreak' })).toThrow();
  });

  it('leaves a record written with a newer schema intact', async () => {
    const future = { schemaVersion: 5, revision: 9, somethingNew: true };
    const area = memoryArea({ [SETTINGS_STORAGE_KEY]: future });
    const store = createSettingsStore(area);

    expect((await store.patch(9, { tone: 'formal' })).status).toBe('read-only');
    expect(area.data[SETTINGS_STORAGE_KEY]).toBe(future);
  });

  it('does not overwrite with the whole stale object when a change arrives for an old revision', () => {
    const current = { ...DEFAULT_SETTINGS, revision: 5, theme: 'dark' as const };
    const result = applySettingsChanges(current, 3, { tone: 'formal' });

    expect(result.status).toBe('conflict');
    expect(result.settings).toMatchObject({ theme: 'dark', tone: 'formal', revision: 6 });
  });

  it('processes write requests in order', async () => {
    const area = memoryArea();
    const store = createSettingsStore(area);
    const [first, second] = await Promise.all([
      store.patch(1, { tone: 'formal' }),
      store.patch(1, { theme: 'dark' }),
    ]);

    expect(first.status).toBe('saved');
    expect(second.status).toBe('conflict');
    expect(area.data[SETTINGS_STORAGE_KEY]).toMatchObject({ tone: 'formal', theme: 'dark', revision: 3 });
  });
});
