import {
  connectionService,
  createAiConnection,
  createAiConnectionStore,
  createApiKeyConnection,
  createDirectProcessor,
  createUnavailableHelper,
  MAX_RUNNING_GENERATIONS,
  SECRETS_STORAGE_KEY,
  type ApiKeyProvider,
  type HelperClient,
} from '@writehand/ai-connection';
import { appError, err, ok, type AiInput, type ApiProvider, type PreparedAction } from '@writehand/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  fakeHelper,
  fakeProvider,
  GROQ_MODELS,
  helperStatus,
  memoryArea,
  memoryKeys,
  OPENAI_MODELS,
  vault,
} from '../extension/fake-ai';

const input: AiInput = {
  operation: 'revise',
  source: 'Merhaba, toplantı perşembe olsun mu?',
  instruction: '',
  targetLanguage: null,
  tone: 'neutral',
  standingInstructions: '',
  format: 'plain',
  refinement: null,
  messages: [],
};

function setup(options: { timeoutMs?: number; groq?: ApiKeyProvider; helper?: HelperClient } = {}) {
  const area = memoryArea();
  const store = createAiConnectionStore(area);
  const providers = {
    groq: options.groq ?? fakeProvider(GROQ_MODELS, 'openai/gpt-oss-120b'),
    openrouter: fakeProvider([{ id: 'vendor/free:free', label: 'Free', free: true }], null),
    openai: fakeProvider(OPENAI_MODELS, null),
  } satisfies Record<ApiProvider, ApiKeyProvider>;
  const connection = createAiConnection({
    store,
    helper: options.helper ?? createUnavailableHelper(),
    apiKeys: createApiKeyConnection({
      store,
      vault: vault(area, memoryKeys()),
      providers,
      access: async () => true,
    }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  return { area, providers, service: connectionService(connection) };
}

describe('AI service of a page without the helper app', () => {
  it('reports the API key method, not ready until a key is connected', async () => {
    const { service } = setup();
    expect(await service.status()).toMatchObject({
      mode: 'api-key',
      ready: false,
      helper: null,
      error: null,
    });
  });

  it('connects a key after the provider accepted it, keeps only ciphertext and never reports the key', async () => {
    const { area, service } = setup();
    const result = await service.command({
      action: 'save-api-key',
      provider: 'groq',
      apiKey: 'good-key-123',
    });

    expect(result.ok && result.value).toMatchObject({
      ready: true,
      apiKey: { savedKeys: ['groq'], selectedModel: 'openai/gpt-oss-120b' },
    });
    expect(JSON.stringify(area.data)).not.toContain('good-key-123');
    expect(area.data[SECRETS_STORAGE_KEY]).toBeDefined();
    expect(JSON.stringify(await service.status())).not.toContain('good-key-123');
  });

  it('keeps a plan choice without the helper app, but is not ready and cannot generate with it', async () => {
    const { service } = setup();
    expect((await service.command({ action: 'set-mode', mode: 'chatgpt' })).ok).toBe(true);
    expect(await service.status()).toMatchObject({ mode: 'chatgpt', ready: false, helper: null });
    expect(await service.generate(input)).toEqual(err(appError('AI_HOST_UNAVAILABLE')));
  });

  it('generates with the saved key and model', async () => {
    const { providers, service } = setup();
    await service.command({ action: 'save-api-key', provider: 'groq', apiKey: 'good-key-123' });

    expect(await service.generate(input)).toEqual(ok({ text: 'Written with openai/gpt-oss-120b' }));
    expect(providers.groq.generate).toHaveBeenCalledWith(
      input,
      'openai/gpt-oss-120b',
      'good-key-123',
      expect.any(AbortSignal),
    );
  });

  it('stops a generation at the time limit and when the caller cancels', async () => {
    const waitForAbort = vi.fn<ApiKeyProvider['generate']>(
      (_input, _model, _key, signal) =>
        new Promise((resolve) =>
          signal.addEventListener('abort', () => resolve(err(appError('READ_CANCELLED')))),
        ),
    );
    const { service } = setup({
      timeoutMs: 10,
      groq: { ...fakeProvider(GROQ_MODELS, 'openai/gpt-oss-120b'), generate: waitForAbort },
    });
    await service.command({ action: 'save-api-key', provider: 'groq', apiKey: 'good-key-123' });

    expect(await service.generate(input)).toEqual(err(appError('READ_CANCELLED')));

    const cancelled = new AbortController();
    cancelled.abort();
    expect(await service.generate(input, cancelled.signal)).toEqual(err(appError('READ_CANCELLED')));
  });

  it('runs at most four generations at once', async () => {
    const pending: (() => void)[] = [];
    const slow = vi.fn<ApiKeyProvider['generate']>(
      () => new Promise((resolve) => pending.push(() => resolve(ok('done')))),
    );
    const { service } = setup({
      groq: { ...fakeProvider(GROQ_MODELS, 'openai/gpt-oss-120b'), generate: slow },
    });
    await service.command({ action: 'save-api-key', provider: 'groq', apiKey: 'good-key-123' });

    const running = Array.from({ length: MAX_RUNNING_GENERATIONS }, () => service.generate(input));
    await vi.waitFor(() => expect(pending).toHaveLength(MAX_RUNNING_GENERATIONS));
    expect(await service.generate(input)).toEqual(err(appError('AI_BUSY')));
    for (const finish of pending) finish();
    await Promise.all(running);
  });

  it('turns a prepared action into a result for the same action, with the standing instructions', async () => {
    const { providers, service } = setup();
    await service.command({ action: 'save-api-key', provider: 'groq', apiKey: 'good-key-123' });
    const processor = createDirectProcessor(service, async () => ({
      standingInstructions: 'Always formal.',
    }));
    const action: PreparedAction = {
      requestId: 'r1',
      sessionId: 's1',
      formRevision: 3,
      operation: 'revise',
      source: { origin: 'panel', text: input.source },
      instruction: '',
      targetLanguage: null,
      tone: 'neutral',
      context: null,
      target: null,
      refinement: null,
      createdAt: '2026-10-23T10:00:00.000Z',
    };

    expect(await processor.process(action, { aborted: false })).toEqual(
      ok({
        requestId: 'r1',
        sessionId: 's1',
        formRevision: 3,
        text: 'Written with openai/gpt-oss-120b',
        sample: false,
      }),
    );
    expect(vi.mocked(providers.groq.generate).mock.calls[0]?.[0]).toMatchObject({
      standingInstructions: 'Always formal.',
    });
  });
});

describe('AI service of a page that reaches the helper app', () => {
  it("starts with the helper app's method and generates through it", async () => {
    const helper = fakeHelper(helperStatus({ mode: 'claude-code', ready: true }));
    const { service, providers } = setup({ helper: helper.client });

    expect(await service.status()).toMatchObject({ mode: 'claude-code', ready: true });
    expect(await service.generate(input)).toEqual(ok({ text: 'From the helper app' }));
    expect(providers.groq.generate).not.toHaveBeenCalled();
    const generation = helper.requests.find((request) => request.type === 'AI_GENERATE');
    expect(generation?.payload).toMatchObject({ input });
  });

  it("switches the helper app to this page's plan before it generates", async () => {
    const helper = fakeHelper(helperStatus({ mode: 'chatgpt', ready: true }));
    const { service } = setup({ helper: helper.client });

    await service.command({ action: 'set-mode', mode: 'claude-code' });
    helper.state.status = { ...helper.state.status!, mode: 'chatgpt' };
    await service.generate(input);

    const types = helper.requests.map((request) =>
      request.type === 'AI_COMMAND' ? `${request.type}:${request.payload.action}` : request.type,
    );
    expect(types.slice(-3)).toEqual(['AI_STATUS', 'AI_COMMAND:set-mode', 'AI_GENERATE']);
    expect(helper.state.status?.mode).toBe('claude-code');
  });

  it('asks the helper app to cancel a generation the caller cancels', async () => {
    const helper = fakeHelper(helperStatus({ mode: 'chatgpt', ready: true }));
    let finish: (() => void) | null = null;
    const slowClient: HelperClient = {
      ...helper.client,
      generate: (generationId, request) =>
        new Promise((resolve) => {
          finish = () => void helper.client.generate(generationId, request).then(resolve);
        }),
    };
    const { service } = setup({ helper: slowClient });
    const abort = new AbortController();

    const running = service.generate(input, abort.signal);
    await vi.waitFor(() => expect(finish).not.toBeNull());
    abort.abort();
    await vi.waitFor(() =>
      expect(helper.requests.some((request) => request.type === 'AI_CANCEL')).toBe(true),
    );
    finish!();
    await running;
  });
});
