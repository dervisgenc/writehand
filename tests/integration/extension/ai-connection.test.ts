import { AI_CONNECTION_STORAGE_KEY, SECRETS_STORAGE_KEY } from '@writehand/ai-connection';
import { appError, err, type AiInput } from '@writehand/contracts';
import { describe, expect, it, vi } from 'vitest';

import { createTestConnection, helperStatus, memoryArea, memoryKeys, vault } from './fake-ai';

const input: AiInput = {
  operation: 'revise',
  source: 'text',
  instruction: '',
  tone: 'neutral',
  targetLanguage: null,
  standingInstructions: '',
  format: 'rich',
  refinement: null,
  messages: [],
};
const KEY = 'good-groq-secret-0123456789';
const generationId = () => crypto.randomUUID();

describe('Secret vault', () => {
  it('keeps only ciphertext in extension storage and reads the secret back', async () => {
    const area = memoryArea();
    const secrets = vault(area);
    await secrets.write('groq', KEY);
    expect(JSON.stringify(area.data)).not.toContain(KEY);
    expect(await secrets.names()).toEqual(['groq']);
    expect(await secrets.read('groq')).toBe(KEY);
    await secrets.remove('groq');
    expect(await secrets.read('groq')).toBeNull();
  });

  it('binds each secret to its name, so a moved entry cannot be read', async () => {
    const area = memoryArea();
    const secrets = vault(area);
    await secrets.write('groq', KEY);
    const record = area.data[SECRETS_STORAGE_KEY] as { entries: Record<string, unknown> };
    record.entries.openai = record.entries.groq;
    expect(await secrets.read('openai')).toBeNull();
    // An entry that can never be read is removed; the other one is untouched.
    expect(await secrets.names()).toEqual(['groq']);
    expect(await secrets.read('groq')).toBe(KEY);
  });

  it('forgets secrets whose encryption key is gone, for example after site data was cleared', async () => {
    const area = memoryArea();
    await vault(area).write('groq', KEY);
    const afterClearing = vault(area, memoryKeys());
    expect(await afterClearing.read('groq')).toBeNull();
    expect(await afterClearing.names()).toEqual([]);
  });

  it('uses one encryption key for secrets written at the same time', async () => {
    const area = memoryArea();
    const secrets = vault(area);
    await Promise.all([secrets.write('groq', 'first-secret'), secrets.write('openai', 'second-secret')]);
    expect(await secrets.read('groq')).toBe('first-secret');
    expect(await secrets.read('openai')).toBe('second-secret');
  });
});

describe('API key method', () => {
  it('saves a key only after the provider accepted it, selects the free model and never reports the key', async () => {
    const { connection, providers, area, helper } = createTestConnection();
    const saved = await connection.command({ action: 'save-api-key', provider: 'groq', apiKey: KEY });
    expect(saved).toMatchObject({
      ok: true,
      value: {
        mode: 'api-key',
        ready: true,
        error: null,
        apiKey: {
          provider: 'groq',
          savedKeys: ['groq'],
          access: true,
          selectedModel: 'openai/gpt-oss-120b',
        },
      },
    });
    expect(providers.groq.listModels).toHaveBeenCalledWith(KEY);
    expect(JSON.stringify(saved)).not.toContain(KEY);
    expect(JSON.stringify(area.data)).not.toContain(KEY);
    // The method works without the helper app: it is asked nothing beyond its status.
    expect(helper.requests.map((request) => request.type)).not.toContain('AI_COMMAND');
  });

  it('keeps nothing when the provider refuses the key or the browser denies access to it', async () => {
    const { connection, providers, granted } = createTestConnection();
    expect(
      await connection.command({ action: 'save-api-key', provider: 'groq', apiKey: 'bad-key-0123456789' }),
    ).toEqual({ ok: false, error: { code: 'AI_KEY_INVALID' } });
    granted.delete('openai');
    expect(await connection.command({ action: 'save-api-key', provider: 'openai', apiKey: KEY })).toEqual({
      ok: false,
      error: { code: 'AI_PROVIDER_ACCESS_REQUIRED' },
    });
    expect(providers.openai.listModels).not.toHaveBeenCalled();
    expect((await connection.status()).apiKey.savedKeys).toEqual([]);
  });

  it('generates with the saved key and model without the helper app', async () => {
    const { connection, providers, helper } = createTestConnection();
    await connection.command({ action: 'save-api-key', provider: 'groq', apiKey: KEY });
    helper.requests.length = 0;
    expect(await connection.summary()).toEqual({
      mode: 'api-key',
      ready: true,
      selectedModel: 'openai/gpt-oss-120b',
      provider: 'groq',
    });
    expect(await connection.generate(generationId(), input)).toEqual({
      ok: true,
      value: { text: 'Written with openai/gpt-oss-120b' },
    });
    expect(providers.groq.generate).toHaveBeenCalledWith(
      input,
      'openai/gpt-oss-120b',
      KEY,
      expect.any(AbortSignal),
    );
    expect(helper.requests).toEqual([]);
  });

  it('needs an explicit model choice for a paid OpenAI key and accepts only listed models', async () => {
    const { connection } = createTestConnection();
    await connection.command({ action: 'save-api-key', provider: 'openai', apiKey: 'good-openai-key-0123' });
    const status = await connection.status();
    expect(status).toMatchObject({ ready: false, apiKey: { provider: 'openai', selectedModel: null } });
    expect(await connection.generate(generationId(), input)).toEqual({
      ok: false,
      error: { code: 'AI_MODEL_UNAVAILABLE' },
    });
    expect(await connection.command({ action: 'set-model', model: 'gpt-unknown' })).toEqual({
      ok: false,
      error: { code: 'AI_MODEL_UNAVAILABLE' },
    });
    expect(await connection.command({ action: 'set-model', model: 'gpt-test' })).toMatchObject({
      ok: true,
      value: { ready: true, apiKey: { selectedModel: 'gpt-test' } },
    });
  });

  it('keeps a key and model for each provider and forgets them when the key is removed', async () => {
    const { connection } = createTestConnection();
    await connection.command({ action: 'save-api-key', provider: 'groq', apiKey: KEY });
    await connection.command({ action: 'save-api-key', provider: 'openai', apiKey: 'good-openai-key-0123' });
    await connection.command({ action: 'select-api-provider', provider: 'groq' });
    expect((await connection.status()).apiKey).toMatchObject({
      provider: 'groq',
      savedKeys: ['groq', 'openai'],
      selectedModel: 'openai/gpt-oss-120b',
    });
    const removed = await connection.command({ action: 'remove-api-key', provider: 'groq' });
    expect(removed).toMatchObject({
      ok: true,
      value: { ready: false, apiKey: { savedKeys: ['openai'], selectedModel: null, models: [] } },
    });
    expect(await connection.generate(generationId(), input)).toEqual({
      ok: false,
      error: { code: 'AI_NOT_CONNECTED' },
    });
  });

  it('reports a provider permission removed in the browser settings instead of failing silently', async () => {
    const { connection, granted } = createTestConnection();
    await connection.command({ action: 'save-api-key', provider: 'groq', apiKey: KEY });
    granted.delete('groq');
    expect(await connection.status()).toMatchObject({ ready: false, apiKey: { access: false } });
    expect(await connection.generate(generationId(), input)).toEqual({
      ok: false,
      error: { code: 'AI_PROVIDER_ACCESS_REQUIRED' },
    });
  });

  it('cancels a running generation and frees its slot', async () => {
    const { connection, providers } = createTestConnection();
    await connection.command({ action: 'save-api-key', provider: 'groq', apiKey: KEY });
    providers.groq.generate.mockImplementationOnce(
      (_input, _model, _key, signal) =>
        new Promise((resolve) =>
          signal.addEventListener('abort', () => resolve(err(appError('READ_CANCELLED')))),
        ),
    );
    const id = generationId();
    const running = connection.generate(id, input);
    await vi.waitFor(() => expect(providers.groq.generate).toHaveBeenCalled());
    expect(await connection.cancel(id)).toEqual({ ok: true, value: { cancelled: true } });
    expect(await running).toEqual({ ok: false, error: { code: 'READ_CANCELLED' } });
    expect(await connection.cancel(id)).toEqual({ ok: true, value: { cancelled: false } });
  });
});

describe('Connection method', () => {
  it('starts with the API key method when the helper app is missing and shows no error for it', async () => {
    const { connection } = createTestConnection();
    expect(await connection.status()).toMatchObject({
      mode: 'api-key',
      helper: null,
      error: null,
      ready: false,
    });
  });

  it('starts with the installed helper app’s method before the user chooses one', async () => {
    const { connection } = createTestConnection({
      helper: helperStatus({ mode: 'claude-code', ready: true }),
    });
    expect(await connection.status()).toMatchObject({ mode: 'claude-code', ready: true });
  });

  it('keeps a helper app method chosen before the helper app is installed and applies it once it is', async () => {
    const { connection, helper } = createTestConnection();
    expect(await connection.command({ action: 'set-mode', mode: 'claude-code' })).toMatchObject({
      ok: true,
      value: { mode: 'claude-code', helper: null, error: null, ready: false },
    });
    // The helper app is installed with its default method.
    helper.state.status = helperStatus({ mode: 'chatgpt' });
    helper.requests.length = 0;
    expect(await connection.status()).toMatchObject({ mode: 'claude-code', helper: { mode: 'claude-code' } });
    expect(helper.requests.map((request) => request.type)).toEqual(['AI_STATUS', 'AI_COMMAND']);
  });

  it('switches the helper app to this browser’s method before generating with it', async () => {
    const { connection, helper } = createTestConnection({ helper: helperStatus({ mode: 'chatgpt' }) });
    await connection.command({ action: 'set-mode', mode: 'claude-code' });
    // Another browser on the same computer switched the helper app back.
    helper.state.status = helperStatus({ mode: 'chatgpt', ready: true });
    helper.requests.length = 0;
    expect(await connection.generate(generationId(), input)).toEqual({
      ok: true,
      value: { text: 'From the helper app' },
    });
    expect(helper.requests.map((request) => [request.type, request.payload])).toEqual([
      ['AI_STATUS', {}],
      ['AI_COMMAND', { action: 'set-mode', mode: 'claude-code' }],
      ['AI_GENERATE', expect.objectContaining({ input })],
    ]);
  });

  it('stops a generation cancelled before its request was sent, with either method', async () => {
    const { connection, helper, providers } = createTestConnection({ helper: helperStatus({ ready: true }) });
    await connection.command({ action: 'set-mode', mode: 'chatgpt' });
    helper.requests.length = 0;
    const id = generationId();
    const viaHelper = connection.generate(id, input);
    expect(await connection.cancel(id)).toEqual({ ok: true, value: { cancelled: true } });
    expect(await viaHelper).toEqual({ ok: false, error: { code: 'READ_CANCELLED' } });
    expect(helper.requests.map((request) => request.type)).toEqual(['AI_STATUS']);

    await connection.command({ action: 'save-api-key', provider: 'groq', apiKey: KEY });
    const other = generationId();
    const viaKey = connection.generate(other, input);
    await connection.cancel(other);
    expect(await viaKey).toEqual({ ok: false, error: { code: 'READ_CANCELLED' } });
    expect(providers.groq.generate).not.toHaveBeenCalled();
  });

  it('keeps showing the helper app when it is too busy to switch methods', async () => {
    const { connection, helper } = createTestConnection({ helper: helperStatus({ mode: 'chatgpt' }) });
    await connection.command({ action: 'set-mode', mode: 'claude-code' });
    helper.state.status = helperStatus({ mode: 'chatgpt', ready: true });
    const refuse = helper.client.command;
    helper.client.command = async () => err(appError('AI_BUSY'));
    expect(await connection.status()).toMatchObject({
      mode: 'claude-code',
      ready: false,
      helper: { mode: 'chatgpt' },
    });
    helper.client.command = refuse;
    expect(await connection.status()).toMatchObject({ mode: 'claude-code', helper: { mode: 'claude-code' } });
  });

  it('never switches the helper app from the polled mail page summary', async () => {
    const { connection, helper } = createTestConnection({ helper: helperStatus({ mode: 'chatgpt' }) });
    await connection.command({ action: 'set-mode', mode: 'claude-code' });
    helper.state.status = helperStatus({ mode: 'chatgpt', ready: true });
    helper.requests.length = 0;
    expect(await connection.summary()).toEqual({ mode: 'claude-code', ready: false, selectedModel: null });
    expect(helper.requests.map((request) => request.type)).toEqual(['AI_STATUS']);
  });

  it('keeps the previous method when the helper app refuses to switch during a sign-in', async () => {
    const { connection, area } = createTestConnection({ helper: helperStatus({ signingIn: true }) });
    expect(await connection.command({ action: 'set-mode', mode: 'claude-code' })).toEqual({
      ok: false,
      error: { code: 'AI_BUSY' },
    });
    expect(area.data[AI_CONNECTION_STORAGE_KEY]).toBeUndefined();
  });

  it('forwards account commands to the helper app and routes model choices by method', async () => {
    const { connection, helper } = createTestConnection({ helper: helperStatus({ mode: 'chatgpt' }) });
    await connection.command({ action: 'connect', accountId: null });
    await connection.command({ action: 'set-model', model: 'helper-model' });
    expect(
      helper.requests.filter((request) => request.type === 'AI_COMMAND').map((request) => request.payload),
    ).toEqual([
      { action: 'connect', accountId: null },
      { action: 'set-model', model: 'helper-model' },
    ]);
  });

  it('moves a user of helper app 0.1.0’s OpenAI key method to the extension’s OpenAI key', async () => {
    const { connection, area, helper } = createTestConnection({ helper: helperStatus({ mode: 'api-key' }) });
    expect(await connection.status()).toMatchObject({ mode: 'api-key', apiKey: { provider: 'openai' } });
    expect(area.data[AI_CONNECTION_STORAGE_KEY]).toMatchObject({ mode: 'api-key', provider: 'openai' });
    // Choosing a helper app method later moves the helper app off its retired method.
    await connection.command({ action: 'set-mode', mode: 'chatgpt' });
    expect(helper.state.status?.mode).toBe('chatgpt');
  });

  it('reports a helper app that is too old instead of hiding it', async () => {
    const { connection, helper } = createTestConnection({ helper: helperStatus() });
    await connection.command({ action: 'set-mode', mode: 'chatgpt' });
    helper.client.status = async () => err(appError('AI_VERSION_MISMATCH'));
    expect(await connection.status()).toMatchObject({
      mode: 'chatgpt',
      helper: null,
      error: 'AI_VERSION_MISMATCH',
    });
  });
});
