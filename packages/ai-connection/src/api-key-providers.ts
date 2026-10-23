import { createGroqProvider, createOpenRouterProvider } from '@writehand/ai-chat-completions';
import { createOpenAiApiKeyProvider } from '@writehand/ai-openai/api-key';
import type { ApiProvider } from '@writehand/contracts';

import type { ApiKeyProvider } from './api-key-connection';

/** Groq and OpenRouter speak OpenAI's Chat Completions; OpenAI keys use its Responses API. */
export function createApiKeyProviders(): Readonly<Record<ApiProvider, ApiKeyProvider>> {
  return {
    groq: createGroqProvider(),
    openrouter: createOpenRouterProvider(),
    openai: createOpenAiApiKeyProvider(),
  };
}
