import { aiInputSchema, buildTaskPrompt, DEFAULT_SETTINGS, toAiInput } from '@writehand/contracts';
import { createSession, deriveCapabilities } from '@writehand/core';
import {
  createActionController,
  createApplyController,
  createMessageHistory,
  createPanelController,
  createSessionStore,
  toPanelView,
} from '@writehand/session';
import { afterEach, describe, expect, it } from 'vitest';

import { createFixtureProcessor } from '../../../apps/browser-extension/src/development/fixture-results';
import { body, message, thread, threadB } from '../../fixtures/synthetic-mail/threads';
import { fixedClock, sequentialIds } from '../../unit/test-dependencies';
import { FakeConnector } from './fake-connector';

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

/** The user opens an email with another subject from the list. */
function switchToInvoice(connector: FakeConnector) {
  const previous = connector.thread;
  connector.thread = threadB;
  connector.threadSnapshot = thread([message('b1', 0, [body('Fatura ekte')])], {
    ref: threadB,
    subject: 'Fatura',
  });
  connector.emit({ type: 'active-thread-changed', previous, current: threadB });
}

function setup(options: { processorDelayMs?: number; processor?: boolean } = {}) {
  const connector = new FakeConnector();
  const ids = sequentialIds('op');
  const store = createSessionStore(
    createSession({
      sessionId: 's0',
      thread: connector.thread,
      defaults: { targetLanguage: 'en', tone: 'neutral' },
    }),
  );
  const processor =
    options.processor === false ? null : createFixtureProcessor({ delayMs: options.processorDelayMs ?? 0 });
  const history = createMessageHistory({ connector, isEnabled: () => true, debounceMs: 0 });
  const actions = createActionController({ store, connector, processor, history, clock: fixedClock(), ids });
  history.subscribe((snapshot) => actions.threadCaptured(snapshot));
  const copied: string[] = [];
  const applier = createApplyController({
    store,
    connector,
    ids,
    copyText: async (content) => {
      copied.push(content.text);
      return { ok: true, value: undefined };
    },
  });
  const panel = createPanelController({ store, connector, actions, ids, settings: () => DEFAULT_SETTINGS });
  const view = () =>
    toPanelView({
      state: store.getState(),
      capabilities: deriveCapabilities(store.getState(), { processingAvailable: processor !== null }),
      page: connector.getPageState(),
      ui: { pendingReplace: null, replyReplaceComposer: null, notice: null },
      history: history.entries(),
    });
  return { connector, store, actions, applier, panel, history, view, copied };
}

describe('Panel flow (with a fake connector)', () => {
  let current: ReturnType<typeof setup> | null = null;
  afterEach(() => {
    current?.actions.dispose();
    current?.panel.dispose();
    current?.history.dispose();
    current = null;
  });

  it('the draft "Düzelt" (Revise) button runs the action directly: the selection is the source and the card result is applied to the selection', async () => {
    current = setup();
    const { panel, applier, store, connector, view } = current;

    await panel.runQuickAction(connector.composer, { operation: 'revise' });
    expect(panel.surface()).toEqual({ kind: 'inline', composerKey: 'c1' });
    expect(view().source).toMatchObject({ origin: 'draft-selection', text: 'toplantı' });
    expect(view().apply.mode).toBe('replace-selection');
    expect(view().preview).toMatchObject({ text: 'Toplantıyı yarın yapabiliriz.', sample: true });

    await applier.apply();
    expect(connector.applied).toHaveLength(1);
    expect(connector.applied[0]?.target).toMatchObject({
      mode: 'replace-selection',
      selectionId: 'sel-1',
      expectedRevision: 3,
    });
    expect(store.getState().phase.status).toBe('applied');
    expect(view().status).toEqual({ kind: 'success', message: 'applied' });
    expect(view().apply.canUndo).toBe(true);
    // The same result is not written twice, and our own write is not reported as "draft changed".
    expect(view().apply).toMatchObject({ canApply: false, blocker: null });
  });

  it('in a regular build (no text processing) the button explains why and no action record is created', async () => {
    current = setup({ processor: false });
    const { panel, actions, store, connector, view } = current;
    await panel.runQuickAction(connector.composer, { operation: 'revise' });

    expect(view().prepare).toEqual({
      canPrepare: false,
      blocker: 'PROCESSING_UNAVAILABLE',
      isPreparing: false,
    });
    await actions.prepare();
    expect(store.getState().action).toBeNull();
  });

  it('does not show a late result when the source changes while waiting for it', async () => {
    current = setup({ processorDelayMs: 30 });
    const { panel, actions, store, connector } = current;
    panel.open({ origin: 'composer-launcher', composer: connector.composer });
    await tick();

    const pending = actions.prepare();
    await tick();
    store.dispatch({ type: 'form-changed', changes: { sourceText: 'başka metin' } });
    await pending;
    await tick(40);

    expect(store.getState().preview).toBeNull();
    expect(store.getState().phase.status).toBe('editing');
  });

  it('cannot apply a stale result after the user types in the draft while it was being prepared', async () => {
    current = setup();
    const { panel, applier, connector, view } = current;
    await panel.runQuickAction(connector.composer, { operation: 'revise' });

    connector.userTypes(' ve yeni yazı');
    expect(view().staleNotice).toBe('TARGET_CHANGED');
    expect(view().apply.canApply).toBe(false);
    await applier.apply();
    expect(connector.applied).toHaveLength(0);
  });

  it('reads the conversation in reply mode and explains the context when opened from the conversation button', async () => {
    current = setup();
    const { panel, view, connector } = current;

    panel.open({ origin: 'thread-launcher', thread: connector.thread! });
    await tick();

    expect(view().operation).toBe('reply');
    expect(view().context.status).toBe('ready');
    expect(view().context.notices).toContainEqual({ kind: 'message-count', count: 3 });
    expect(view().context.messages.find((message) => message.isReplyTarget)?.locked).toBe(true);
  });

  it('closing the panel cancels the read but keeps the entered text', async () => {
    current = setup();
    const { panel, store, connector } = current;
    connector.readDelayMs = 30;
    panel.open({ origin: 'thread-launcher', thread: connector.thread! });
    store.dispatch({ type: 'form-changed', changes: { instruction: 'Teşekkür et' } });
    panel.close();
    await tick(40);

    expect(panel.isOpen()).toBe(false);
    expect(store.getState().threadSnapshot).toBeNull();
    expect(store.getState().form.instruction).toBe('Teşekkür et');
  });

  it('clears the content of the previous work when the account changes', async () => {
    current = setup();
    const { panel, store, connector } = current;
    panel.open({ origin: 'composer-launcher', composer: connector.composer });
    await tick();

    connector.emit({ type: 'account-changed' });
    expect(store.getState().form.sourceText).toBe('');
    expect(store.getState().staleReason).toBe('account-changed');
  });

  it('starts the work with the new email automatically after switching, and reads the new context if the panel is open', async () => {
    current = setup();
    const { panel, store, connector, view } = current;
    panel.open({ origin: 'thread-launcher', thread: connector.thread! });
    store.dispatch({ type: 'form-changed', changes: { instruction: 'Teşekkür et' } });
    await tick();

    switchToInvoice(connector);
    await tick(5);

    expect(store.getState().thread).toEqual(threadB);
    expect(store.getState().form.instruction).toBe('');
    expect(view().operation).toBe('reply');
    expect(view().staleNotice).toBeNull();
    expect(panel.surface()).toEqual({ kind: 'panel' });
    // The previous conversation's messages stay listed (newest first) but unselected; the new conversation's are in the context.
    expect(view().context.messages.map((m) => [m.messageKey, m.group, m.included])).toEqual([
      ['b1', 'current', true],
      ['m3', 'other', false],
      ['m2', 'other', false],
      ['m1', 'other', false],
    ]);
  });

  it("the button in another email's draft runs the action directly without asking about the previous work", async () => {
    current = setup();
    const { panel, store, connector, view } = current;
    await panel.runQuickAction(connector.composer, { operation: 'revise' });
    expect(view().preview).not.toBeNull();

    // The button in the new email's draft is clicked before the page event arrives.
    connector.thread = threadB;
    connector.composer = { scope: connector.scope, composerKey: 'c2', threadKey: threadB.threadKey };
    await panel.runQuickAction(connector.composer, { operation: 'translate', language: 'en' });

    expect(panel.surface()).toEqual({ kind: 'inline', composerKey: 'c2' });
    expect(store.getState().thread).toEqual(threadB);
    expect(view().staleNotice).toBeNull();
    expect(view().operation).toBe('translate');
    expect(view().preview).toMatchObject({ text: 'We can hold the meeting tomorrow.' });
  });

  it('closes the card when switching to another email while it is open, so the previous result does not show in the new email', async () => {
    current = setup();
    const { panel, store, connector } = current;
    await panel.runQuickAction(connector.composer, { operation: 'revise' });

    switchToInvoice(connector);

    expect(panel.surface()).toEqual({ kind: 'closed' });
    expect(store.getState().thread).toEqual(threadB);
    expect(store.getState().preview).toBeNull();
  });

  it('keeps the typed instruction while composing a new message even if another email is opened', async () => {
    current = setup();
    const { panel, store, connector } = current;
    connector.composer = { ...connector.composer, threadKey: null };
    await panel.runQuickAction(connector.composer, { operation: 'compose' });
    store.dispatch({ type: 'form-changed', changes: { instruction: 'Ekibe toplantı öner' } });

    switchToInvoice(connector);

    expect(store.getState().thread).toBeNull();
    expect(store.getState().form.instruction).toBe('Ekibe toplantı öner');
  });

  it('a ready reply does not go stale when the "Yanıt yaz" (Write reply) card is closed and reopened with the same button, and it is applied to the draft', async () => {
    current = setup();
    const { panel, store, connector, view, applier, actions } = current;
    await panel.runQuickAction(connector.composer, { operation: 'reply' });
    store.dispatch({ type: 'form-changed', changes: { instruction: 'Teşekkür et' } });
    await actions.prepare();
    panel.close();

    await panel.runQuickAction(connector.composer, { operation: 'reply' });
    expect(view().preview).toMatchObject({ stale: false });
    await applier.apply();
    expect(connector.applied).toHaveLength(1);
  });

  it('marks the preview stale when the card is reopened after text was added to the draft, and does not apply it over the new text', async () => {
    current = setup();
    const { panel, store, connector, view, applier, actions } = current;
    connector.selection = null;
    await panel.runQuickAction(connector.composer, { operation: 'reply' });
    store.dispatch({ type: 'form-changed', changes: { instruction: 'Teşekkür et' } });
    await actions.prepare();

    connector.userTypes(' ve yeni yazı');
    await panel.runQuickAction(connector.composer, { operation: 'reply' });
    expect(view().preview).toMatchObject({ stale: true });
    await applier.apply();
    expect(connector.applied).toHaveLength(0);
  });

  it('"Başka bir dil…" (Another language…) opens the card and waits for a language; the translation is prepared in the language picked there', async () => {
    current = setup();
    const { panel, store, connector, view, actions } = current;
    await panel.runQuickAction(connector.composer, { operation: 'translate', language: null });

    expect(panel.surface()).toEqual({ kind: 'inline', composerKey: 'c1' });
    expect(view().source.text).toBe('toplantı');
    expect(store.getState().preview).toBeNull();

    // The card's language row: stores the language and prepares the translation.
    store.dispatch({ type: 'form-changed', changes: { operation: 'translate', targetLanguage: 'Kurmancî' } });
    await actions.prepare();
    expect(store.getState().action?.targetLanguage).toBe('Kurmancî');
    expect(view().preview).not.toBeNull();
  });

  it('the Outlook add-in menu\'s "Revise" opens the panel on the selection and revises it at once', async () => {
    current = setup();
    const { panel, connector, view } = current;
    panel.open({
      origin: 'composer-launcher',
      composer: connector.composer,
      action: { operation: 'revise' },
    });
    await tick(10);

    expect(panel.surface()).toEqual({ kind: 'panel' });
    expect(view().source).toMatchObject({ origin: 'draft-selection', text: 'toplantı' });
    expect(view().preview).toMatchObject({ text: 'Toplantıyı yarın yapabiliriz.' });
  });

  it('the menu\'s "Translate" waits in the panel for a language, and "Write" in a reply draft for an instruction', async () => {
    current = setup();
    const { panel, store, connector, view } = current;
    panel.open({
      origin: 'composer-launcher',
      composer: connector.composer,
      action: { operation: 'translate', language: null },
    });
    await tick(10);
    expect(panel.surface()).toEqual({ kind: 'panel' });
    expect(view().operation).toBe('translate');
    expect(view().source.text).toBe('toplantı');
    expect(store.getState().action).toBeNull();

    panel.open({
      origin: 'composer-launcher',
      composer: connector.composer,
      action: { operation: 'compose' },
    });
    await tick(10);
    expect(view().operation).toBe('reply');
    expect(store.getState().action).toBeNull();
  });

  it("has no target language in a reply's action record; the reply follows the conversation's language", async () => {
    current = setup();
    const { panel, store, connector, actions } = current;
    await panel.runQuickAction(connector.composer, { operation: 'reply' });
    store.dispatch({ type: 'form-changed', changes: { instruction: 'Teşekkür et', targetLanguage: 'de' } });
    await actions.prepare();

    expect(store.getState().action).toMatchObject({ operation: 'reply', targetLanguage: null });
  });

  it('"Kısalt" (Shorten) refines a ready result: the previous result and instruction are sent, and the new result can be applied directly', async () => {
    current = setup();
    const { panel, store, connector, view, actions, applier } = current;
    connector.selection = null;
    await panel.runQuickAction(connector.composer, { operation: 'revise' });
    const first = store.getState().preview!.text;
    expect(view().refine).toEqual({ available: true, rich: true });

    await actions.prepare({ refinement: 'Make it shorter.' });
    expect(store.getState().action?.refinement).toEqual({ instruction: 'Make it shorter.', previous: first });
    expect(view().preview?.stale).toBe(false);
    await applier.apply();
    expect(connector.applied).toHaveLength(1);
  });

  it('does not offer refinements that need formatting for an in-sentence selection', async () => {
    current = setup();
    const { panel, connector, view } = current;
    await panel.runQuickAction(connector.composer, { operation: 'revise' });
    expect(view().refine).toEqual({ available: true, rich: false });
  });

  it('copies only the preview text to the clipboard', async () => {
    current = setup();
    const { panel, applier, connector, copied } = current;
    await panel.runQuickAction(connector.composer, { operation: 'translate', language: 'en' });

    await applier.copy();
    expect(copied).toEqual(['We can hold the meeting tomorrow.']);
  });

  it('the "Yanıt yaz" (Write reply) card waits for an instruction; the context is read in advance and the reply is prepared from the submitted instruction', async () => {
    current = setup();
    const { panel, store, connector, view } = current;

    await panel.runQuickAction(connector.composer, { operation: 'reply' });
    expect(panel.surface()).toEqual({ kind: 'inline', composerKey: 'c1' });
    expect(view().operation).toBe('reply');
    expect(view().context.status).toBe('ready');
    expect(store.getState().preview).toBeNull();

    store.dispatch({ type: 'form-changed', changes: { instruction: 'Kibarca teşekkür et' } });
    await current.actions.prepare();
    expect(view().preview?.text).toMatch(/Mesajınız için teşekkürler/);

    panel.expandToPanel();
    expect(panel.surface()).toEqual({ kind: 'panel' });
  });

  it("does not show the previous action's stale result after the user switches to another action", async () => {
    current = setup();
    const { panel, connector, view } = current;
    await panel.runQuickAction(connector.composer, { operation: 'revise' });
    expect(view().preview).not.toBeNull();

    panel.open({ origin: 'thread-launcher', thread: connector.thread! });
    await tick();

    expect(view().operation).toBe('reply');
    expect(view().preview).toBeNull();
  });

  it('in a new message the "Yaz" (Write) card waits for an instruction and prepares the email text without conversation context', async () => {
    current = setup();
    const { panel, store, connector, view } = current;
    connector.composer = { ...connector.composer, threadKey: null };

    await panel.runQuickAction(connector.composer, { operation: 'compose' });
    expect(view().operation).toBe('compose');
    expect(view().writeOperation).toBe('compose');
    expect(view().context.required).toBe(false);
    expect(store.getState().preview).toBeNull();

    store.dispatch({ type: 'form-changed', changes: { instruction: 'Ekibe perşembe toplantısı öner' } });
    await current.actions.prepare();
    expect(view().preview?.text).toMatch(/Perşembe 14:00/);
    expect(store.getState().action?.context).toBeNull();
  });

  it('routes Write on a bound reply editor through conversation context all the way to the provider prompt', async () => {
    current = setup();
    const { panel, store, connector, actions } = current;
    connector.selection = null;
    connector.threadSnapshot = thread(
      [message('english', 0, [body('The service is still unavailable. Could we discuss the next steps?')])],
      { activeMessageKey: 'english', subject: 'Service review' },
    );

    await panel.runQuickAction(connector.composer, { operation: 'compose' });
    store.dispatch({ type: 'form-changed', changes: { instruction: 'sorunu çözmek için toplantı öner' } });
    await actions.prepare();
    const action = store.getState().action!;
    expect(action.operation).toBe('reply');
    const input = aiInputSchema.parse(toAiInput(action, { standingInstructions: '' }));
    expect(input.messages).toContainEqual(
      expect.objectContaining({
        text: 'The service is still unavailable. Could we discuss the next steps?',
        replyTarget: true,
      }),
    );
    const prompt = buildTaskPrompt(input);
    expect(prompt.user).toContain('<instruction>\nsorunu çözmek için toplantı öner\n</instruction>');
    expect(prompt.user).toContain('reply_target="true"');
    expect(prompt.system).toContain('The language of the main authored text of the reply_target message');
  });

  it('keeps writing input but discards a context-free result when a late quote identifies the editor as a reply', async () => {
    current = setup();
    const { panel, store, connector, actions } = current;
    const replyComposer = connector.composer;
    connector.composer = { ...replyComposer, threadKey: null };
    await panel.runQuickAction(connector.composer, { operation: 'compose' });
    const instruction = 'sorunu çözmek için toplantı öner';
    store.dispatch({ type: 'form-changed', changes: { instruction } });
    await actions.prepare();
    expect(store.getState().preview).not.toBeNull();
    const previous = connector.composer;
    connector.composer = replyComposer;
    connector.emit({ type: 'composer-rebound', previous, ref: replyComposer });
    await tick();
    expect(store.getState().form).toMatchObject({ operation: 'reply', instruction });
    expect(store.getState().preview).toBeNull();
    expect(store.getState().context?.messages.length).toBeGreaterThan(0);
    await actions.prepare();
    expect(store.getState().action).toMatchObject({ operation: 'reply', instruction });
    expect(store.getState().action?.context).not.toBeNull();
  });

  it('uses reply context if the conversation becomes known while the draft is being read', async () => {
    current = setup();
    const { panel, store, connector } = current;
    connector.selection = null;
    const replyComposer = connector.composer;
    connector.composer = { ...replyComposer, threadKey: null };
    const readComposer = connector.readComposer.bind(connector);
    connector.readComposer = async () => {
      const previous = connector.composer;
      connector.composer = replyComposer;
      connector.emit({ type: 'composer-rebound', previous, ref: replyComposer });
      return readComposer(replyComposer);
    };
    await panel.runQuickAction(connector.composer, { operation: 'compose' });
    expect(store.getState().form.operation).toBe('reply');
    expect(store.getState().context?.messages.length).toBeGreaterThan(0);
  });

  it('takes the context and replied-to message from previously opened messages when the reading pane turns into the reply editor', async () => {
    current = setup();
    const { panel, store, connector, view } = current;
    // The user opened the message; it was read in the background and added to the history.
    await tick(5);

    // "Reply": no message body is left in the reading pane; the connector reports the replied-to message.
    connector.threadSnapshot = thread([], { activeMessageKey: 'm3' });
    await panel.runQuickAction(connector.composer, { operation: 'reply' });

    expect(view().context.messages.map((m) => [m.messageKey, m.included, m.isReplyTarget])).toEqual([
      ['m1', true, false],
      ['m2', true, false],
      ['m3', true, true],
    ]);
    store.dispatch({ type: 'form-changed', changes: { instruction: 'Teşekkür et' } });
    await current.actions.prepare();
    expect(store.getState().action?.context?.activeMessageKey).toBe('m3');
    expect(view().preview).not.toBeNull();
  });

  describe('read messages and context', () => {
    it('adds a message opened later in the same conversation to the context automatically', async () => {
      current = setup();
      const { panel, connector, view } = current;
      panel.open({ origin: 'thread-launcher', thread: connector.thread! });
      await tick();
      expect(view().context.messages.filter((m) => m.included)).toHaveLength(3);

      // The user opens another message of the same conversation (the reading pane shows only that one).
      connector.threadSnapshot = thread([message('m4', 0, [body('Dördüncü mesaj')])]);
      connector.emit({ type: 'thread-content-changed', threadRef: connector.thread! });
      await tick(5);

      const messages = view().context.messages;
      expect(messages.map((m) => [m.messageKey, m.group, m.included])).toEqual([
        ['m1', 'current', true],
        ['m2', 'current', true],
        ['m3', 'current', true],
        ['m4', 'current', true],
      ]);
    });

    it('adds a message read from the previous conversation to the context as "other conversation" when the user includes it', async () => {
      current = setup();
      const { panel, actions, connector, store } = current;
      panel.open({ origin: 'thread-launcher', thread: connector.thread! });
      await tick();

      switchToInvoice(connector);
      await tick(5);
      actions.setMessageIncluded('m2', true);

      expect(store.getState().context?.messages.find((m) => m.messageKey === 'm2')).toMatchObject({
        conversation: 'other',
        subject: 'Proje toplantısı',
      });
    });

    it('lets the user edit a context message and revert it to the original', async () => {
      current = setup();
      const { panel, actions, connector, view } = current;
      panel.open({ origin: 'thread-launcher', thread: connector.thread! });
      await tick();

      actions.setMessageText('m2', 'Yalnızca fatura sorusu önemli.');
      expect(view().context.messages.find((m) => m.messageKey === 'm2')).toMatchObject({
        text: 'Yalnızca fatura sorusu önemli.',
        edited: true,
      });

      actions.setMessageText('m2', null);
      expect(view().context.messages.find((m) => m.messageKey === 'm2')?.edited).toBe(false);
    });

    it('deletes the read messages when the account changes', async () => {
      current = setup();
      const { connector, history } = current;
      await tick(5);
      expect(history.entries().length).toBeGreaterThan(0);

      connector.emit({ type: 'account-changed' });
      expect(history.entries()).toEqual([]);
    });
  });
});

describe('Read mode in an Office add-in (no draft open)', () => {
  let current: ReturnType<typeof setup> | null = null;
  afterEach(() => {
    current?.actions.dispose();
    current?.panel.dispose();
    current?.history.dispose();
    current = null;
  });

  /** The open email in read mode, as the Outlook add-in reports it. */
  function readMode(features = { receivedSelection: false, richContent: true, createReply: true }) {
    current = setup();
    current.connector.hasComposer = false;
    current.connector.features = features;
    return current;
  }

  async function replyPreview(session: ReturnType<typeof setup>) {
    const { panel, store, connector, actions } = session;
    panel.open({ origin: 'thread-launcher', thread: connector.thread! });
    await tick();
    store.dispatch({ type: 'form-changed', changes: { instruction: 'Kibarca teşekkür et' } });
    await actions.prepare();
  }

  it('offers a new reply with the result and opens it once the user chooses it', async () => {
    const session = readMode();
    const { applier, connector, store, view } = session;
    await replyPreview(session);

    expect(view().apply).toMatchObject({ mode: null, canApply: false, canCreateReply: true });
    expect(view().target).toEqual({ kind: 'none' });

    expect(applier.bindReply()).toEqual({ status: 'bound' });
    expect(view().target).toEqual({ kind: 'new-reply' });
    expect(view().apply).toMatchObject({ mode: 'create-reply', canApply: true, canCreateReply: false });

    await applier.apply();
    expect(connector.applied).toHaveLength(1);
    expect(connector.applied[0]?.target).toEqual({
      mode: 'create-reply',
      threadRef: connector.thread,
      messageKey: 'm3',
      expectedThreadRevision: connector.threadSnapshot.revision,
    });
    expect(store.getState().phase.status).toBe('applied');
    expect(view().apply).toMatchObject({ canApply: false, canUndo: false, blocker: null });

    // The same result never opens a second reply.
    await applier.apply();
    expect(connector.applied).toHaveLength(1);
  });

  it('does not offer a new reply where the page cannot open one', async () => {
    const session = readMode({ receivedSelection: true, richContent: true, createReply: false });
    await replyPreview(session);

    expect(session.view().apply.canCreateReply).toBe(false);
    expect(session.applier.bindReply()).toEqual({
      status: 'failed',
      error: expect.objectContaining({ code: 'WRITE_UNSUPPORTED' }),
    });
    expect(session.connector.applied).toEqual([]);
  });

  it('does not open a reply to another email after the user switched to it', async () => {
    const session = readMode();
    const { applier, connector, store } = session;
    await replyPreview(session);
    applier.bindReply();

    switchToInvoice(connector);
    await applier.apply();
    expect(connector.applied).toEqual([]);
    // The session follows the new email; the earlier result and its reply target are gone.
    expect(store.getState()).toMatchObject({ thread: threadB, preview: null, explicitTarget: null });
  });

  it('hides what the page cannot do: selections in received messages and formatted refinements', async () => {
    const session = readMode({ receivedSelection: false, richContent: false, createReply: true });
    const { store, view } = session;
    await replyPreview(session);
    expect(view().refine.rich).toBe(false);

    store.dispatch({ type: 'form-changed', changes: { operation: 'translate' } });
    expect(view().source.canLoadReceivedSelection).toBe(false);
  });
});
