import { SITE_IDS, type SiteId, type StorageArea } from '@writehand/contracts';
import { z } from 'zod';

export const LAUNCHER_POSITIONS_STORAGE_KEY = 'launcherPositions';

/** How far the user moved a button from its default place, in CSS pixels. */
export interface LauncherOffset {
  readonly dx: number;
  readonly dy: number;
}

const offsetSchema = z
  .object({
    dx: z.number().finite().min(-10_000).max(10_000),
    dy: z.number().finite().min(-10_000).max(10_000),
  })
  .strict();

const recordSchema = z
  .object({
    version: z.literal(1),
    /** The conversation button's offset per mail service. */
    thread: z.partialRecord(z.enum(SITE_IDS), offsetSchema),
  })
  .strict();

type PositionsRecord = z.infer<typeof recordSchema>;

/** Where the user put the conversation button on one mail service. A UI preference; no mail content. */
export interface LauncherPositionStore {
  load(): Promise<LauncherOffset | null>;
  /** `null` puts the button back in its default place. */
  save(offset: LauncherOffset | null): Promise<void>;
}

export function createLauncherPositionStore(area: StorageArea, site: SiteId): LauncherPositionStore {
  const read = async (): Promise<PositionsRecord> => {
    // An unreadable record means no button was moved; it is replaced on the next move.
    const parsed = recordSchema.safeParse(
      (await area.get(LAUNCHER_POSITIONS_STORAGE_KEY))[LAUNCHER_POSITIONS_STORAGE_KEY],
    );
    return parsed.success ? parsed.data : { version: 1, thread: {} };
  };
  let queue: Promise<unknown> = Promise.resolve();
  return {
    async load() {
      return (await read()).thread[site] ?? null;
    },
    save(offset) {
      const run = queue.then(async () => {
        const record = await read();
        const { [site]: _previous, ...others } = record.thread;
        const thread =
          offset === null
            ? others
            : { ...others, [site]: { dx: Math.round(offset.dx), dy: Math.round(offset.dy) } };
        await area.set({ [LAUNCHER_POSITIONS_STORAGE_KEY]: recordSchema.parse({ version: 1, thread }) });
      });
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
