import type { EncryptionKeyStore } from './secret-vault';

/** The extension's database; the Outlook add-in adds Office's partition key to the name. */
export const KEY_DATABASE = 'writehand-vault';
const STORE = 'keys';
const KEY_ID = 'secrets';

function openDatabase(factory: IDBFactory, database: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'));
  });
}

async function transact<T>(
  factory: IDBFactory,
  name: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase(factory, name);
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    });
  } finally {
    database.close();
  }
}

/**
 * The vault's key in the IndexedDB of the page's origin: the extension's, which belongs to the
 * background and the extension's pages only, or the add-in's own hosting origin. A `CryptoKey`
 * is stored as itself, so it stays non-extractable.
 */
export function createIndexedDbKeyStore(
  factory: IDBFactory = indexedDB,
  database: string = KEY_DATABASE,
): EncryptionKeyStore {
  const load = async (): Promise<CryptoKey | null> => {
    const value: unknown = await transact(factory, database, 'readonly', (store) => store.get(KEY_ID));
    return value instanceof CryptoKey ? value : null;
  };
  return {
    load,
    async saveIfAbsent(key) {
      try {
        await transact(factory, database, 'readwrite', (store) => store.add(key, KEY_ID));
        return key;
      } catch (caught) {
        // `add` refuses to replace a key another context stored first; that one is kept.
        const existing = await load();
        if (existing === null) throw caught;
        return existing;
      }
    },
  };
}
