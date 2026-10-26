import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ClaudeCodeProvider, ClaudeCodeStatus } from '@writehand/ai-claude-code';
import {
  AiFailure,
  CODEX_CLIENT_ID,
  PLAN_SCOPE,
  type createOpenAiOAuth,
  type createOpenAiProvider,
} from '@writehand/ai-openai';
import { appError, err, ok, type AiInput } from '@writehand/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAiService } from '../../apps/ai-companion/src/ai-service';
import { defaultAccountLabel } from '../../apps/ai-companion/src/account-label';
import {
  createCredentialStore,
  type Account,
  type CredentialState,
  type CredentialStore,
} from '../../apps/ai-companion/src/credential-store';
import {
  encodeNativeMessage,
  NativeMessageDecoder,
  rejectionFor,
} from '../../apps/ai-companion/src/native-protocol';
import { hostPlatform, windowsPowerShellEnvironment } from '../../apps/ai-companion/src/platform';
import { createSignIn } from '../../apps/ai-companion/src/sign-in';

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
const initial = (): CredentialState => ({
  version: 1,
  hostId: 'urn:uuid:host',
  accounts: [
    {
      clientId: 'oaiapp_one',
      subject: 'subject',
      email: 'a@example.test',
      label: 'ChatGPT 1',
      credentials: {
        accessToken: 'private-access',
        refreshToken: 'private-refresh',
        idToken: 'private-id',
        expiresAt: Date.now() + 3600_000,
        scopes: [PLAN_SCOPE],
      },
      model: 'allowed',
      welcomed: false,
    },
  ],
  activeAccountId: 'oaiapp_one',
  mode: 'chatgpt',
});
const claudeSignedIn: ClaudeCodeStatus = {
  installed: true,
  loggedIn: true,
  subscription: true,
  plan: 'max',
  account: 'c@example.test',
  organization: null,
};
const memoryStore = (state = initial()): CredentialStore => ({
  read: async () => structuredClone(state),
  update: async (operation) => operation(state),
});
const dependencies = (store = memoryStore()) => ({
  store,
  oauth: {
    exchange: vi.fn().mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      id_token: 'new-id',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: PLAN_SCOPE,
    }),
    refresh: vi.fn().mockResolvedValue({
      access_token: 'rotated-access',
      refresh_token: 'rotated-refresh',
      token_type: 'Bearer',
      expires_in: 3600,
    }),
    verifyIdentity: vi.fn().mockResolvedValue({ sub: 'subject', email: 'a@example.test' }),
    revoke: vi.fn().mockResolvedValue(true),
  } satisfies ReturnType<typeof createOpenAiOAuth>,
  provider: {
    listModels: vi.fn().mockResolvedValue([{ id: 'allowed', label: 'Allowed' }]),
    generate: vi.fn().mockResolvedValue('complete'),
  } satisfies ReturnType<typeof createOpenAiProvider>,
  claude: {
    models: [
      { id: 'sonnet', label: 'Claude Sonnet' },
      { id: 'opus', label: 'Claude Opus' },
    ],
    status: vi.fn().mockResolvedValue(claudeSignedIn),
    generate: vi.fn().mockResolvedValue(ok('claude complete')),
  } satisfies Pick<ClaudeCodeProvider, 'models' | 'status' | 'generate'>,
  openBrowser: vi.fn().mockResolvedValue(undefined),
});
const temporary: string[] = [];
afterEach(async () => {
  for (const directory of temporary.splice(0)) await rm(directory, { recursive: true, force: true });
});

describe('AI service and protected storage', () => {
  it('returns only safe account metadata, confirms the plan once and never exposes secrets', async () => {
    const service = createAiService(dependencies());
    const status = await service.status();
    expect(status.needsPlanAcknowledgement).toBe(true);
    expect(JSON.stringify(status)).not.toContain('private-');
    expect((await service.command({ action: 'acknowledge-plan' })).needsPlanAcknowledgement).toBe(false);
  });

  it('requires a usable model catalog before reporting generation as ready', async () => {
    const deps = dependencies();
    const service = createAiService(deps);
    expect((await service.command({ action: 'refresh-models' })).ready).toBe(true);
    deps.provider.listModels.mockRejectedValueOnce(new AiFailure('AI_NOT_ELIGIBLE'));
    const unavailable = await service.command({ action: 'refresh-models' });
    expect(unavailable).toMatchObject({ ready: false, error: 'AI_NOT_ELIGIBLE', models: [] });
    expect(unavailable.accounts[0]).toMatchObject({ verified: true, connected: true });
    deps.provider.listModels.mockResolvedValueOnce([]);
    expect(await service.command({ action: 'refresh-models' })).toMatchObject({
      ready: false,
      error: 'AI_MODEL_UNAVAILABLE',
    });
  });

  it('a new native process loads the catalog once when a connected account is queried', async () => {
    const deps = dependencies();
    const service = createAiService(deps);

    const [first, concurrent] = await Promise.all([service.status(), service.status()]);
    expect(first).toMatchObject({ ready: true, models: [{ id: 'allowed', label: 'Allowed' }] });
    expect(concurrent.ready).toBe(true);
    await service.status();
    expect(deps.provider.listModels).toHaveBeenCalledTimes(1);
    expect(deps.provider.generate).not.toHaveBeenCalled();
  });

  it('a failed automatic catalog load is reported and not repeated on every status poll', async () => {
    const deps = dependencies();
    deps.provider.listModels.mockRejectedValueOnce(new AiFailure('AI_NETWORK'));
    const service = createAiService(deps);

    expect(await service.status()).toMatchObject({ ready: false, error: 'AI_NETWORK' });
    expect((await service.status()).ready).toBe(false);
    expect(deps.provider.listModels).toHaveBeenCalledTimes(1);
    // An explicit refresh tries again.
    expect((await service.command({ action: 'refresh-models' })).ready).toBe(true);
  });

  it('distinguishes an incomplete registration from an authenticated account', async () => {
    const state = initial();
    state.accounts[0]!.subject = null;
    state.accounts[0]!.email = null;
    state.accounts[0]!.credentials = null;
    state.activeAccountId = null;
    const deps = dependencies(memoryStore(state));
    const status = await createAiService(deps).status();
    expect(status).toMatchObject({ ready: false, activeAccountId: null });
    expect(status.accounts[0]).toMatchObject({ verified: false, connected: false, planEnabled: false });
    expect(deps.provider.listModels).not.toHaveBeenCalled();
  });

  it('does not infer without plan permission', async () => {
    const state = initial();
    state.accounts[0]!.credentials!.scopes = ['openid'];
    const deps = dependencies(memoryStore(state));
    const service = createAiService(deps);
    await expect(service.generate('request', input)).rejects.toThrow('AI_PLAN_REQUIRED');
    expect(deps.provider.generate).not.toHaveBeenCalled();
    expect(state.mode).toBe('chatgpt');
  });

  it('clears terminal refresh credentials while keeping the issued registration and host', async () => {
    const state = initial();
    state.accounts[0]!.credentials!.expiresAt = 0;
    const deps = dependencies(memoryStore(state));
    deps.oauth.refresh.mockRejectedValue(new AiFailure('AI_NOT_CONNECTED'));
    await expect(createAiService(deps).generate('request', input)).rejects.toThrow('AI_NOT_CONNECTED');
    expect(state.accounts[0]).toMatchObject({ clientId: 'oaiapp_one', credentials: null });
    expect(state.hostId).toBe('urn:uuid:host');
  });

  it('preserves credentials after temporary refresh failure', async () => {
    const state = initial();
    state.accounts[0]!.credentials!.expiresAt = 0;
    const deps = dependencies(memoryStore(state));
    deps.oauth.refresh.mockRejectedValue(new AiFailure('AI_NETWORK'));
    await expect(createAiService(deps).generate('request', input)).rejects.toThrow('AI_NETWORK');
    expect(state.accounts[0]?.credentials?.refreshToken).toBe('private-refresh');
  });

  it('revokes on sign-out, keeps registration and reports unconfirmed revocation', async () => {
    const deps = dependencies();
    deps.oauth.revoke.mockResolvedValue(false);
    const status = await createAiService(deps).command({ action: 'disconnect', accountId: 'oaiapp_one' });
    expect(deps.oauth.revoke).toHaveBeenCalledWith('oaiapp_one', 'private-refresh');
    expect(status.error).toBe('AI_REVOKE_UNCONFIRMED');
    expect(status.accounts[0]).toMatchObject({ id: 'oaiapp_one', connected: false });
    expect(status.ready).toBe(false);
  });

  it.each([true, false])(
    'removes the active account without switching accounts or billing (revoked: %s)',
    async (revoked) => {
      const state = initial();
      state.accounts.push({ ...state.accounts[0]!, clientId: 'oaiapp_other', label: 'Other' });
      const deps = dependencies(memoryStore(state));
      deps.oauth.revoke.mockResolvedValue(revoked);
      const service = createAiService(deps);
      await service.command({ action: 'refresh-models' });
      const status = await service.command({ action: 'remove-account', accountId: 'oaiapp_one' });
      expect(deps.oauth.revoke).toHaveBeenCalledWith('oaiapp_one', 'private-refresh');
      expect(status).toMatchObject({
        activeAccountId: null,
        ready: false,
        selectedModel: null,
        models: [],
        mode: 'chatgpt',
        error: revoked ? null : 'AI_REVOKE_UNCONFIRMED',
      });
      expect(status.accounts.map((account) => account.id)).toEqual(['oaiapp_other']);
      expect(state.hostId).toBe('urn:uuid:host');
      await expect(service.generate('after-removal', input)).rejects.toThrow('AI_NOT_CONNECTED');
    },
  );

  it('removes an incomplete inactive registration without affecting the active account catalog', async () => {
    const state = initial();
    state.accounts.push({
      ...state.accounts[0]!,
      clientId: 'oaiapp_incomplete',
      subject: null,
      credentials: null,
    });
    const deps = dependencies(memoryStore(state));
    const service = createAiService(deps);
    await service.command({ action: 'refresh-models' });
    const status = await service.command({ action: 'remove-account', accountId: 'oaiapp_incomplete' });
    expect(status).toMatchObject({ ready: true, activeAccountId: 'oaiapp_one', selectedModel: 'allowed' });
    expect(status.accounts).toHaveLength(1);
    expect(deps.oauth.revoke).not.toHaveBeenCalled();
    expect(deps.openBrowser).not.toHaveBeenCalled();
  });

  it('preserves identity and credentials when renaming and rejects duplicate names', async () => {
    const state = initial();
    state.accounts.push({ ...state.accounts[0]!, clientId: 'oaiapp_other', label: 'Work' });
    const original = structuredClone(state.accounts[0]!);
    const service = createAiService(dependencies(memoryStore(state)));
    await service.command({ action: 'rename-account', accountId: 'oaiapp_one', label: '  Kişisel  ' });
    expect(state.accounts[0]).toEqual({ ...original, label: 'Kişisel', customLabel: true });
    await expect(
      service.command({ action: 'rename-account', accountId: 'oaiapp_one', label: 'work' }),
    ).rejects.toThrow('AI_ACCOUNT_NAME_TAKEN');
    expect(state.accounts[0]?.label).toBe('Kişisel');
  });

  it('uses verified profile names or email with distinct labels for separate registrations', () => {
    const account = initial().accounts[0]!;
    expect(defaultAccountLabel([], { name: '  Ada   Example ', email: 'ada@example.test' })).toBe(
      'Ada Example',
    );
    expect(defaultAccountLabel([{ ...account, label: 'Ada Example' }], { name: 'Ada Example' })).toBe(
      'Ada Example (2)',
    );
    expect(defaultAccountLabel([], { name: ' ', email: 'ada@example.test' })).toBe('ada@example.test');
    expect(defaultAccountLabel([{ ...account, label: 'ChatGPT' }])).toBe('ChatGPT (2)');
  });

  it('aborts generation on explicit cancel and does not return a late result', async () => {
    const deps = dependencies();
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    deps.provider.generate.mockImplementation(
      (_input, _model, _token, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
            once: true,
          });
          started();
        }),
    );
    const service = createAiService(deps);
    const result = service.generate('request', input);
    await ready;
    expect(service.cancel('request')).toEqual({ cancelled: true });
    await expect(result).rejects.toThrow('Aborted');
  });

  it('serializes token refresh across native processes and replaces the file in one step', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'writehand-store-'));
    temporary.push(directory);
    const store = createCredentialStore(directory);
    await store.update((state) => Object.assign(state, initial()));
    await store.update((state) => {
      state.accounts[0]!.credentials!.expiresAt = 0;
    });
    const first = dependencies(store);
    const second = { ...first, store: createCredentialStore(directory) };
    await Promise.all([
      createAiService(first).generate('first', input),
      createAiService(second).generate('second', input),
    ]);
    expect(first.oauth.refresh).toHaveBeenCalledTimes(1);
    const saved = await store.read();
    expect(saved.accounts[0]?.credentials).toMatchObject({
      accessToken: 'rotated-access',
      refreshToken: 'rotated-refresh',
    });
    expect(await readFile(join(directory, 'credentials.json'), 'utf8')).not.toContain('"source"');
    expect((await readdir(directory)).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  // On Windows this starts several PowerShell processes, which can outlast the default 5 s timeout on CI runners.
  it('keeps the credential directory and file private to the owner on this system', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'writehand-store-'));
    temporary.push(parent);
    const directory = join(parent, 'writehand');
    const store = createCredentialStore(directory, { restrictDirectory: hostPlatform().restrictDirectory });
    await store.update((state) => Object.assign(state, initial()));
    const file = join(directory, 'credentials.json');
    if (process.platform === 'win32') {
      // Windows ignores mode bits: only this user and SYSTEM may access, nothing inherited.
      const system32 = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32');
      const whoami = execFileSync(join(system32, 'whoami.exe'), ['/user', '/fo', 'csv', '/nh'], {
        encoding: 'utf8',
      });
      const user = /"(S-1-[\d-]+)"/.exec(whoami)?.[1];
      const access = (path: string) => {
        const sddl = execFileSync(
          join(system32, 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
          ['-NoProfile', '-NonInteractive', '-Command', '(Get-Acl -LiteralPath $env:EW_TARGET).Sddl'],
          { encoding: 'utf8', env: windowsPowerShellEnvironment(process.env, { EW_TARGET: path }) },
        ).trim();
        const dacl = sddl.slice(sddl.indexOf('D:'));
        return {
          flags: /^D:([A-Z]*)\(/.exec(dacl)?.[1],
          trustees: [...dacl.matchAll(/;([^;()]+)\)/g)].map((m) => m[1]).sort(),
        };
      };
      // SDDL names the built-in Administrator account "LA"; on such an account (e.g. a CI
      // runner) the Administrators group ("BA"), which can open every file anyway, stays listed.
      const self = user?.endsWith('-500') ? 'LA' : user;
      const allowed = [self, 'SY', ...(self === 'LA' ? ['BA'] : [])];
      for (const path of [directory, file]) {
        const { flags, trustees } = access(path);
        if (path === directory) expect(flags).toBe('PAI');
        expect(trustees).toEqual(expect.arrayContaining([self, 'SY']));
        expect(trustees.filter((trustee) => !allowed.includes(trustee))).toEqual([]);
      }
    } else {
      expect((await stat(directory)).mode & 0o777).toBe(0o700);
      expect((await stat(file)).mode & 0o777).toBe(0o600);
    }
  }, 30_000);

  it('does not keep a new directory whose access could not be restricted', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'writehand-store-'));
    temporary.push(parent);
    const directory = join(parent, 'writehand');
    const restrictDirectory = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValue(undefined);
    const store = createCredentialStore(directory, { restrictDirectory });

    await expect(store.read()).rejects.toThrow('denied');
    expect(await readdir(parent)).toEqual([]);
    // The next attempt creates and restricts the directory again.
    expect((await store.read()).accounts).toEqual([]);
    expect(restrictDirectory).toHaveBeenCalledTimes(2);
  });

  it('restricts a directory that already exists once per process and never removes it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'writehand-store-'));
    temporary.push(directory);
    await writeFile(
      join(directory, 'credentials.json'),
      JSON.stringify({ ...initial(), apiKey: null, apiModel: null }),
      {
        mode: 0o600,
      },
    );
    // A failure on an existing directory leaves it and its credentials as they were.
    const restrictDirectory = vi.fn().mockRejectedValue(new Error('denied'));
    const store = createCredentialStore(directory, { restrictDirectory });

    expect((await store.read()).activeAccountId).toBe('oaiapp_one');
    await store.read();
    await store.update(() => undefined);
    expect(restrictDirectory).toHaveBeenCalledTimes(1);
    expect(restrictDirectory).toHaveBeenCalledWith(directory);
    expect(await readdir(directory)).toContain('credentials.json');
  });

  it('reads saved credentials without rewriting the file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'writehand-store-'));
    temporary.push(directory);
    const store = createCredentialStore(directory);
    const first = await store.read();
    const file = join(directory, 'credentials.json');
    // The first read wrote the file once, with the host ID it reports.
    expect(JSON.parse(await readFile(file, 'utf8'))).toMatchObject({ hostId: first.hostId });
    const before = await stat(file);

    for (let i = 0; i < 3; i += 1) expect((await store.read()).hostId).toBe(first.hostId);
    const after = await stat(file);
    // A replacement would give the file a new inode (or at least a new modification time).
    expect([after.ino, after.mtimeMs]).toEqual([before.ino, before.mtimeMs]);
  });
});

describe('Loopback sign-in', () => {
  it.each([false, true])(
    'refreshes legacy default labels but preserves user labels on sign-in (custom: %s)',
    async (customLabel) => {
      const state = initial();
      state.accounts[0]!.customLabel = customLabel;
      state.accounts[0]!.label = customLabel ? 'İş · Acme' : 'ChatGPT 1';
      const deps = dependencies(memoryStore(state));
      deps.oauth.verifyIdentity.mockResolvedValue({
        sub: 'subject',
        email: 'a@example.test',
        name: 'Ada Example',
      });
      const signIn = createSignIn({ ...deps, onComplete: vi.fn() });
      try {
        await signIn.start('oaiapp_one');
        const authorize = new URL(deps.openBrowser.mock.calls[0]![0]);
        const callback = new URL(authorize.searchParams.get('redirect_uri')!);
        callback.search = new URLSearchParams({
          state: authorize.searchParams.get('state')!,
          code: 'c',
          client_id: 'oaiapp_one',
        }).toString();
        expect((await fetch(callback)).status).toBe(200);
        expect(state.accounts[0]?.label).toBe(customLabel ? 'İş · Acme' : 'Ada Example');
      } finally {
        signIn.cancel();
      }
    },
  );

  it.each([false, true])(
    'cannot resurrect an account removed while tokens are in flight (separate process: %s)',
    async (separateProcess) => {
      const state = initial();
      const deps = dependencies(memoryStore(state));
      const tokens = await deps.oauth.exchange();
      let completeExchange!: () => void;
      deps.oauth.exchange.mockImplementation(
        () =>
          new Promise((resolve) => {
            completeExchange = () => resolve(tokens);
          }),
      );
      deps.oauth.exchange.mockClear();
      const service = createAiService(deps);
      const remover = separateProcess ? createAiService(deps) : service;
      try {
        await service.command({ action: 'connect', accountId: 'oaiapp_one' });
        const authorize = new URL(deps.openBrowser.mock.calls[0]![0]);
        const callback = new URL(authorize.searchParams.get('redirect_uri')!);
        callback.search = new URLSearchParams({
          state: authorize.searchParams.get('state')!,
          code: 'c',
          client_id: 'oaiapp_one',
        }).toString();
        const response = fetch(callback).catch(() => null);
        await vi.waitFor(() => expect(deps.oauth.exchange).toHaveBeenCalledTimes(1));
        await remover.command({ action: 'remove-account', accountId: 'oaiapp_one' });
        completeExchange();
        await response;
        await vi.waitFor(() => expect(deps.oauth.revoke).toHaveBeenCalledWith('oaiapp_one', 'new-refresh'));
        expect(state.accounts).toEqual([]);
        expect(state.activeAccountId).toBeNull();
        expect((await service.status()).ready).toBe(false);
      } finally {
        service.dispose();
        remover.dispose();
      }
    },
  );

  it('does not recreate a returning account removed by another process before callback', async () => {
    const state = initial();
    const deps = dependencies(memoryStore(state));
    const signIn = createSignIn({ ...deps, onComplete: vi.fn() });
    try {
      await signIn.start('oaiapp_one');
      await createAiService(deps).command({ action: 'remove-account', accountId: 'oaiapp_one' });
      const authorize = new URL(deps.openBrowser.mock.calls[0]![0]);
      const callback = new URL(authorize.searchParams.get('redirect_uri')!);
      callback.search = new URLSearchParams({
        state: authorize.searchParams.get('state')!,
        code: 'c',
        client_id: 'oaiapp_one',
      }).toString();
      expect((await fetch(callback)).status).toBe(400);
      expect(deps.oauth.exchange).not.toHaveBeenCalled();
      expect(state.accounts).toEqual([]);
    } finally {
      signIn.cancel();
    }
  });
  it('starts a new workspace registration without reusing the pending account or its hints', async () => {
    const state = initial();
    const before = structuredClone(state);
    const deps = dependencies(memoryStore(state));
    const service = createAiService(deps);
    try {
      await service.command({ action: 'connect', accountId: 'oaiapp_one' });
      const saved = new URL(deps.openBrowser.mock.calls[0]![0]).searchParams;
      expect(saved.get('client_id')).toBe('oaiapp_one');
      expect(saved.get('id_token_hint')).toBe('private-id');
      const status = await service.command({ action: 'connect', accountId: null });
      const fresh = new URL(deps.openBrowser.mock.calls[1]![0]).searchParams;
      expect(fresh.get('client_id')).toBe('dynamic_agent_client');
      expect(fresh.get('ext_agent_host_id')).toBe(saved.get('ext_agent_host_id'));
      expect(fresh.has('id_token_hint')).toBe(false);
      expect(fresh.has('login_hint')).toBe(false);
      expect(fresh.get('state')).not.toBe(saved.get('state'));
      expect(status).toMatchObject({ signingIn: true, error: null });
      expect(state).toEqual(before);
      expect(deps.oauth.revoke).not.toHaveBeenCalled();
      expect(deps.oauth.exchange).not.toHaveBeenCalled();
    } finally {
      service.dispose();
    }
  });
  it.each([false, true])(
    'keeps verified sign-in separate from plan/model availability (plan: %s)',
    async (planEnabled) => {
      const state = initial();
      state.accounts = [];
      state.activeAccountId = null;
      const deps = dependencies(memoryStore(state));
      deps.oauth.exchange.mockResolvedValue({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        id_token: 'new-id',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: planEnabled ? PLAN_SCOPE : 'openid email',
      });
      deps.provider.listModels.mockRejectedValue(new AiFailure('AI_NOT_ELIGIBLE'));
      const service = createAiService(deps);
      try {
        await service.command({ action: 'connect', accountId: null });
        const authorize = new URL(deps.openBrowser.mock.calls[0]![0]);
        const callback = new URL(authorize.searchParams.get('redirect_uri')!);
        callback.search = new URLSearchParams({
          state: authorize.searchParams.get('state')!,
          code: 'c',
          client_id: 'oaiapp_new',
        }).toString();
        const response = await fetch(callback);
        expect(response.status).toBe(200);
        expect(await response.text()).toContain('Sign-in completed');
        const status = await service.status();
        expect(status.accounts[0]).toMatchObject({ verified: true, connected: true, planEnabled });
        expect(status).toMatchObject({
          ready: false,
          error: planEnabled ? 'AI_NOT_ELIGIBLE' : 'AI_PLAN_REQUIRED',
        });
        expect(deps.provider.listModels).toHaveBeenCalledTimes(planEnabled ? 1 : 0);
        expect(deps.provider.generate).not.toHaveBeenCalled();
      } finally {
        service.dispose();
      }
    },
  );
  it('a cancelled callback cannot clear a newer sign-in and revokes credentials issued after cancellation', async () => {
    const deps = dependencies();
    let finishExchange!: (tokens: {
      access_token: string;
      refresh_token: string;
      id_token: string;
      token_type: string;
      expires_in: number;
      scope: string;
    }) => void;
    let exchangeStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      exchangeStarted = resolve;
    });
    deps.oauth.exchange.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishExchange = resolve;
          exchangeStarted();
        }),
    );
    const signIn = createSignIn({ ...deps, onComplete: vi.fn() });
    try {
      await signIn.start('oaiapp_one');
      const authorize = new URL(deps.openBrowser.mock.calls[0]![0]);
      const callback = new URL(authorize.searchParams.get('redirect_uri')!);
      callback.search = new URLSearchParams({
        state: authorize.searchParams.get('state')!,
        code: 'c',
      }).toString();
      const oldCallback = fetch(callback).catch(() => null);
      await started;
      signIn.cancel();
      await signIn.start(null);
      finishExchange({
        access_token: 'cancelled-access',
        refresh_token: 'cancelled-refresh',
        id_token: 'new-id',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: PLAN_SCOPE,
      });
      await vi.waitFor(() =>
        expect(deps.oauth.revoke).toHaveBeenCalledWith('oaiapp_one', 'cancelled-refresh'),
      );
      await oldCallback;
      expect(signIn.pending()).toBe(true);
      expect(signIn.error()).toBeNull();
      expect((await deps.store.read()).accounts[0]?.credentials?.accessToken).toBe('private-access');
    } finally {
      signIn.cancel();
    }
  });

  it('accepts the callback once, retains the issued client and verifies identity before activating', async () => {
    const state = initial();
    state.accounts = [];
    state.activeAccountId = null;
    const deps = dependencies(memoryStore(state));
    const complete = vi.fn().mockResolvedValue(undefined);
    const signIn = createSignIn({ ...deps, onComplete: complete });
    try {
      await signIn.start(null);
      const authorize = new URL(deps.openBrowser.mock.calls[0]![0]);
      const callback = new URL(authorize.searchParams.get('redirect_uri')!);
      const wrong = new URL(callback);
      wrong.search = 'state=wrong&code=c&client_id=oaiapp_new';
      expect((await fetch(wrong)).status).toBe(400);
      expect(signIn.pending()).toBe(true);
      callback.search = new URLSearchParams({
        state: authorize.searchParams.get('state')!,
        code: 'c',
        client_id: 'oaiapp_new',
      }).toString();
      expect((await fetch(callback)).status).toBe(200);
      expect(deps.oauth.verifyIdentity).toHaveBeenCalledWith(
        'new-id',
        'oaiapp_new',
        authorize.searchParams.get('nonce'),
      );
      expect(state.activeAccountId).toBe('oaiapp_new');
      expect(state.accounts[0]?.credentials?.accessToken).toBe('new-access');
      expect(complete).toHaveBeenCalledOnce();
    } finally {
      signIn.cancel();
    }
  });

  it('keeps a registration after exchange failure so another login will not register again', async () => {
    const state = initial();
    state.accounts = [];
    state.activeAccountId = null;
    const deps = dependencies(memoryStore(state));
    deps.oauth.exchange.mockRejectedValue(new AiFailure('AI_AUTH_FAILED'));
    const signIn = createSignIn({ ...deps, onComplete: vi.fn() });
    try {
      await signIn.start(null);
      const authorize = new URL(deps.openBrowser.mock.calls[0]![0]);
      const callback = new URL(authorize.searchParams.get('redirect_uri')!);
      callback.search = new URLSearchParams({
        state: authorize.searchParams.get('state')!,
        code: 'c',
        client_id: 'oaiapp_new',
      }).toString();
      const response = await fetch(callback);
      expect(response.status).toBe(400);
      expect(await response.text()).toContain('AI_AUTH_FAILED');
      expect(state.accounts[0]).toMatchObject({ clientId: 'oaiapp_new', credentials: null });
      expect(state.activeAccountId).toBeNull();
    } finally {
      signIn.cancel();
    }
  });
});

describe('Codex sign-in', () => {
  const workAccount = (): Account => ({
    clientId: CODEX_CLIENT_ID,
    codex: { id: 'codex_one', workspaceId: 'workspace-1' },
    subject: 'work-subject',
    email: 'w@example.test',
    label: 'Work',
    credentials: {
      accessToken: 'codex-access',
      refreshToken: 'codex-refresh',
      idToken: 'codex-id',
      expiresAt: Date.now() + 3600_000,
      scopes: ['openid', 'offline_access'],
    },
    model: 'allowed',
    welcomed: true,
  });
  const workIdentity = (workspaceId = 'workspace-1') => ({
    sub: 'work-subject',
    name: 'Ada Work',
    'https://api.openai.com/profile': { email: 'w@example.test' },
    'https://api.openai.com/auth': { chatgpt_account_id: workspaceId },
  });
  const codexDependencies = (state: CredentialState) => {
    const deps = dependencies(memoryStore(state));
    deps.oauth.exchange.mockResolvedValue({
      access_token: 'issued-access',
      refresh_token: 'issued-refresh',
      id_token: 'issued-id',
      token_type: 'bearer',
      expires_in: 864_000,
    });
    deps.oauth.verifyIdentity.mockResolvedValue(workIdentity());
    return deps;
  };
  /** Answers the sign-in page opened as the `call`-th browser window, as OpenAI would redirect. */
  const returnFromSignIn = async (deps: ReturnType<typeof dependencies>, call = 0) => {
    const authorize = new URL(deps.openBrowser.mock.calls[call]![0]);
    const callback = new URL(authorize.searchParams.get('redirect_uri')!);
    callback.search = new URLSearchParams({
      state: authorize.searchParams.get('state')!,
      code: 'c',
    }).toString();
    return { authorize, callback, response: await fetch(callback) };
  };

  it('adds a work account through the Codex client and generates for its workspace', async () => {
    const state = initial();
    const deps = codexDependencies(state);
    const service = createAiService(deps);
    try {
      expect(await service.command({ action: 'connect', accountId: null, signIn: 'codex' })).toMatchObject({
        signingIn: true,
      });
      const { authorize, callback, response } = await returnFromSignIn(deps);
      expect(authorize.searchParams.get('client_id')).toBe(CODEX_CLIENT_ID);
      expect(['1455', '1457']).toContain(callback.port);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('check text generation availability');
      expect(deps.oauth.verifyIdentity).toHaveBeenCalledWith('issued-id', CODEX_CLIENT_ID, null);

      const status = await service.status();
      const work = status.accounts.find((account) => account.signIn === 'codex')!;
      expect(work).toMatchObject({
        label: 'Ada Work',
        email: 'w@example.test',
        verified: true,
        connected: true,
        planEnabled: true,
      });
      expect(status).toMatchObject({ activeAccountId: work.id, ready: true, needsPlanAcknowledgement: true });
      // The Sign in with ChatGPT registration is kept and stays apart.
      expect(status.accounts.find((account) => account.id === 'oaiapp_one')?.signIn).toBe('siwc');

      await service.generate('00000000-0000-4000-8000-000000000010', input);
      const connection = { kind: 'codex', token: 'issued-access', workspaceId: 'workspace-1' };
      expect(deps.provider.listModels).toHaveBeenLastCalledWith(connection);
      expect(deps.provider.generate).toHaveBeenCalledWith(
        input,
        'allowed',
        connection,
        expect.any(AbortSignal),
      );
    } finally {
      service.dispose();
    }
  });

  it('replaces the tokens of the same user and workspace instead of adding the account twice', async () => {
    const state = initial();
    state.accounts.push(workAccount());
    const deps = codexDependencies(state);
    const signIn = createSignIn({ ...deps, onComplete: vi.fn().mockResolvedValue(undefined) });
    try {
      await signIn.start(null, 'codex');
      expect((await returnFromSignIn(deps)).response.status).toBe(200);
      expect(state.accounts.filter((account) => account.codex)).toHaveLength(1);
      expect(state.accounts[1]).toMatchObject({
        label: 'Work',
        credentials: { accessToken: 'issued-access' },
      });
      expect(state.activeAccountId).toBe('codex_one');
    } finally {
      signIn.cancel();
    }
  });

  it('signs a saved work account in again only to its own workspace', async () => {
    const state = initial();
    state.accounts = [{ ...workAccount(), credentials: null }];
    const deps = codexDependencies(state);
    deps.oauth.verifyIdentity.mockResolvedValue(workIdentity('workspace-2'));
    const signIn = createSignIn({ ...deps, onComplete: vi.fn() });
    try {
      await signIn.start('codex_one');
      const { authorize, response } = await returnFromSignIn(deps);
      expect(authorize.searchParams.get('allowed_workspace_id')).toBe('workspace-1');
      expect(response.status).toBe(400);
      expect(await response.text()).toContain('AI_WORKSPACE_MISMATCH');
      await vi.waitFor(() =>
        expect(deps.oauth.revoke).toHaveBeenCalledWith(CODEX_CLIENT_ID, 'issued-refresh'),
      );
      expect(state.accounts[0]?.credentials).toBeNull();
    } finally {
      signIn.cancel();
    }
  });

  it('refreshes expired Codex tokens with the Codex client', async () => {
    const state = initial();
    const work = workAccount();
    work.credentials!.expiresAt = 0;
    state.accounts.push(work);
    state.activeAccountId = 'codex_one';
    const deps = dependencies(memoryStore(state));
    await createAiService(deps).generate('00000000-0000-4000-8000-000000000011', input);
    expect(deps.oauth.refresh).toHaveBeenCalledWith(CODEX_CLIENT_ID, 'codex-refresh');
    expect(deps.provider.generate).toHaveBeenCalledWith(
      input,
      'allowed',
      { kind: 'codex', token: 'rotated-access', workspaceId: 'workspace-1' },
      expect.any(AbortSignal),
    );
  });

  it('keeps Codex accounts in the credential file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'writehand-store-'));
    temporary.push(directory);
    const store = createCredentialStore(directory);
    const work = workAccount();
    await store.update((state) => {
      Object.assign(state, initial());
      state.accounts.push(work);
    });
    expect((await store.read()).accounts[1]).toEqual(work);
  });
});

describe('Native framing', () => {
  it('decodes fragmented and concatenated UTF-8 messages', async () => {
    const decoder = new NativeMessageDecoder();
    const received: unknown[] = [];
    decoder.on('data', (value) => received.push(value));
    const frames = Buffer.concat([encodeNativeMessage({ text: 'İyi' }), encodeNativeMessage({ id: 2 })]);
    for (const byte of frames) decoder.write(Buffer.from([byte]));
    decoder.end();
    expect(received).toEqual([{ text: 'İyi' }, { id: 2 }]);
  });
  it('answers an unrecognised request at once instead of leaving the extension waiting', () => {
    // E.g. an older helper that does not know a newer input field.
    expect(
      rejectionFor({ protocolVersion: 1, requestId: 'r1', type: 'AI_GENERATE', payload: {} }, 1),
    ).toEqual({
      protocolVersion: 1,
      requestId: 'r1',
      ok: false,
      error: { code: 'AI_VERSION_MISMATCH' },
    });
    expect(rejectionFor({ type: 'AI_STATUS' }, 1)).toBeNull();
    expect(rejectionFor({ requestId: 'x'.repeat(65) }, 1)).toBeNull();
  });
  it('rejects oversized input before allocating its payload', async () => {
    const decoder = new NativeMessageDecoder();
    const error = new Promise<Error>((resolve) => decoder.once('error', resolve));
    decoder.end(Buffer.from([255, 255, 255, 255]));
    expect((await error).message).toBe('Invalid native message.');
  });
});

describe('Claude Code method', () => {
  const claudeState = () => {
    const state = initial();
    state.mode = 'claude-code';
    return state;
  };

  it('reports the local Claude Code sign-in and routes generation to it without OpenAI calls', async () => {
    const deps = dependencies();
    const service = createAiService(deps);

    const status = await service.command({ action: 'set-mode', mode: 'claude-code' });
    expect(status).toMatchObject({
      mode: 'claude-code',
      ready: true,
      selectedModel: 'sonnet',
      models: [{ id: 'sonnet' }, { id: 'opus' }],
      claudeCode: claudeSignedIn,
      error: null,
    });
    expect(await service.generate('00000000-0000-4000-8000-000000000001', input)).toEqual({
      text: 'claude complete',
    });
    expect(deps.claude.generate).toHaveBeenCalledWith(input, 'sonnet', expect.any(AbortSignal));
    expect(deps.provider.listModels).not.toHaveBeenCalled();
    expect(deps.provider.generate).not.toHaveBeenCalled();
    expect(deps.oauth.refresh).not.toHaveBeenCalled();
  });

  it('keeps the chosen Claude model and rejects unknown ones', async () => {
    const state = claudeState();
    const deps = dependencies(memoryStore(state));
    const service = createAiService(deps);

    expect((await service.command({ action: 'set-model', model: 'opus' })).selectedModel).toBe('opus');
    expect(state.claudeModel).toBe('opus');
    await expect(service.command({ action: 'set-model', model: 'gpt-5' })).rejects.toThrow(
      'AI_MODEL_UNAVAILABLE',
    );
    await service.generate('00000000-0000-4000-8000-000000000002', input);
    expect(deps.claude.generate).toHaveBeenCalledWith(input, 'opus', expect.any(AbortSignal));
  });

  it('falls back to the default when the saved Claude model is no longer offered', async () => {
    const state = claudeState();
    state.claudeModel = 'haiku';
    const deps = dependencies(memoryStore(state));
    const service = createAiService(deps);

    expect((await service.status()).selectedModel).toBe('sonnet');
    await service.generate('00000000-0000-4000-8000-000000000003', input);
    expect(deps.claude.generate).toHaveBeenCalledWith(input, 'sonnet', expect.any(AbortSignal));
  });

  it('reuses the sign-in check while the indicator polls; Refresh checks again', async () => {
    const deps = dependencies(memoryStore(claudeState()));
    const service = createAiService(deps);

    await service.status();
    await service.status();
    expect(deps.claude.status).toHaveBeenCalledTimes(1);
    await service.command({ action: 'refresh-models' });
    expect(deps.claude.status).toHaveBeenCalledTimes(2);
  });

  it('is not ready when Claude Code is missing or signed out, and says which', async () => {
    const deps = dependencies(memoryStore(claudeState()));
    deps.claude.status.mockResolvedValue({ ...claudeSignedIn, loggedIn: false, account: null, plan: null });
    const service = createAiService(deps);

    expect(await service.status()).toMatchObject({ ready: false, claudeCode: { loggedIn: false } });
    await expect(service.generate('00000000-0000-4000-8000-000000000003', input)).rejects.toThrow(
      'AI_CLAUDE_NOT_LOGGED_IN',
    );
    // A cached "signed out" answer is checked again before failing the request.
    expect(deps.claude.status).toHaveBeenCalledTimes(2);
    expect(deps.claude.generate).not.toHaveBeenCalled();

    deps.claude.status.mockResolvedValue({ ...claudeSignedIn, installed: false, loggedIn: false });
    await expect(service.generate('00000000-0000-4000-8000-000000000004', input)).rejects.toThrow(
      'AI_CLAUDE_NOT_INSTALLED',
    );
  });

  it('explains an installation that cannot be started safely through the error field', async () => {
    const deps = dependencies(memoryStore(claudeState()));
    deps.claude.status.mockResolvedValue({
      ...claudeSignedIn,
      installed: false,
      loggedIn: false,
      problem: 'AI_CLAUDE_UNSUPPORTED_INSTALL',
    });
    const service = createAiService(deps);

    const status = await service.status();
    expect(status).toMatchObject({ ready: false, error: 'AI_CLAUDE_UNSUPPORTED_INSTALL' });
    // The extension's status schema is strict: the reason travels only as the error code.
    expect(status.claudeCode).not.toHaveProperty('problem');
    await expect(service.generate('00000000-0000-4000-8000-000000000006', input)).rejects.toThrow(
      'AI_CLAUDE_UNSUPPORTED_INSTALL',
    );
    expect(deps.claude.generate).not.toHaveBeenCalled();
  });

  it('passes provider failures through and checks the sign-in again after a sign-out', async () => {
    const deps = dependencies(memoryStore(claudeState()));
    const service = createAiService(deps);
    deps.claude.generate.mockResolvedValueOnce(err(appError('AI_CLAUDE_NOT_LOGGED_IN')));

    await expect(service.generate('00000000-0000-4000-8000-000000000005', input)).rejects.toThrow(
      'AI_CLAUDE_NOT_LOGGED_IN',
    );
    await service.status();
    expect(deps.claude.status).toHaveBeenCalledTimes(2);
  });

  it('reads credential files written before Claude Code support', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'writehand-store-'));
    temporary.push(directory);
    const legacy: Record<string, unknown> = { ...initial(), apiKey: null, apiModel: null };
    delete legacy.claudeModel;
    await writeFile(join(directory, 'credentials.json'), JSON.stringify(legacy), { mode: 0o600 });

    const state = await createCredentialStore(directory).read();
    expect(state.mode).toBe('chatgpt');
    expect(state.claudeModel).toBeUndefined();
  });

  it('drops the OpenAI API key that helper app 0.1.0 kept, in a file 0.1.0 can still read', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'writehand-store-'));
    temporary.push(directory);
    const file = join(directory, 'credentials.json');
    const legacy = { ...initial(), mode: 'api-key', apiKey: 'sk-private-legacy-key', apiModel: 'gpt-test' };
    await writeFile(file, JSON.stringify(legacy), { mode: 0o600 });

    const store = createCredentialStore(directory);
    // The key now belongs in the extension; the helper app falls back to its default method.
    expect(await store.read()).toMatchObject({ mode: 'chatgpt', activeAccountId: 'oaiapp_one' });
    const written = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
    expect(written).toMatchObject({ version: 1, mode: 'chatgpt', apiKey: null, apiModel: null });
    expect(JSON.stringify(written)).not.toContain('sk-private-legacy-key');
  });
});
