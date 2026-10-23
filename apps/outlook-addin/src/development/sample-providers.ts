import type { ApiKeyProvider } from '@writehand/ai-connection';
import { appError, err, ok, type AiInput, type ApiProvider } from '@writehand/contracts';

/**
 * Local stand-ins for the AI providers, used only by the `localhost-sample` build for checks in a
 * real Outlook without an AI account: nothing leaves the computer, and every result is a labeled
 * sample derived from the input. The production and `localhost` builds do not contain this file.
 */
const MODEL = { id: 'sample-model', label: 'Sample model (no AI)' };

export const SAMPLE_TABLE = '| Day | Time |\n| --- | --- |\n| Thursday | 14:00 |\n| Friday | 10:00 |';

function sampleText(input: AiInput): string {
  if (input.refinement !== null) {
    return /table/i.test(input.refinement.instruction)
      ? `Sample schedule:\n\n${SAMPLE_TABLE}`
      : `${input.refinement.previous} (refined sample)`;
  }
  switch (input.operation) {
    case 'revise':
      return `${input.source} (revised sample)`;
    case 'translate':
      return `${input.source} (translated sample)`;
    case 'reply':
    case 'compose':
      return 'Sample text: thank you, Thursday at 14:00 works for me.';
  }
}

function sampleProvider(): ApiKeyProvider {
  return {
    listModels: async (apiKey) =>
      apiKey.trim().length >= 10 ? ok([MODEL]) : err(appError('AI_KEY_INVALID')),
    defaultModel: () => MODEL.id,
    async generate(input, _model, _key, signal) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (signal.aborted) return err(appError('READ_CANCELLED'));
      return ok(sampleText(input));
    },
  };
}

export function createSampleProviders(): Readonly<Record<ApiProvider, ApiKeyProvider>> {
  return { groq: sampleProvider(), openrouter: sampleProvider(), openai: sampleProvider() };
}
