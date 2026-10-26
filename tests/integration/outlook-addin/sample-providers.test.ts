import type { AiInput } from '@writehand/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSampleProviders,
  SAMPLE_TABLE,
} from '../../../apps/outlook-addin/src/development/sample-providers';

const KEY = 'gsk_writehand-sample-0001';
const notAborted = new AbortController().signal;

function input(changes: Partial<AiInput>): AiInput {
  return {
    operation: 'revise',
    source: '',
    instruction: '',
    targetLanguage: null,
    tone: 'neutral',
    standingInstructions: '',
    format: 'rich',
    refinement: null,
    messages: [],
    ...changes,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the sample build providers', () => {
  it('offer one sample model for any key of a plausible length and refuse a short one', async () => {
    const { groq } = createSampleProviders();
    const models = await groq.listModels(KEY);
    expect(models.ok && models.value.map((model) => model.id)).toEqual(['sample-model']);
    const short = await groq.listModels('gsk_1');
    expect(!short.ok && short.error.code).toBe('AI_KEY_INVALID');
  });

  it('label every result as a sample of its input and make no request', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { openai } = createSampleProviders();
    const generate = async (changes: Partial<AiInput>) => {
      const result = await openai.generate(input(changes), 'sample-model', KEY, notAborted);
      return result.ok ? result.value : result.error.code;
    };

    expect(await generate({ source: 'See you on Friday.' })).toBe('See you on Friday. (revised sample)');
    expect(await generate({ operation: 'translate', source: 'Merhaba', targetLanguage: 'en' })).toBe(
      'Merhaba (translated sample)',
    );
    expect(await generate({ operation: 'compose', instruction: 'Confirm Thursday' })).toMatch(
      /^Sample text:/,
    );
    expect(
      await generate({ refinement: { instruction: 'Make it a table', previous: 'Thursday, Friday' } }),
    ).toBe(`Sample schedule:\n\n${SAMPLE_TABLE}`);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stop on cancel', async () => {
    const { groq } = createSampleProviders();
    const cancel = new AbortController();
    cancel.abort();
    const result = await groq.generate(input({ source: 'Hello' }), 'sample-model', KEY, cancel.signal);
    expect(!result.ok && result.error.code).toBe('READ_CANCELLED');
  });
});
