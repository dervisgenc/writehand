/**
 * The narrow slice of key-value storage the settings and connection stores need: the
 * extension's `storage.local`, or the add-in's `localStorage` behind the same interface.
 */
export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}
