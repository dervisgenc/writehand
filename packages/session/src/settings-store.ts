import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  SITE_IDS,
  settingsChangesSchema,
  settingsSchema,
  settingsV1Schema,
  settingsV2Schema,
  settingsV3Schema,
  type Settings,
  type SettingsChanges,
  type StorageArea,
} from '@writehand/contracts';

export const SETTINGS_STORAGE_KEY = 'settings';

export type StoredSettingsIssue = 'missing' | 'invalid' | 'migrated' | 'newer-schema' | null;

export interface StoredSettings {
  readonly settings: Settings;
  readonly issue: StoredSettingsIssue;
  /** A record written with a newer schema is preserved intact and never overwritten. */
  readonly writable: boolean;
}

export type PatchSettingsResult =
  | { readonly status: 'saved'; readonly settings: Settings }
  /** The record changed in the meantime: only the requested fields were applied to the current record. */
  | { readonly status: 'conflict'; readonly settings: Settings }
  | { readonly status: 'read-only'; readonly settings: Settings };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The per-site switches the record has, site by site. A site the record does not know (one
 * added in a later version) gets its default, so a switch turned off earlier stays off.
 */
function salvageSiteEnabled(raw: unknown): Settings['siteEnabled'] {
  const siteEnabled = { ...DEFAULT_SETTINGS.siteEnabled };
  if (isRecord(raw)) {
    for (const site of SITE_IDS) {
      const value = raw[site];
      if (typeof value === 'boolean') siteEnabled[site] = value;
    }
  }
  return siteEnabled;
}

/** Recovers the valid fields from an invalid record and fills the rest with defaults. */
function salvage(raw: Record<string, unknown>): Settings {
  const recovered: Record<string, unknown> = { siteEnabled: salvageSiteEnabled(raw.siteEnabled) };
  for (const [key, field] of Object.entries(settingsChangesSchema.shape)) {
    if (key !== 'siteEnabled' && raw[key] !== undefined && field.safeParse(raw[key]).success) {
      recovered[key] = raw[key];
    }
  }
  const revision =
    typeof raw.revision === 'number' && Number.isInteger(raw.revision) && raw.revision > 0
      ? raw.revision
      : DEFAULT_SETTINGS.revision;
  const parsed = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...recovered, revision });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

/**
 * Reads and validates the stored record. An invalid record is handled with safe
 * defaults and a content-free issue code is returned. Storage is never wiped.
 */
export function parseStoredSettings(raw: unknown): StoredSettings {
  if (raw === undefined) {
    return { settings: DEFAULT_SETTINGS, issue: 'missing', writable: true };
  }
  if (!isRecord(raw)) {
    return { settings: DEFAULT_SETTINGS, issue: 'invalid', writable: true };
  }
  if (typeof raw.schemaVersion === 'number' && raw.schemaVersion > SETTINGS_SCHEMA_VERSION) {
    return { settings: DEFAULT_SETTINGS, issue: 'newer-schema', writable: false };
  }
  const parsed = settingsSchema.safeParse(raw);
  if (parsed.success) {
    return { settings: parsed.data, issue: null, writable: true };
  }
  if (
    [settingsV1Schema, settingsV2Schema, settingsV3Schema].some((schema) => schema.safeParse(raw).success)
  ) {
    // Every field of older versions is still valid in the current one; new fields get their defaults.
    return { settings: salvage(raw), issue: 'migrated', writable: true };
  }
  return { settings: salvage(raw), issue: 'invalid', writable: true };
}

/**
 * Applies changes to the current record field by field. If the client's known revision
 * is outdated, the record is not overwritten with the whole stale object; only the
 * requested fields are applied to the current record and the status is reported as `conflict`.
 */
export function applySettingsChanges(
  current: Settings,
  expectedRevision: number,
  changes: SettingsChanges,
): PatchSettingsResult {
  const next = settingsSchema.parse({
    ...current,
    ...changes,
    revision: current.revision + 1,
  });
  return { status: expectedRevision === current.revision ? 'saved' : 'conflict', settings: next };
}

export interface SettingsStore {
  read(): Promise<StoredSettings>;
  /** Writes are processed in order; success is returned only once storage completes. */
  patch(expectedRevision: number, changes: SettingsChanges): Promise<PatchSettingsResult>;
  /** On install, repairs a missing or corrupt record with defaults. */
  ensureInitialized(): Promise<StoredSettings>;
}

export function createSettingsStore(area: StorageArea): SettingsStore {
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };

  const read = async (): Promise<StoredSettings> => {
    const items = await area.get(SETTINGS_STORAGE_KEY);
    return parseStoredSettings(items[SETTINGS_STORAGE_KEY]);
  };

  return {
    read,

    patch(expectedRevision, changes) {
      return enqueue(async () => {
        const stored = await read();
        if (!stored.writable) {
          return { status: 'read-only', settings: stored.settings };
        }
        const result = applySettingsChanges(stored.settings, expectedRevision, changes);
        await area.set({ [SETTINGS_STORAGE_KEY]: result.settings });
        return result;
      });
    },

    ensureInitialized() {
      return enqueue(async () => {
        const stored = await read();
        if (stored.writable && stored.issue !== null) {
          await area.set({ [SETTINGS_STORAGE_KEY]: stored.settings });
        }
        return stored;
      });
    },
  };
}
