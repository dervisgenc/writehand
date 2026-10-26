import { AiConnectionGuide, AiConnectionSettings } from '@writehand/ui';
import type { AiMode, AiStatus, ApiKeyStatus, HelperStatus } from '@writehand/contracts';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { tr } from '@writehand/locales';

const disconnected: HelperStatus = {
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
};
const noApiKey: ApiKeyStatus = {
  provider: 'groq',
  savedKeys: [],
  access: false,
  models: [],
  selectedModel: null,
};
/** The connection as the background reports it for a helper app method. */
const viaHelper = (helper: HelperStatus): AiStatus => ({
  mode: helper.mode,
  ready: helper.ready,
  error: helper.error,
  helper,
  apiKey: noApiKey,
});
const withApiKey = (apiKey: Partial<ApiKeyStatus> = {}, ready = false): AiStatus => ({
  mode: 'api-key',
  ready,
  error: null,
  helper: null,
  apiKey: { ...noApiKey, ...apiKey },
});
const render = (status: HelperStatus | AiStatus | null) =>
  mount(AiConnectionSettings, {
    props: {
      status: status !== null && 'accounts' in status ? viaHelper(status) : status,
      text: tr.ui.ai,
      busy: false,
      error: null,
    },
  });

describe('AI connection settings', () => {
  it('lets users select and rename an incomplete account without signing in or changing the active account', async () => {
    const wrapper = render({
      ...disconnected,
      activeAccountId: 'oaiapp_active',
      ready: true,
      accounts: [
        {
          id: 'oaiapp_active',
          label: 'Kişisel',
          email: null,
          verified: true,
          connected: true,
          planEnabled: true,
        },
        {
          id: 'oaiapp_incomplete',
          label: 'ChatGPT',
          email: null,
          verified: false,
          connected: false,
          planEnabled: false,
        },
      ],
      models: [{ id: 'allowed', label: 'Allowed' }],
      selectedModel: 'allowed',
    });
    await wrapper.get('.ew-select').setValue('oaiapp_incomplete');
    expect(wrapper.emitted('command')).toBeUndefined();
    expect(wrapper.text()).toContain('Kullanımdaki hesap: Kişisel');
    expect(wrapper.text()).toContain(tr.ui.ai.registrationIncomplete);
    expect(wrapper.findAll('select')).toHaveLength(1);
    await wrapper
      .findAll('button')
      .find((button) => button.text() === tr.ui.ai.renameAccount)!
      .trigger('click');
    const input = wrapper.get('input[type=text]');
    // Polling pending sign-in must not discard an in-progress name edit.
    await input.setValue('İş');
    const polled = wrapper.props('status')!.helper!;
    await wrapper.setProps({
      status: viaHelper({
        ...polled,
        signingIn: true,
        accounts: polled.accounts.map((account) => ({ ...account })),
      }),
    });
    expect((wrapper.get('input[type=text]').element as HTMLInputElement).value).toBe('İş');
    await input.setValue('   ');
    expect(wrapper.get('button[type=submit]').attributes('disabled')).toBeDefined();
    await input.setValue('  İş · Acme  ');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('command')).toEqual([
      [{ action: 'rename-account', accountId: 'oaiapp_incomplete', label: 'İş · Acme' }],
    ]);
    wrapper.unmount();
  });

  it('requires an explicit action to activate another connected account', async () => {
    const wrapper = render({
      ...disconnected,
      activeAccountId: 'oaiapp_active',
      accounts: ['active', 'other'].map((id) => ({
        id: `oaiapp_${id}`,
        label: id,
        email: null,
        verified: true,
        connected: true,
        planEnabled: true,
      })),
    });
    await wrapper.get('.ew-select').setValue('oaiapp_other');
    expect(wrapper.emitted('command')).toBeUndefined();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === tr.ui.ai.useAccount)!
      .trigger('click');
    expect(wrapper.emitted('command')).toEqual([[{ action: 'select-account', accountId: 'oaiapp_other' }]]);
    wrapper.unmount();
  });

  it('allows removing incomplete records during pending login, with confirmation and cancellation', async () => {
    const wrapper = render({
      ...disconnected,
      signingIn: true,
      accounts: [
        {
          id: 'oaiapp_incomplete',
          label: 'İş hesabı',
          email: null,
          verified: false,
          connected: false,
          planEnabled: false,
        },
      ],
    });
    const remove = wrapper.findAll('button').find((button) => button.text() === tr.ui.ai.removeAccount)!;
    expect(remove.attributes('disabled')).toBeUndefined();
    await remove.trigger('click');
    const dialog = wrapper.get('.ew-ai-account-dialog');
    expect(dialog.text()).toContain('İş hesabı');
    expect(wrapper.emitted('command')).toBeUndefined();
    await dialog
      .findAll('button')
      .find((button) => button.text() === tr.ui.ai.cancel)!
      .trigger('click');
    expect(wrapper.emitted('command')).toBeUndefined();
    await remove.trigger('click');
    await dialog
      .findAll('button')
      .find((button) => button.text() === tr.ui.ai.confirmRemoveAccount)!
      .trigger('click');
    expect(wrapper.emitted('command')).toEqual([
      [{ action: 'remove-account', accountId: 'oaiapp_incomplete' }],
    ]);
    wrapper.unmount();
  });
  it('reuses an incomplete saved registration when the first code exchange failed', async () => {
    const wrapper = render({
      ...disconnected,
      accounts: [
        {
          id: 'oaiapp_saved',
          label: 'ChatGPT 1',
          email: null,
          verified: false,
          connected: false,
          planEnabled: false,
        },
      ],
    });
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Continue with ChatGPT')!
      .trigger('click');
    expect(wrapper.emitted('command')?.[0]).toEqual([{ action: 'connect', accountId: 'oaiapp_saved' }]);
    expect(wrapper.text()).toContain(tr.ui.ai.registrationIncomplete);
    expect(wrapper.text()).not.toContain(tr.ui.ai.connected);
    wrapper.unmount();
  });
  it('starts a separate connection for another workspace even when a saved login is pending', async () => {
    const wrapper = render({
      ...disconnected,
      signingIn: true,
      accounts: [
        {
          id: 'oaiapp_personal',
          label: 'ChatGPT 1',
          email: null,
          verified: false,
          connected: false,
          planEnabled: false,
        },
      ],
    });
    expect(wrapper.text()).toContain(tr.ui.ai.savedAccountHint);
    const newAccount = wrapper.findAll('button').find((button) => button.text() === tr.ui.ai.addAccount)!;
    expect(newAccount.attributes('disabled')).toBeUndefined();
    await newAccount.trigger('click');
    expect(wrapper.emitted('command')?.[0]).toEqual([{ action: 'connect', accountId: null }]);
    wrapper.unmount();
  });
  it('offers the Codex sign-in for work accounts, also while another sign-in is pending', async () => {
    const wrapper = render({ ...disconnected, signingIn: true });
    const codex = wrapper.findAll('button').find((button) => button.text() === tr.ui.ai.codexConnect)!;
    expect(codex.attributes('disabled')).toBeUndefined();
    expect(wrapper.text()).toContain(tr.ui.ai.codexHint);
    await codex.trigger('click');
    const proceed = wrapper
      .findAll('button')
      .find((button) => button.text() === tr.ui.ai.codexWarningContinue)!;
    expect(proceed.attributes('disabled')).toBeUndefined();
    await proceed.trigger('click');
    expect(wrapper.emitted('command')?.[0]).toEqual([
      { action: 'connect', accountId: null, signIn: 'codex' },
    ]);
    expect(wrapper.find('.ew-ai-codex-warning').exists()).toBe(false);
    wrapper.unmount();
  });
  it('shows the risks of the Codex sign-in and starts it only after confirmation', async () => {
    const wrapper = render(disconnected);
    const codex = () => wrapper.findAll('button').find((button) => button.text() === tr.ui.ai.codexConnect)!;
    expect(wrapper.find('.ew-ai-codex-warning').exists()).toBe(false);
    expect(codex().attributes('aria-expanded')).toBe('false');

    await codex().trigger('click');
    const warning = wrapper.get('.ew-ai-codex-warning');
    expect(codex().attributes('aria-expanded')).toBe('true');
    expect(warning.attributes('id')).toBe(codex().attributes('aria-controls'));
    expect(warning.text()).toContain(tr.ui.ai.codexWarningTitle);
    for (const line of tr.ui.ai.codexWarning) expect(warning.text()).toContain(line);
    expect(wrapper.emitted('command')).toBeUndefined();

    // Cancel closes it without signing in.
    await warning
      .findAll('button')
      .find((button) => button.text() === tr.ui.ai.cancel)!
      .trigger('click');
    expect(wrapper.find('.ew-ai-codex-warning').exists()).toBe(false);
    expect(wrapper.emitted('command')).toBeUndefined();

    // Escape closes it too; the button toggles it.
    await codex().trigger('click');
    await wrapper.get('.ew-ai-codex-warning').trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('.ew-ai-codex-warning').exists()).toBe(false);
    await codex().trigger('click');
    await codex().trigger('click');
    expect(wrapper.find('.ew-ai-codex-warning').exists()).toBe(false);
    expect(wrapper.emitted('command')).toBeUndefined();
    wrapper.unmount();
  });
  it('marks Codex connections and explains how they are billed and ended', async () => {
    const work = {
      id: 'codex_work',
      label: 'İş',
      email: 'w@example.test',
      verified: true,
      connected: true,
      planEnabled: true,
      signIn: 'codex' as const,
    };
    const wrapper = render({
      ...disconnected,
      activeAccountId: 'codex_work',
      // Helper apps released before the Codex sign-in do not report `signIn`.
      accounts: [{ ...work, id: 'oaiapp_personal', label: 'Kişisel', signIn: undefined }, work],
    });
    const options = wrapper.findAll('option').map((option) => option.text());
    expect(options).toContain(`İş · w@example.test · ${tr.ui.ai.codexSignIn}`);
    expect(options).toContain('Kişisel · w@example.test');
    expect(wrapper.text()).toContain(tr.ui.ai.codexConnectionHelp);
    await wrapper.get('.ew-select').setValue('oaiapp_personal');
    expect(wrapper.text()).toContain(tr.ui.ai.connectionHelp);
    wrapper.unmount();
  });
  it.each([
    [false, tr.ui.ai.planDisabled],
    [true, tr.ui.ai.generationUnavailable],
  ])('does not present sign-in as generation readiness (plan permission: %s)', (planEnabled, message) => {
    const wrapper = render({
      ...disconnected,
      activeAccountId: 'oaiapp_saved',
      accounts: [
        {
          id: 'oaiapp_saved',
          label: 'ChatGPT 1',
          email: 'test@example.test',
          verified: true,
          connected: true,
          planEnabled,
        },
      ],
    });
    expect(wrapper.text()).toContain(message);
    expect(wrapper.text()).not.toContain(tr.ui.ai.connected);
    expect(wrapper.find('select[id*="model"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it('offers recognizable ChatGPT sign-in and explicitly separates API billing', async () => {
    const wrapper = render(disconnected);
    const button = wrapper.findAll('button').find((button) => button.text() === 'Continue with ChatGPT')!;
    await button.trigger('click');
    expect(wrapper.emitted('command')?.[0]).toEqual([{ action: 'connect', accountId: null }]);
    expect(wrapper.text()).toContain('Plus ve Pro');
    expect(wrapper.find('a').attributes('href')).toBe('https://chatgpt.com/settings/usage');
    wrapper.unmount();
  });
  it('without the background shows that setup is needed, without developer instructions', () => {
    const wrapper = render(null);
    expect(wrapper.get('.ew-status-pill').text()).toBe(tr.ui.ai.statusSetup);
    expect(wrapper.find('details').exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/pnpm|docs\//);
    expect(wrapper.find('input[type=password]').exists()).toBe(false);
    wrapper.unmount();
  });

  it.each(['chatgpt', 'claude-code'] as const)(
    'shows the helper slot in place of %s settings while the helper app is missing',
    (mode: AiMode) => {
      const wrapper = render({ ...withApiKey(), mode });
      expect(wrapper.get('.ew-status-pill').text()).toBe(tr.ui.ai.statusSetup);
      expect(wrapper.text()).toContain(tr.ui.ai.helperRequired);
      expect(wrapper.text()).not.toContain('Continue with ChatGPT');
      wrapper.unmount();
    },
  );

  it('marks ChatGPT as recommended, Claude as experimental and both as needing the helper app', () => {
    const wrapper = render(disconnected);
    const methods = wrapper.findAll('.ew-method');
    expect(methods[0]!.text()).toContain(tr.ui.ai.recommended);
    expect(methods[1]!.text()).not.toContain(tr.ui.ai.needsHelper);
    expect(methods[2]!.text()).toContain(tr.ui.ai.experimental);
    expect(methods.filter((method) => method.text().includes(tr.ui.ai.needsHelper))).toHaveLength(2);
    wrapper.unmount();
  });
  describe('Claude plan method', () => {
    const claude = {
      ...disconnected,
      mode: 'claude-code' as const,
      models: [
        { id: 'sonnet', label: 'Claude Sonnet' },
        { id: 'opus', label: 'Claude Opus' },
      ],
      selectedModel: 'sonnet',
    };
    const signedIn = {
      installed: true,
      loggedIn: true,
      subscription: true,
      plan: 'team',
      account: 'c@example.test',
      organization: 'Acme',
    };

    it('offers the method and switches to it', async () => {
      const wrapper = render(disconnected);
      const method = wrapper.get('input[type=radio][value="claude-code"]');
      expect(method.element.closest('label')?.textContent).toContain(tr.ui.ai.claudeCode);
      expect(method.element.closest('label')?.textContent).toContain(tr.ui.ai.methodHints['claude-code']);
      await method.setValue(true);
      expect(wrapper.emitted('command')?.[0]).toEqual([{ action: 'set-mode', mode: 'claude-code' }]);
      wrapper.unmount();
    });

    it('shows the signed-in Claude Code account, the model choice and the Anthropic privacy note', async () => {
      const wrapper = render({ ...claude, ready: true, claudeCode: signedIn });
      expect(wrapper.text()).toContain(tr.ui.ai.connected);
      expect(wrapper.text()).toContain(`${tr.ui.ai.claudeAccount}: c@example.test · Acme · Team`);
      expect(wrapper.text()).toContain(tr.ui.ai.claudePrivacy);
      expect(wrapper.text()).not.toContain(tr.ui.ai.privacy);
      expect(wrapper.find('input[type=password]').exists()).toBe(false);
      expect(wrapper.text()).not.toContain('Continue with ChatGPT');
      await wrapper.get('select').setValue('opus');
      expect(wrapper.emitted('command')?.[0]).toEqual([{ action: 'set-model', model: 'opus' }]);
      wrapper.unmount();
    });

    it('explains how to install or sign in, and warns when Claude Code is not on a subscription', () => {
      const missing = render({
        ...claude,
        claudeCode: {
          ...signedIn,
          installed: false,
          loggedIn: false,
          account: null,
          organization: null,
          plan: null,
        },
      });
      expect(missing.text()).toContain(tr.ui.ai.claudeNotInstalled);
      missing.unmount();
      const signedOut = render({
        ...claude,
        claudeCode: { ...signedIn, loggedIn: false, account: null, organization: null, plan: null },
      });
      expect(signedOut.text()).toContain(tr.ui.ai.claudeNotLoggedIn);
      expect(signedOut.text()).not.toContain(tr.ui.ai.claudeAccount);
      signedOut.unmount();
      const apiBilled = render({ ...claude, ready: true, claudeCode: { ...signedIn, subscription: false } });
      expect(apiBilled.text()).toContain(tr.ui.ai.claudeApiBilling);
      apiBilled.unmount();
    });
  });
  it('shows a status badge: ready, setup needed or connection needed', () => {
    const ready = render(withApiKey({ savedKeys: ['groq'], access: true, selectedModel: 'm' }, true));
    expect(ready.get('.ew-status-pill').text()).toBe(tr.ui.ai.statusReady);
    expect(ready.get('.ew-status-pill').attributes('data-tone')).toBe('success');
    ready.unmount();
    const missing = render(null);
    expect(missing.get('.ew-status-pill').text()).toBe(tr.ui.ai.statusSetup);
    missing.unmount();
    const signedOut = render(disconnected);
    expect(signedOut.get('.ew-status-pill').text()).toBe(tr.ui.ai.statusAction);
    signedOut.unmount();
  });
});

describe('API key method', () => {
  it('offers the providers without the helper app and links to the chosen provider’s key page', async () => {
    const wrapper = render(withApiKey());
    expect(wrapper.findAll('.ew-segmented__option').map((option) => option.text())).toEqual([
      'Groq',
      'OpenRouter',
      'OpenAI',
    ]);
    expect(wrapper.text()).toContain(tr.ui.ai.providerHints.groq);
    expect(wrapper.get('a.ew-ai-settings__usage').attributes('href')).toBe('https://console.groq.com/keys');
    expect(wrapper.get('input[type=password]').attributes('placeholder')).toBe('gsk_…');
    expect(wrapper.text()).toContain(tr.ui.ai.apiPrivacy('Groq'));
    await wrapper.get('input[type=radio][value="openrouter"]').setValue(true);
    expect(wrapper.emitted('command')).toEqual([[{ action: 'select-api-provider', provider: 'openrouter' }]]);
    wrapper.unmount();
  });

  it('sends the key once with its provider, clears the field and never shows a saved key', async () => {
    const wrapper = render(withApiKey());
    const field = wrapper.get('input[type=password]');
    await field.setValue('  gsk_private-test-key  ');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('command')).toEqual([
      [{ action: 'save-api-key', provider: 'groq', apiKey: 'gsk_private-test-key' }],
    ]);
    expect((field.element as HTMLInputElement).value).toBe('');
    await wrapper.setProps({
      status: withApiKey({ savedKeys: ['groq'], access: true, selectedModel: 'openai/gpt-oss-120b' }, true),
    });
    expect(wrapper.text()).toContain(tr.ui.ai.keySaved('Groq'));
    expect(wrapper.text()).toContain(tr.ui.ai.replaceKeyHint);
    expect(wrapper.html()).not.toContain('gsk_private-test-key');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === tr.ui.ai.removeKey)!
      .trigger('click');
    expect(wrapper.emitted('command')?.[1]).toEqual([{ action: 'remove-api-key', provider: 'groq' }]);
    wrapper.unmount();
  });

  it('does not send a key in another provider’s format, and clears a typed key when the provider changes', async () => {
    const wrapper = render(withApiKey());
    await wrapper.get('input[type=password]').setValue('sk-or-v1-private-test-key');
    expect(wrapper.text()).toContain(tr.ui.ai.keyFromOtherProvider('OpenRouter'));
    expect(wrapper.get('button[type=submit]').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('command')).toBeUndefined();
    await wrapper.setProps({ status: withApiKey({ provider: 'openrouter' }) });
    expect((wrapper.get('input[type=password]').element as HTMLInputElement).value).toBe('');
    wrapper.unmount();
  });

  it('lists free models in their own group and changes the model', async () => {
    const wrapper = render(
      withApiKey(
        {
          provider: 'openrouter',
          savedKeys: ['openrouter'],
          access: true,
          models: [
            { id: 'vendor/free:free', label: 'Vendor (free)', free: true },
            { id: 'vendor/paid', label: 'Vendor', free: false },
          ],
          selectedModel: 'vendor/free:free',
        },
        true,
      ),
    );
    expect(wrapper.findAll('optgroup').map((group) => group.attributes('label'))).toEqual([
      tr.ui.ai.freeModels,
      tr.ui.ai.paidModels,
    ]);
    await wrapper.get('select').setValue('vendor/paid');
    expect(wrapper.emitted('command')).toEqual([[{ action: 'set-model', model: 'vendor/paid' }]]);
    wrapper.unmount();
  });

  it('asks for access again when the browser no longer lets the extension reach the provider', async () => {
    const wrapper = render(withApiKey({ savedKeys: ['groq'], access: false }));
    expect(wrapper.text()).toContain(tr.ui.ai.accessNeeded('Groq'));
    await wrapper
      .findAll('button')
      .find((button) => button.text() === tr.ui.ai.grantAccess)!
      .trigger('click');
    expect(wrapper.emitted('grant-access')).toEqual([['groq']]);
    wrapper.unmount();
  });
});

describe('AI connection guide', () => {
  const guide = (mode: AiStatus['mode'] | null) =>
    mount(AiConnectionGuide, { props: { text: tr.ui.ai, mode } });

  it('lists what each method needs, opens the selected one and links to official setup pages', () => {
    const wrapper = guide('claude-code');
    const items = wrapper.findAll('details');
    expect(items.map((item) => item.attributes('data-mode'))).toEqual([
      'chatgpt',
      'api-key',
      'claude-code',
      'helper',
    ]);
    expect(items.map((item) => item.attributes('open') !== undefined)).toEqual([false, false, true, false]);

    const claude = items[2]!;
    expect(claude.text()).toContain(tr.ui.ai.guide.current);
    expect(claude.text()).toContain('Claude Pro, Max, Team veya Enterprise');
    // `claude` and `/login` are shown as commands.
    expect(claude.findAll('code').map((code) => code.text())).toEqual(['claude', '/login']);
    expect(claude.get('a').attributes('href')).toBe('https://code.claude.com/docs/en/setup');
    expect(items[1]!.findAll('a').map((link) => link.attributes('href'))).toEqual([
      'https://console.groq.com/keys',
      'https://openrouter.ai/settings/keys',
      'https://platform.openai.com/api-keys',
    ]);
    expect(items[0]!.text()).toContain('Plus veya Pro');
    expect(items[3]!.text()).toContain('Windows');
    wrapper.unmount();
  });

  it('opens nothing when no method is known yet', () => {
    const wrapper = guide(null);
    expect(wrapper.findAll('details[open]')).toHaveLength(0);
    wrapper.unmount();
  });
});
