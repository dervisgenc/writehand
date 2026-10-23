import { mount } from '@vue/test-utils';
import { tr } from '@writehand/locales';
import {
  ComposeToolbar,
  ContextInspector,
  InlineAssistant,
  provideUiText,
  ResultPreview,
  WriterPanel,
  type ContextMessageView,
  type ContextView,
  type PanelView,
  type QuickActionRequest,
  type UiText,
} from '@writehand/ui';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';

const emptyContext: ContextView = {
  status: 'not-loaded',
  required: false,
  needsReplyTarget: false,
  notices: [],
  messages: [],
  errorCode: null,
};

function view(overrides: Partial<PanelView> = {}): PanelView {
  return {
    operation: 'revise',
    writeOperation: 'reply',
    target: { kind: 'composer', isReply: true },
    source: {
      origin: 'draft-selection',
      text: 'toplantı yarın olsun mu',
      instruction: '',
      edited: false,
      pendingReplace: null,
      canLoadDraft: true,
      canLoadSelection: true,
      canLoadReceivedSelection: false,
      isReading: false,
    },
    options: {
      targetLanguage: 'en',
      tone: 'neutral',
      showTargetLanguage: false,
      showTone: true,
      useConversation: false,
      showUseConversation: true,
    },
    context: emptyContext,
    fieldErrors: {},
    prepare: { canPrepare: false, blocker: 'PROCESSING_UNAVAILABLE', isPreparing: false },
    preview: null,
    refine: { available: false, rich: true },
    apply: {
      mode: 'replace-selection',
      canApply: false,
      blocker: null,
      canCopy: false,
      canUndo: false,
      isApplying: false,
      canReplaceExistingReply: false,
      canUseOpenComposer: false,
      canCreateReply: false,
    },
    status: { kind: 'none' },
    staleNotice: null,
    ...overrides,
  };
}

const textRef = ref<UiText>(tr.ui);

/** Mounts the component under a root that provides the text dictionary, as the extension does. */
function withText(child: unknown, props: Record<string, unknown>, listeners: Record<string, unknown> = {}) {
  const Host = defineComponent({
    setup() {
      provideUiText(textRef);
      return () => h(child as never, { ...props, ...listeners });
    },
  });
  return mount(Host, { attachTo: document.body });
}

describe('WriterPanel', () => {
  it('opens as an accessible, non-modal dialog', () => {
    const wrapper = withText(WriterPanel, { view: view(), limits: { source: 20_000, instruction: 5_000 } });
    const dialog = wrapper.get('[role="dialog"]');
    const titleId = dialog.attributes('aria-labelledby');

    expect(titleId).toBeTruthy();
    expect(wrapper.get(`#${CSS.escape(titleId!)}`).text()).toBe('Yazma yardımcısı');
    expect(dialog.attributes('aria-modal')).toBeUndefined();
    wrapper.unmount();
  });

  it('explains why the button is disabled when text processing is not connected', () => {
    const wrapper = withText(WriterPanel, { view: view(), limits: { source: 20_000, instruction: 5_000 } });
    const button = wrapper.get('.ew-prepare button');

    expect(button.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Metin işleme henüz bağlanmadı');
    wrapper.unmount();
  });

  it('emits user events and closes on Escape', async () => {
    const events: string[] = [];
    const wrapper = withText(
      WriterPanel,
      {
        view: view({ prepare: { canPrepare: true, blocker: null, isPreparing: false } }),
        limits: { source: 20_000, instruction: 5_000 },
      },
      {
        onPrepare: () => events.push('prepare'),
        onClose: () => events.push('close'),
        onSourceChange: (text: string) => events.push(`source:${text}`),
        onOperationChange: (operation: string) => events.push(`operation:${operation}`),
      },
    );

    await wrapper.get('.ew-prepare button').trigger('click');
    await wrapper.get('textarea').setValue('yeni metin');
    // Order: Yanıt hazırla (Draft reply), Düzelt (Revise), Çevir (Translate).
    await wrapper.findAll('[role="radio"]')[2]!.trigger('click');
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });

    expect(events).toEqual(['prepare', 'source:yeni metin', 'operation:translate', 'close']);
    wrapper.unmount();
  });

  it('shows the instruction field and target language when drafting a reply', () => {
    const wrapper = withText(WriterPanel, {
      view: view({
        operation: 'reply',
        options: { ...view().options, showTargetLanguage: true, showUseConversation: false },
        source: { ...view().source, instruction: 'Kibarca teşekkür et' },
      }),
      limits: { source: 20_000, instruction: 5_000 },
    });

    expect(wrapper.get('textarea').element.value).toBe('Kibarca teşekkür et');
    expect(wrapper.text()).toContain('Yanıt talimatı');
    expect(wrapper.find('select').exists()).toBe(true);
    wrapper.unmount();
  });

  it('asks for confirmation before reloading the source over edited text', () => {
    const wrapper = withText(WriterPanel, {
      view: view({ source: { ...view().source, edited: true, pendingReplace: 'draft' } }),
      limits: { source: 20_000, instruction: 5_000 },
    });

    expect(wrapper.text()).toContain('Paneldeki metniniz değiştirilecek.');
    expect(wrapper.text()).toContain('düzenlendi');
    wrapper.unmount();
  });

  it('offers to open a new reply when no draft is open, then names it as the target', async () => {
    const targets: string[] = [];
    const readMode = view({
      operation: 'reply',
      target: { kind: 'none' },
      source: { ...view().source, origin: 'panel', text: '', instruction: 'Teşekkür et' },
      preview: { text: 'Teşekkürler, perşembe uygun.', sample: false, stale: false, unchanged: false },
      apply: { ...view().apply, mode: null, canCopy: true, canCreateReply: true },
    });
    const offered = withText(
      WriterPanel,
      { view: readMode, limits: { source: 20_000, instruction: 5_000 } },
      { onBindTarget: (mode: string) => targets.push(mode) },
    );
    const open = offered.findAll('button').find((b) => b.text() === 'Bu metinle yanıt aç');
    await open!.trigger('click');
    expect(targets).toEqual(['create-reply']);
    offered.unmount();

    const bound = withText(WriterPanel, {
      view: {
        ...readMode,
        target: { kind: 'new-reply' },
        apply: { ...readMode.apply, mode: 'create-reply', canApply: true, canCreateReply: false },
      },
      limits: { source: 20_000, instruction: 5_000 },
    });
    expect(bound.text()).toContain('Bu e-postaya yeni yanıt');
    expect(bound.text()).toContain('Bu e-postaya taslak olarak açılan yeni bir yanıt');
    // A new reply changes no existing text, so the formatting note does not apply.
    expect(bound.text()).not.toContain('değişen bölümdeki biçim');
    bound.unmount();
  });
});

describe('ResultPreview', () => {
  it('labels a sample result and does not run HTML', () => {
    const wrapper = withText(ResultPreview, {
      preview: {
        text: '<b>kalın</b><img src=x onerror=alert(1)>',
        sample: true,
        stale: false,
        unchanged: false,
      },
      error: null,
      disabled: false,
    });

    expect(wrapper.text()).toContain('Örnek sonuç — geliştirme modu');
    expect(wrapper.get('textarea').element.value).toBe('<b>kalın</b><img src=x onerror=alert(1)>');
    expect(wrapper.find('b').exists()).toBe(false);
    expect(wrapper.find('img').exists()).toBe(false);
    wrapper.unmount();
  });

  it('explains that a stale preview cannot be applied', () => {
    const wrapper = withText(ResultPreview, {
      preview: { text: 'Metin', sample: false, stale: true, unchanged: false },
      error: null,
      disabled: false,
    });
    expect(wrapper.text()).toContain('kopyalanabilir ama taslağa uygulanamaz');
    wrapper.unmount();
  });
});

describe('ContextInspector', () => {
  const context: ContextView = {
    status: 'ready',
    required: true,
    needsReplyTarget: false,
    notices: [
      { kind: 'message-count', count: 2 },
      { kind: 'collapsed-unread', count: 1 },
      { kind: 'coverage-unverified' },
    ],
    messages: [
      contextMessage({
        messageKey: 'm1',
        senderLabel: 'Mehmet Demir',
        sentAtText: 'Cum 11:00',
        preview: 'Merhaba Ayşe',
        text: 'Merhaba Ayşe',
        omittedBlocks: [{ blockIndex: 1, kind: 'signature', text: 'Saygılarımla' }],
      }),
      contextMessage({
        messageKey: 'm2',
        senderLabel: null,
        preview: 'Hi',
        text: 'Hi',
        locked: true,
        isReplyTarget: true,
      }),
    ],
    errorCode: null,
  };

  it('does not hide missing coverage behind a generic "ready" message', () => {
    const wrapper = withText(ContextInspector, { context, disabled: false });

    expect(wrapper.text()).toContain('2/2 mesaj kullanılıyor');
    expect(wrapper.text()).toContain('1 mesaj kapalı; içerikleri okunmadı.');
    expect(wrapper.text()).toContain('mesajların tamamına erişildiği doğrulanamıyor');
    wrapper.unmount();
  });

  it('locks the selection of the active message and lets a removed block be included again', async () => {
    const included: unknown[] = [];
    const wrapper = withText(
      ContextInspector,
      { context, disabled: false },
      {
        onBlockInclude: (key: string, index: number) => included.push([key, index]),
      },
    );
    const checkboxes = wrapper.findAll('input[type="checkbox"]');

    expect(checkboxes[1]!.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Gönderen okunamadı');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Geri dahil et')!
      .trigger('click');
    expect(included).toEqual([['m1', 1]]);
    wrapper.unmount();
  });

  it('asks the user to pick the reply target when the active message is not recognized', async () => {
    const chosen: string[] = [];
    const wrapper = withText(
      ContextInspector,
      { context: { ...context, needsReplyTarget: true }, disabled: false },
      { onReplyTargetChange: (key: string) => chosen.push(key) },
    );

    expect(wrapper.text()).toContain('Yanıt verilecek mesajı seçin');
    await wrapper.findAll('input[type="radio"]')[0]!.trigger('change');
    expect(chosen).toEqual(['m1']);
    wrapper.unmount();
  });

  it('shows messages opened from other conversations in a separate collapsed group and adds them to the context when checked', async () => {
    const changes: unknown[] = [];
    const wrapper = withText(
      ContextInspector,
      {
        context: {
          ...context,
          messages: [
            ...context.messages,
            contextMessage({ messageKey: 'o1', group: 'other', included: false, subject: 'Fatura' }),
          ],
        },
        disabled: false,
      },
      { onContextSelectionChange: (key: string, included: boolean) => changes.push([key, included]) },
    );

    expect(wrapper.text()).toContain('Bu konuşma');
    const toggle = wrapper.findAll('button').find((b) => b.text().includes('Diğer açılan e-postalar (1)'))!;
    expect(toggle.attributes('aria-expanded')).toBe('false');
    await toggle.trigger('click');
    expect(wrapper.text()).toContain('Fatura');

    const otherCheckbox = wrapper.findAll('input[type="checkbox"]')[2]!;
    (otherCheckbox.element as HTMLInputElement).checked = true;
    await otherCheckbox.trigger('change');
    expect(changes).toEqual([['o1', true]]);
    wrapper.unmount();
  });

  it('saves an edited message text or reverts it to the original', async () => {
    const edits: unknown[] = [];
    const wrapper = withText(
      ContextInspector,
      {
        context: {
          ...context,
          messages: [contextMessage({ messageKey: 'm1', text: 'Uzun metin', edited: true })],
        },
        disabled: false,
      },
      { onContextTextChange: (key: string, text: string | null) => edits.push([key, text]) },
    );

    await wrapper.get('button[aria-label="Düzenle"]').trigger('click');
    const editor = wrapper.get('textarea');
    expect((editor.element as HTMLTextAreaElement).value).toBe('Uzun metin');
    await editor.setValue('Kısa metin');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Kaydet')!
      .trigger('click');

    await wrapper.get('button[aria-label="Düzenle"]').trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Orijinale dön'))!
      .trigger('click');

    expect(edits).toEqual([
      ['m1', 'Kısa metin'],
      ['m1', null],
    ]);
    expect(wrapper.text()).toContain('Düzenlendi');
    wrapper.unmount();
  });
});

describe('ComposeToolbar', () => {
  function toolbar(
    props: Partial<{ isReply: boolean; busyOperation: string | null; defaultLanguage: string }> = {},
  ) {
    const requests: unknown[] = [];
    const wrapper = withText(
      ComposeToolbar,
      {
        isReply: true,
        busyOperation: null,
        defaultLanguage: 'en',
        favoriteLanguages: ['en', 'tr', 'de', 'pt-BR', 'Kurmancî'],
        ...props,
      },
      {
        onQuickAction: (request: QuickActionRequest) => requests.push(request),
        onOpenPanel: () => requests.push('panel'),
        onManageLanguages: () => requests.push('languages'),
      },
    );
    return { wrapper, requests };
  }

  it('requests the Yanıt yaz (Write reply), Düzelt (Revise) and Çevir (Translate) actions directly in a reply draft', async () => {
    const { wrapper, requests } = toolbar();
    const button = (label: string) => wrapper.findAll('button').find((b) => b.text() === label)!;

    await button('Yanıt yaz').trigger('click');
    await button('Düzelt').trigger('click');
    await button('Çevir').trigger('click');
    await wrapper.get('button[aria-label="Yazma yardımcısını panelde aç"]').trigger('click');

    expect(requests).toEqual([
      { operation: 'reply' },
      { operation: 'revise' },
      { operation: 'translate', language: 'en' },
      'panel',
    ]);
    expect(wrapper.get('[role="toolbar"]').attributes('aria-label')).toBe('Writehand');
    wrapper.unmount();
  });

  it('shows "Yaz" (Write) instead of "Yanıt yaz" (Write reply) in a new message and translates into another language from the language menu', async () => {
    const { wrapper, requests } = toolbar({ isReply: false });

    expect(wrapper.text()).not.toContain('Yanıt yaz');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Yaz')!
      .trigger('click');
    await wrapper.get('button[aria-haspopup="menu"]').trigger('click');
    const german = wrapper.findAll('[role="menuitemradio"]').find((item) => item.text() === 'Almanca')!;
    await german.trigger('click');

    expect(requests).toEqual([{ operation: 'compose' }, { operation: 'translate', language: 'de' }]);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('lists the default language first in the Çevir (Translate) menu, favorites by their localized names and a hand-typed language as is', async () => {
    const { wrapper, requests } = toolbar({ defaultLanguage: 'de' });
    await wrapper.get('button[aria-haspopup="menu"]').trigger('click');

    const items = wrapper.findAll('[role="menuitemradio"]').map((item) => item.text());
    expect(items).toEqual(['Almanca', 'İngilizce', 'Türkçe', 'Brezilya Portekizcesi', 'Kurmancî']);
    const actions = wrapper.findAll('[role="menuitem"]');
    await actions[0]!.trigger('click');
    await wrapper.get('button[aria-haspopup="menu"]').trigger('click');
    await wrapper.findAll('[role="menuitem"]')[1]!.trigger('click');

    // "Başka bir dil…" (Another language…) requests a translation without a language so it can ask for one; "Dilleri düzenle" (Edit languages) opens the settings.
    expect(requests).toEqual([{ operation: 'translate', language: null }, 'languages']);
    wrapper.unmount();
  });

  it('disables the buttons while an action runs and shows progress on the running one', () => {
    const { wrapper } = toolbar({ busyOperation: 'revise' });

    for (const button of wrapper.findAll('[role="toolbar"] > button, .ew-bar-split > button')) {
      if (button.attributes('aria-label') !== 'Yazma yardımcısını panelde aç') {
        expect(button.attributes('disabled')).toBeDefined();
      }
    }
    expect(wrapper.find('.ew-spinner').exists()).toBe(true);
    wrapper.unmount();
  });
});

describe('InlineAssistant', () => {
  it('submits the instruction on Enter in the reply card and shows the context count', async () => {
    const submitted: string[] = [];
    const wrapper = withText(
      InlineAssistant,
      {
        view: view({
          operation: 'reply',
          prepare: { canPrepare: true, blocker: null, isPreparing: false },
          context: {
            ...emptyContext,
            status: 'ready',
            required: true,
            messages: [
              contextMessage({ messageKey: 'm1' }),
              contextMessage({ messageKey: 'm2', included: false }),
            ],
          },
        }),
      },
      { onSubmitInstruction: (text: string) => submitted.push(text) },
    );

    expect(wrapper.text()).toContain('Yanıt taslağı');
    expect(wrapper.text()).toContain('Bağlam · 1 mesaj');
    const field = wrapper.get('textarea');
    await field.setValue('Perşembe uygun de');
    await field.trigger('keydown', { key: 'Enter' });

    expect(submitted).toEqual(['Perşembe uygun de']);
    wrapper.unmount();
  });

  it('shows the result and emits the apply, copy and undo events', async () => {
    const events: string[] = [];
    const wrapper = withText(
      InlineAssistant,
      {
        view: view({
          preview: { text: 'Toplantıyı yarın yapabiliriz.', sample: true, stale: false, unchanged: false },
          apply: { ...view().apply, canApply: true, canCopy: true, canUndo: true },
        }),
      },
      {
        onApply: () => events.push('apply'),
        onCopy: () => events.push('copy'),
        onUndo: () => events.push('undo'),
        onClose: () => events.push('close'),
      },
    );

    expect(wrapper.text()).toContain('Düzeltme önerisi');
    expect(wrapper.get('.ew-badge--sample').attributes('aria-label')).toBe('Örnek sonuç — geliştirme modu');
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
      'Toplantıyı yarın yapabiliriz.',
    );
    const button = (label: string) => wrapper.findAll('button').find((b) => b.text().includes(label))!;
    await button('Taslağa uygula').trigger('click');
    await button('Kopyala').trigger('click');
    await button('Son uygulamayı geri al').trigger('click');
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });

    expect(events).toEqual(['apply', 'copy', 'undo', 'close']);
    wrapper.unmount();
  });

  it('shows progress while preparing and the reason when blocked', () => {
    const busy = withText(InlineAssistant, {
      view: view({ status: { kind: 'busy', activity: 'preparing' } }),
    });
    expect(busy.text()).toContain('İşlem hazırlanıyor…');
    busy.unmount();

    const blocked = withText(InlineAssistant, { view: view() });
    expect(blocked.text()).toContain('Metin işleme henüz bağlanmadı');
    blocked.unmount();
  });
});

function contextMessage(overrides: Partial<ContextMessageView> & { messageKey: string }): ContextMessageView {
  return {
    senderLabel: `Gönderen ${overrides.messageKey}`,
    sentAtText: null,
    subject: null,
    group: 'current',
    preview: 'Önizleme',
    text: 'Metin',
    included: true,
    edited: false,
    locked: false,
    isReplyTarget: false,
    omittedBlocks: [],
    ...overrides,
  };
}
