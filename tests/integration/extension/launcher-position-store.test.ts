import type { StorageArea } from '@writehand/contracts';
import { describe, expect, it } from 'vitest';

import {
  createLauncherPositionStore,
  LAUNCHER_POSITIONS_STORAGE_KEY,
} from '../../../apps/browser-extension/src/platform/launcher-position-store';

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

describe('Conversation button position', () => {
  it('remembers where the button was dragged, separately for each mail service', async () => {
    const area = memoryArea();
    const gmail = createLauncherPositionStore(area, 'gmail-web');
    const outlook = createLauncherPositionStore(area, 'outlook-web');

    await gmail.save({ dx: -120.4, dy: 300.6 });
    expect(await gmail.load()).toEqual({ dx: -120, dy: 301 });
    expect(await outlook.load()).toBeNull();

    await outlook.save({ dx: 10, dy: 20 });
    expect(area.data[LAUNCHER_POSITIONS_STORAGE_KEY]).toEqual({
      version: 1,
      thread: { 'gmail-web': { dx: -120, dy: 301 }, 'outlook-web': { dx: 10, dy: 20 } },
    });
  });

  it('forgets the place when the button goes back to its default place, and ignores a damaged record', async () => {
    const area = memoryArea({ [LAUNCHER_POSITIONS_STORAGE_KEY]: { version: 9, thread: 'x' } });
    const gmail = createLauncherPositionStore(area, 'gmail-web');
    expect(await gmail.load()).toBeNull();

    await gmail.save({ dx: 5, dy: 5 });
    await gmail.save(null);
    expect(await gmail.load()).toBeNull();
    expect(area.data[LAUNCHER_POSITIONS_STORAGE_KEY]).toEqual({ version: 1, thread: {} });
  });
});
