import {
  AI_MODES,
  API_PROVIDERS,
  DEFAULT_API_PROVIDER,
  type AiMode,
  type ApiProvider,
  type StorageArea,
} from '@writehand/contracts';
import { z } from 'zod';

export const AI_CONNECTION_STORAGE_KEY = 'aiConnection';

const preferencesSchema = z
  .object({
    version: z.literal(1),
    /** The method chosen in this browser profile or Outlook client; null until the user chooses one. */
    mode: z.enum(AI_MODES).nullable(),
    /** The provider of the API key method. */
    provider: z.enum(API_PROVIDERS),
    /** The model chosen for each provider. */
    models: z.partialRecord(z.enum(API_PROVIDERS), z.string().min(1).max(256)),
  })
  .strict();

/** The connection choices of this browser profile or Outlook client. Secrets are kept in the vault, never here. */
export interface AiConnectionPreferences {
  readonly mode: AiMode | null;
  readonly provider: ApiProvider;
  readonly models: Readonly<Partial<Record<ApiProvider, string>>>;
}

export const DEFAULT_AI_CONNECTION: AiConnectionPreferences = Object.freeze({
  mode: null,
  provider: DEFAULT_API_PROVIDER,
  models: Object.freeze({}),
});

export interface AiConnectionStore {
  read(): Promise<AiConnectionPreferences>;
  /** Applies the fields `change` returns to the current record; changes run one at a time. */
  update(
    change: (current: AiConnectionPreferences) => Partial<AiConnectionPreferences>,
  ): Promise<AiConnectionPreferences>;
}

export function createAiConnectionStore(area: StorageArea): AiConnectionStore {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<AiConnectionPreferences> => {
    // An unreadable record means no choice was made; it is replaced on the next change.
    const parsed = preferencesSchema.safeParse(
      (await area.get(AI_CONNECTION_STORAGE_KEY))[AI_CONNECTION_STORAGE_KEY],
    );
    return parsed.success
      ? { mode: parsed.data.mode, provider: parsed.data.provider, models: parsed.data.models }
      : DEFAULT_AI_CONNECTION;
  };
  return {
    read,
    update(change) {
      const run = queue.then(async () => {
        const current = await read();
        const next = { ...current, ...change(current) };
        await area.set({ [AI_CONNECTION_STORAGE_KEY]: preferencesSchema.parse({ version: 1, ...next }) });
        return next;
      });
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
