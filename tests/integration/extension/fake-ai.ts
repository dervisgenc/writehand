import { webcrypto } from 'node:crypto';

import {
  createAiConnection,
  createAiConnectionStore,
  createApiKeyConnection,
  createHelperClient,
  createSecretVault,
  type ApiKeyProvider,
  type EncryptionKeyStore,
} from '@writehand/ai-connection';
import {
  appError,
  err,
  ok,
  PROTOCOL_VERSION,
  type AiModel,
  type ApiProvider,
  type HelperStatus,
  type HostRequest,
  type StorageArea,
} from '@writehand/contracts';
import { vi } from 'vitest';

/** `storage.local` in memory; values are cloned like the browser does. */
export function memoryArea(): StorageArea & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  return {
    data,
    get: async (key) => (key in data ? { [key]: structuredClone(data[key]) } : {}),
    set: async (items) => {
      Object.assign(data, structuredClone(items));
    },
  };
}

/** The vault's IndexedDB key store in memory. */
export function memoryKeys(): EncryptionKeyStore {
  let stored: CryptoKey | null = null;
  return {
    load: async () => stored,
    saveIfAbsent: async (key) => (stored ??= key),
  };
}

export const vault = (area: StorageArea, keys: EncryptionKeyStore = memoryKeys()) =>
  createSecretVault({ area, keys, subtle: webcrypto.subtle as SubtleCrypto });

export const helperStatus = (changes: Partial<HelperStatus> = {}): HelperStatus => ({
  mode: 'chatgpt',
  accounts: [],
  activeAccountId: null,
  models: [],
  selectedModel: null,
  ready: false,
  signingIn: false,
  needsPlanAcknowledgement: false,
  claudeCode: null,
  error: null,
  ...changes,
});

/**
 * The helper app at the end of native messaging. `status` null means it is not installed:
 * every request fails the way the native client reports a missing host.
 */
export function fakeHelper(initial: HelperStatus | null = null) {
  const state = { status: initial };
  const requests: HostRequest[] = [];
  const send = async (request: HostRequest): Promise<unknown> => {
    requests.push(request);
    const base = { protocolVersion: PROTOCOL_VERSION, requestId: request.requestId };
    if (state.status === null) return { ...base, ok: false, error: { code: 'AI_HOST_UNAVAILABLE' } };
    let payload: unknown = state.status;
    if (request.type === 'AI_COMMAND' && request.payload.action === 'set-mode') {
      if (state.status.signingIn) return { ...base, ok: false, error: { code: 'AI_BUSY' } };
      state.status = { ...state.status, mode: request.payload.mode };
      payload = state.status;
    }
    if (request.type === 'AI_GENERATE') payload = { text: 'From the helper app' };
    if (request.type === 'AI_CANCEL') payload = { cancelled: true };
    return { ...base, ok: true, payload: structuredClone(payload) };
  };
  return { state, requests, client: createHelperClient(send) };
}

export const GROQ_MODELS: AiModel[] = [
  { id: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile' },
  { id: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b' },
];
export const OPENAI_MODELS: AiModel[] = [{ id: 'gpt-test', label: 'gpt-test' }];

/** A provider that accepts only keys starting with `good` and names the model it wrote with. */
export function fakeProvider(models: AiModel[], defaultModel: string | null) {
  return {
    listModels: vi.fn<ApiKeyProvider['listModels']>(async (apiKey) =>
      apiKey.startsWith('good') ? ok(models) : err(appError('AI_KEY_INVALID')),
    ),
    defaultModel: vi.fn<ApiKeyProvider['defaultModel']>(() => defaultModel),
    generate: vi.fn<ApiKeyProvider['generate']>(async (_input, model) => ok(`Written with ${model}`)),
  };
}

export function createTestConnection(options: { helper?: HelperStatus | null } = {}) {
  const area = memoryArea();
  const keys = memoryKeys();
  const helper = fakeHelper(options.helper ?? null);
  const providers = {
    groq: fakeProvider(GROQ_MODELS, 'openai/gpt-oss-120b'),
    openrouter: fakeProvider([{ id: 'vendor/free:free', label: 'Free', free: true }], null),
    openai: fakeProvider(OPENAI_MODELS, null),
  } satisfies Record<ApiProvider, ApiKeyProvider>;
  const granted = new Set<ApiProvider>(['groq', 'openrouter', 'openai']);
  const store = createAiConnectionStore(area);
  const connection = createAiConnection({
    store,
    helper: helper.client,
    apiKeys: createApiKeyConnection({
      store,
      vault: vault(area, keys),
      providers,
      access: async (provider) => granted.has(provider),
    }),
  });
  return { area, keys, helper, providers, granted, connection };
}
