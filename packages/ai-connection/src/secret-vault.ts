import type { StorageArea } from '@writehand/contracts';
import { z } from 'zod';

export const SECRETS_STORAGE_KEY = 'secrets';

/**
 * Keeps the vault's encryption key. The key is a non-extractable AES-GCM key in the
 * extension's own IndexedDB: web pages and content scripts cannot open that database, and no
 * script can export the key's bytes.
 */
export interface EncryptionKeyStore {
  load(): Promise<CryptoKey | null>;
  /** Stores `key` unless a key exists already, and returns the stored one. */
  saveIfAbsent(key: CryptoKey): Promise<CryptoKey>;
}

/**
 * Secrets (API keys) at rest. Only the background uses the vault; it never returns a secret to
 * a page. `storage.local`, which content scripts can read, holds only ciphertext.
 */
export interface SecretVault {
  /** Names that have a saved secret; reads no secret. */
  names(): Promise<string[]>;
  read(name: string): Promise<string | null>;
  write(name: string, secret: string): Promise<void>;
  remove(name: string): Promise<void>;
}

const entrySchema = z.object({ iv: z.string().min(1), data: z.string().min(1) }).strict();
const recordSchema = z.object({ version: z.literal(1), entries: z.record(z.string(), entrySchema) }).strict();
type SecretsRecord = z.infer<typeof recordSchema>;

const ALGORITHM = 'AES-GCM';
const IV_BYTES = 12;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (character) => character.charCodeAt(0));

export function createSecretVault(deps: {
  area: StorageArea;
  keys: EncryptionKeyStore;
  subtle?: SubtleCrypto;
}): SecretVault {
  const subtle = deps.subtle ?? crypto.subtle;
  const encoder = new TextEncoder();
  let key: Promise<CryptoKey> | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  /** One key per profile; a failed lookup is tried again on the next use. */
  const encryptionKey = (): Promise<CryptoKey> => {
    key ??= (async () => {
      const stored = await deps.keys.load();
      if (stored !== null) return stored;
      const created = await subtle.generateKey({ name: ALGORITHM, length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]);
      return deps.keys.saveIfAbsent(created);
    })().catch((caught: unknown) => {
      key = null;
      throw caught;
    });
    return key;
  };

  const readRecord = async (): Promise<SecretsRecord> => {
    const parsed = recordSchema.safeParse((await deps.area.get(SECRETS_STORAGE_KEY))[SECRETS_STORAGE_KEY]);
    return parsed.success ? parsed.data : { version: 1, entries: {} };
  };

  /** Read-modify-write steps run one at a time. */
  const change = <T>(operation: (record: SecretsRecord) => Promise<T>): Promise<T> => {
    const run = queue.then(async () => {
      const record = await readRecord();
      const result = await operation(record);
      await deps.area.set({ [SECRETS_STORAGE_KEY]: record });
      return result;
    });
    queue = run.catch(() => undefined);
    return run;
  };

  return {
    async names() {
      return Object.keys((await readRecord()).entries);
    },

    async read(name) {
      const entry = (await readRecord()).entries[name];
      if (entry === undefined) return null;
      const cryptoKey = await encryptionKey();
      try {
        const plain = await subtle.decrypt(
          { name: ALGORITHM, iv: fromBase64(entry.iv), additionalData: encoder.encode(name) },
          cryptoKey,
          fromBase64(entry.data),
        );
        return new TextDecoder().decode(plain);
      } catch {
        // Encrypted with a key that no longer exists (site data was cleared) or altered: it can
        // never be read again, so it is removed and the user connects the key again.
        await change(async (record) => {
          // Unless a new secret was saved under the name in the meantime.
          if (record.entries[name]?.data === entry.data) delete record.entries[name];
        });
        return null;
      }
    },

    write(name, secret) {
      return change(async (record) => {
        const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
        // The name is authenticated with the data, so an entry cannot be moved to another name.
        const data = await subtle.encrypt(
          { name: ALGORITHM, iv, additionalData: encoder.encode(name) },
          await encryptionKey(),
          encoder.encode(secret),
        );
        record.entries[name] = { iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
      });
    },

    remove(name) {
      return change(async (record) => {
        delete record.entries[name];
      });
    },
  };
}
