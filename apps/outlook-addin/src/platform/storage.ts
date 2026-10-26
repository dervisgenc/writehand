import { KEY_DATABASE } from '@writehand/ai-connection';
import type { StorageArea } from '@writehand/contracts';

/**
 * Settings, connection choices and the encrypted key live in the add-in origin's
 * `localStorage`, under Office's partition key where there is one. Nothing is kept in the
 * mailbox: roaming settings "shouldn't be used to store sensitive information".
 */
export function createLocalStorageArea(
  partitionKey: string | undefined,
  storage: Storage = localStorage,
): StorageArea {
  const prefix = `${partitionKey === undefined ? '' : `${partitionKey}:`}writehand:`;
  return {
    async get(key) {
      const raw = storage.getItem(prefix + key);
      if (raw === null) return {};
      try {
        return { [key]: JSON.parse(raw) as unknown };
      } catch {
        // An unreadable value counts as missing; the stores replace it on their next write.
        return {};
      }
    },
    async set(items) {
      for (const [key, value] of Object.entries(items)) storage.setItem(prefix + key, JSON.stringify(value));
    },
  };
}

/** The key store's IndexedDB database, under the same partition key. */
export function keyDatabaseName(partitionKey: string | undefined): string {
  return partitionKey === undefined ? KEY_DATABASE : `${KEY_DATABASE}:${partitionKey}`;
}

/** Another pane of this add-in changed a stored value (for example the settings). */
export function onStorageChanged(
  partitionKey: string | undefined,
  key: string,
  listener: () => void,
): () => void {
  const name = `${partitionKey === undefined ? '' : `${partitionKey}:`}writehand:${key}`;
  const handle = (event: StorageEvent) => {
    if (event.key === name) listener();
  };
  window.addEventListener('storage', handle);
  return () => window.removeEventListener('storage', handle);
}
