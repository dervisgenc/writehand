import type { Clock, IdGenerator } from '@writehand/core';

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};

export function createRandomIds(): IdGenerator {
  return { next: () => crypto.randomUUID() };
}
