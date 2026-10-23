import type { ApplyRequest, ComposerRef, MailConnector, MailEvent, ThreadRef } from '@writehand/contracts';
import {
  createOfficeMailbox,
  createOutlookAddinConnector,
  REPLY_FORM_LIMIT_BYTES,
} from '@writehand/outlook-addin';
import { afterEach, describe, expect, it } from 'vitest';

import { describeMailConnectorContract } from '../../contracts/mail-connector.contract';
import {
  CLASSIC_EMPTY_NEW_MESSAGE_WITH_SIGNATURE,
  CLASSIC_REPLY_DRAFT,
  WEB_EMPTY_NEW_MESSAGE,
  WEB_EMPTY_REPLY,
  WEB_NEW_MESSAGE,
  WEB_NEW_MESSAGE_WITH_SIGNATURE,
  WEB_RECEIVED_MESSAGE,
  WEB_REPLY_DRAFT,
} from '../../fixtures/outlook-addin/bodies';
import {
  createFakeOffice,
  type FakeItemOptions,
  type FakeOfficeOptions,
} from '../../support/office/fake-office';

const notAborted = { aborted: false };
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

let disposeLast: (() => void) | null = null;
afterEach(() => {
  disposeLast?.();
  disposeLast = null;
});

function setup(options: FakeOfficeOptions, connectorOptions: { pollMs?: number } = {}) {
  const fake = createFakeOffice(options);
  const connector = createOutlookAddinConnector({
    mailbox: createOfficeMailbox(fake.office as typeof Office),
    pollMs: connectorOptions.pollMs ?? 0,
    settleMs: 0,
    formatDate: (iso) => `date:${iso}`,
  });
  disposeLast = () => connector.dispose();
  return { connector, controls: fake.controls };
}

const draft = (bodyHtml: string, extra: Partial<FakeItemOptions> = {}): FakeOfficeOptions => ({
  item: { mode: 'compose', bodyHtml, ...extra },
});

const newMessage = (bodyHtml: string) => draft(bodyHtml, { conversationId: null, composeType: 'newMail' });

const received = (extra: Partial<FakeItemOptions> = {}): FakeOfficeOptions => ({
  item: { mode: 'read', bodyHtml: WEB_RECEIVED_MESSAGE, ...extra },
});

function composerOf(connector: MailConnector): ComposerRef {
  const composer = connector.getPageState().composers[0];
  if (composer === undefined) throw new Error('No draft is open.');
  return composer;
}

function threadOf(connector: MailConnector): ThreadRef {
  const thread = connector.getPageState().activeThread;
  if (thread === null) throw new Error('No conversation is open.');
  return thread;
}

async function editable(connector: MailConnector): Promise<string> {
  const snapshot = await connector.readComposer(composerOf(connector));
  if (!snapshot.ok) throw new Error(snapshot.error.code);
  return snapshot.value.editableText;
}

async function bodyRequest(
  connector: MailConnector,
  mode: 'insert-empty' | 'replace-body',
  text: string,
  extra: Partial<ApplyRequest> = {},
): Promise<ApplyRequest> {
  const snapshot = await connector.readComposer(composerOf(connector));
  if (!snapshot.ok) throw new Error(snapshot.error.code);
  return {
    applyOperationId: `apply-${mode}`,
    target: { mode, composerRef: snapshot.value.ref, expectedRevision: snapshot.value.revision },
    text,
    ...extra,
  };
}

describeMailConnectorContract('Outlook add-in (Office.js, reply draft in the web and new Outlook)', () => {
  const fake = createFakeOffice(draft(WEB_REPLY_DRAFT, { composeType: 'reply' }));
  const connector = createOutlookAddinConnector({
    mailbox: createOfficeMailbox(fake.office as typeof Office),
    pollMs: 0,
    settleMs: 0,
  });
  return {
    connector,
    selectablePhrase: 'perşembe günü',
    selectInComposer: (_ref, phrase) => fake.controls.select(phrase),
    typeInComposer: (_ref, text) => fake.controls.type(text),
    undoesSelectionWrites: false,
    cleanup: () => undefined,
  };
});

describe('Outlook add-in connector: the open item', () => {
  it('reports a draft in compose mode and what the add-in cannot do there', () => {
    const { connector } = setup(draft(WEB_REPLY_DRAFT));
    const state = connector.getPageState();

    expect(state).toMatchObject({ support: 'ready', composers: [expect.any(Object)] });
    expect(state.activeThread).not.toBeNull();
    expect(state.features).toEqual({ receivedSelection: false, richContent: true, createReply: false });
    expect(state.scope?.accountScopeId).toMatch(/^acct-/);
    expect(JSON.stringify(state)).not.toContain('example.test');
  });

  it('reports a received message in read mode as a conversation without a draft that can get a new reply', () => {
    const { connector } = setup(received());
    expect(connector.getPageState()).toMatchObject({
      composers: [],
      features: { receivedSelection: false, createReply: true },
    });
  });

  it('reports nothing open while a pinned pane shows no item', () => {
    const { connector } = setup({ item: null });
    expect(connector.getPageState()).toMatchObject({ support: 'ready', activeThread: null, composers: [] });
  });

  it('has no conversation for a new message', () => {
    const { connector } = setup(newMessage(WEB_EMPTY_NEW_MESSAGE));
    expect(connector.getPageState().activeThread).toBeNull();
    expect(composerOf(connector).threadKey).toBeNull();
  });
});

describe('Outlook add-in connector: reading the body', () => {
  it('separates the user region of a web reply draft from its signature and quote', async () => {
    const { connector, controls } = setup(draft(WEB_REPLY_DRAFT));
    // Office.js returns the email's style blocks too; they never reach the text.
    expect(controls.bodyHtml()).toContain('<style');
    const snapshot = await connector.readComposer(composerOf(connector));
    if (!snapshot.ok) throw new Error(snapshot.error.code);

    expect(snapshot.value.editableText.trim()).toBe('Toplantı perşembe günü olsun mu?');
    expect(snapshot.value).toMatchObject({
      canReplaceBody: false,
      canReplaceSelection: true,
      canInsertIntoEmptyBody: false,
    });
  });

  it("separates the user region of classic Outlook's Word HTML at its bookmarks (synthetic sample)", async () => {
    const { connector } = setup(draft(CLASSIC_REPLY_DRAFT));
    expect((await editable(connector)).trim()).toBe('Toplantı perşembe günü olsun mu?');

    const classicNew = setup(newMessage(CLASSIC_EMPTY_NEW_MESSAGE_WITH_SIGNATURE));
    const snapshot = await classicNew.connector.readComposer(composerOf(classicNew.connector));
    expect(snapshot.ok && snapshot.value).toMatchObject({
      canInsertIntoEmptyBody: true,
      canReplaceBody: false,
    });
  });

  it('offers an empty reply for inserting, and the whole body only in a new message without signature or quote', async () => {
    const empty = setup(draft(WEB_EMPTY_REPLY));
    const emptySnapshot = await empty.connector.readComposer(composerOf(empty.connector));
    expect(emptySnapshot.ok && emptySnapshot.value).toMatchObject({
      editableText: '',
      canInsertIntoEmptyBody: true,
      canReplaceBody: false,
    });

    const plain = setup(newMessage(WEB_NEW_MESSAGE));
    const plainSnapshot = await plain.connector.readComposer(composerOf(plain.connector));
    expect(plainSnapshot.ok && plainSnapshot.value.canReplaceBody).toBe(true);

    const signed = setup(newMessage(WEB_NEW_MESSAGE_WITH_SIGNATURE));
    const signedSnapshot = await signed.connector.readComposer(composerOf(signed.connector));
    expect(signedSnapshot.ok && signedSnapshot.value.canReplaceBody).toBe(false);
  });

  it("reads a reply draft's quoted earlier mail as one context message, without the user's text or signature", async () => {
    const { connector } = setup(draft(WEB_REPLY_DRAFT));
    const thread = await connector.readThread(threadOf(connector), notAborted);
    if (!thread.ok) throw new Error(thread.error.code);

    expect(thread.value.messages).toHaveLength(1);
    const [message] = thread.value.messages;
    const text = message?.blocks.map((block) => block.text).join('\n') ?? '';
    expect(text).toContain('perşembe 14:00 uygun mu?');
    expect(text).not.toContain('Toplantı perşembe günü olsun mu?');
    expect(text).not.toContain('Örnek Lojistik');
    expect(message).toMatchObject({ senderLabel: null, sentAt: null });
    expect(thread.value.activeMessageKey).toBe(message?.messageKey);
    expect(thread.value.coverage).toMatchObject({ source: 'item-body', status: 'partial' });
  });

  it('reads the open received message with its sender name and exact date, never the address', async () => {
    const { connector } = setup(received());
    const thread = await connector.readThread(threadOf(connector), notAborted);
    if (!thread.ok) throw new Error(thread.error.code);
    const [message] = thread.value.messages;

    expect(message).toMatchObject({
      senderLabel: 'Ayşe Kaya',
      sentAt: '2026-10-09T07:15:00.000Z',
      sentAtText: 'date:2026-10-09T07:15:00.000Z',
    });
    expect(message?.blocks.map((block) => block.kind)).toEqual(['body', 'signature', 'quote']);
    expect(thread.value.subject).toBe('Proje toplantısı');
    expect(JSON.stringify(thread.value)).not.toContain('@example.test');
  });

  it('refuses to read a conversation that is no longer open', async () => {
    const { connector, controls } = setup(received());
    const thread = threadOf(connector);
    controls.switchItem({
      mode: 'read',
      bodyHtml: WEB_RECEIVED_MESSAGE,
      itemId: 'item-2',
      conversationId: 'c-2',
    });
    await tick();
    expect(await connector.readThread(thread, notAborted)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'THREAD_CHANGED' }),
    });
  });
});

describe('Outlook add-in connector: writing', () => {
  async function selectionRequest(
    connector: MailConnector,
    phrase: string,
    text: string,
  ): Promise<ApplyRequest> {
    const composer = composerOf(connector);
    const selection = await connector.captureDraftSelection(composer);
    if (!selection.ok || selection.value === null) throw new Error(`No selection for ${phrase}`);
    return {
      applyOperationId: 'apply-selection',
      target: {
        mode: 'replace-selection',
        composerRef: composer,
        expectedRevision: selection.value.composerRevision,
        selectionId: selection.value.selectionId,
      },
      text,
    };
  }

  it('replaces the selection with setSelectedDataAsync and verifies it, without offering undo', async () => {
    const { connector, controls } = setup(draft(WEB_REPLY_DRAFT));
    controls.select('perşembe günü');
    const outcome = await connector.applyText(
      await selectionRequest(connector, 'perşembe günü', 'cuma sabahı'),
    );

    expect(outcome).toMatchObject({ status: 'applied', undoId: null });
    expect((await editable(connector)).trim()).toBe('Toplantı cuma sabahı olsun mu?');
    expect(controls.bodyText()).toContain('perşembe 14:00 uygun mu?');
    expect(controls.calls).not.toContain('body.setAsync');
  });

  it('does not write when the selection was lost before the write', async () => {
    const { connector, controls } = setup(draft(WEB_REPLY_DRAFT));
    controls.select('perşembe günü');
    const request = await selectionRequest(connector, 'perşembe günü', 'cuma sabahı');
    controls.clearSelection();

    expect(await connector.applyText(request)).toMatchObject({
      status: 'rejected',
      error: { code: 'SELECTION_INVALID' },
    });
    expect(controls.calls).not.toContain('body.setSelectedDataAsync');
  });

  it('reports an uncertain outcome and never retries when Outlook writes at the top instead (body lost focus)', async () => {
    const { connector, controls } = setup(draft(WEB_REPLY_DRAFT));
    controls.select('perşembe günü');
    const request = await selectionRequest(connector, 'perşembe günü', 'cuma sabahı');
    controls.focusLost = true;

    expect(await connector.applyText(request)).toMatchObject({
      status: 'uncertain',
      error: { code: 'WRITE_UNCERTAIN' },
    });
    expect(await connector.applyText(request)).toMatchObject({ status: 'rejected' });
    expect(controls.calls.filter((call) => call === 'body.setSelectedDataAsync')).toHaveLength(1);
  });

  it('reports a failed Office call that changed nothing as not written', async () => {
    const { connector, controls } = setup(draft(WEB_REPLY_DRAFT));
    controls.select('perşembe günü');
    const request = await selectionRequest(connector, 'perşembe günü', 'cuma sabahı');
    controls.failNext = 'body.setSelectedDataAsync';

    expect(await connector.applyText(request)).toMatchObject({
      status: 'rejected',
      error: { code: 'WRITE_UNSUPPORTED' },
    });
  });

  it('writes an empty reply above the signature and the quote with prependAsync', async () => {
    const { connector, controls } = setup(draft(WEB_EMPTY_REPLY));
    const outcome = await connector.applyText(
      await bodyRequest(connector, 'insert-empty', 'Teşekkürler Ayşe,\nperşembe 14:00 uygun.'),
    );

    expect(outcome).toMatchObject({ status: 'applied', undoId: null });
    const text = controls.bodyText();
    expect(text.indexOf('perşembe 14:00 uygun.')).toBeLessThan(text.indexOf('Örnek Lojistik'));
    expect(text).toContain('perşembe 14:00 uygun mu?');
    expect(controls.calls).toContain('body.prependAsync');
    expect(controls.calls).not.toContain('body.setAsync');
  });

  it('writes formatted content as HTML and verifies it by its visible text', async () => {
    const { connector, controls } = setup(draft(WEB_EMPTY_REPLY));
    const request = await bodyRequest(connector, 'insert-empty', 'Tarih | Saat\nPerşembe | 14:00', {
      rich: {
        html: '<table><tr><th>Tarih</th><th>Saat</th></tr><tr><td>Perşembe</td><td>14:00</td></tr></table>',
        visibleText: 'Tarih | Saat\nPerşembe | 14:00',
      },
    });

    expect(await connector.applyText(request)).toMatchObject({ status: 'applied' });
    expect(controls.bodyHtml()).toContain('<table>');
  });

  it('replaces the whole body of a new message and undoes it by writing the previous body back', async () => {
    const { connector, controls } = setup(newMessage(WEB_NEW_MESSAGE));
    const before = await editable(connector);
    const outcome = await connector.applyText(
      await bodyRequest(connector, 'replace-body', 'Rapor cuma günü hazır.'),
    );
    if (outcome.status !== 'applied' || outcome.undoId === null) throw new Error('not applied with undo');

    expect((await editable(connector)).trim()).toBe('Rapor cuma günü hazır.');
    expect(await connector.undoChange(outcome.undoId)).toMatchObject({ status: 'undone' });
    expect(await editable(connector)).toBe(before);
    expect(controls.calls.filter((call) => call === 'body.setAsync')).toHaveLength(2);
  });

  it('does not undo after the user typed in the new message', async () => {
    const { connector, controls } = setup(newMessage(WEB_NEW_MESSAGE));
    const outcome = await connector.applyText(
      await bodyRequest(connector, 'replace-body', 'Rapor cuma günü hazır.'),
    );
    if (outcome.status !== 'applied' || outcome.undoId === null) throw new Error('not applied with undo');
    controls.type(' Ek bilgi.');

    expect(await connector.undoChange(outcome.undoId)).toMatchObject({
      status: 'rejected',
      error: { code: 'UNDO_INVALID' },
    });
  });

  it('never replaces the whole body of a reply, where setAsync would also replace the quoted thread', async () => {
    const { connector, controls } = setup(draft(WEB_REPLY_DRAFT));
    const request = await bodyRequest(connector, 'replace-body', 'Yeni metin');

    expect(await connector.applyText(request)).toMatchObject({
      status: 'rejected',
      error: { code: 'WRITE_UNSUPPORTED' },
    });
    expect(controls.calls).not.toContain('body.setAsync');
  });

  it('writes plain text with Text coercion into a plain-text draft, even for a formatted result', async () => {
    const { connector, controls } = setup(
      draft('<html><body></body></html>', {
        bodyFormat: 'text',
        conversationId: null,
        composeType: 'newMail',
      }),
    );
    const request = await bodyRequest(connector, 'insert-empty', 'Merhaba', {
      rich: { html: '<ul><li>Merhaba</li></ul>', visibleText: 'Merhaba' },
    });

    expect(await connector.applyText(request)).toMatchObject({ status: 'applied' });
    expect(controls.bodyText().trim()).toBe('Merhaba');
    expect(controls.bodyHtml()).not.toContain('<ul>');
  });
});

describe('Outlook add-in connector: a new reply in read mode', () => {
  async function replyRequest(connector: MailConnector, text: string, rich?: ApplyRequest['rich']) {
    const thread = await connector.readThread(threadOf(connector), notAborted);
    if (!thread.ok) throw new Error(thread.error.code);
    return {
      applyOperationId: 'apply-reply',
      target: {
        mode: 'create-reply' as const,
        threadRef: thread.value.ref,
        messageKey: thread.value.activeMessageKey ?? '',
        expectedThreadRevision: thread.value.revision,
      },
      text,
      ...(rich === undefined ? {} : { rich }),
    };
  }

  it('opens one reply form with the result as HTML and sends nothing', async () => {
    const { connector, controls } = setup(received());
    const request = await replyRequest(connector, 'Teşekkürler <Ayşe>,\nperşembe uygun.');

    expect(await connector.applyText(request)).toEqual({
      status: 'applied',
      composerRevision: null,
      undoId: null,
    });
    expect(controls.openedReplies).toEqual([
      '<div>Teşekkürler &lt;Ayşe&gt;,</div><div>perşembe uygun.</div>',
    ]);
    expect(await connector.applyText(request)).toMatchObject({ status: 'rejected' });
    expect(controls.openedReplies).toHaveLength(1);
  });

  it('refuses a result over the 32 KB reply form limit without opening anything', async () => {
    const { connector, controls } = setup(received());
    const request = await replyRequest(connector, 'a'.repeat(REPLY_FORM_LIMIT_BYTES));

    expect(await connector.applyText(request)).toMatchObject({
      status: 'rejected',
      error: { code: 'REPLY_TOO_LARGE' },
    });
    expect(controls.openedReplies).toEqual([]);
  });

  it('falls back to displayReplyForm where Mailbox 1.9 is missing', async () => {
    const { connector, controls } = setup({ ...received(), supported: ['1.1', '1.2', '1.3', '1.5'] });
    await connector.applyText(await replyRequest(connector, 'Tamam.'));
    expect(controls.calls).toContain('displayReplyForm');
    expect(controls.openedReplies).toHaveLength(1);
  });

  it('refuses the reply after another email was opened in the pinned pane', async () => {
    const { connector, controls } = setup(received());
    const request = await replyRequest(connector, 'Tamam.');
    controls.switchItem({
      mode: 'read',
      bodyHtml: WEB_RECEIVED_MESSAGE,
      itemId: 'item-2',
      conversationId: 'c-2',
    });
    await tick();

    expect(await connector.applyText(request)).toMatchObject({
      status: 'rejected',
      error: { code: 'THREAD_CHANGED' },
    });
    expect(controls.openedReplies).toEqual([]);
  });

  it('refuses a new reply target in compose mode', async () => {
    const { connector } = setup(draft(WEB_REPLY_DRAFT));
    const outcome = await connector.applyText({
      applyOperationId: 'apply-reply',
      target: {
        mode: 'create-reply',
        threadRef: threadOf(connector),
        messageKey: 'm',
        expectedThreadRevision: 0,
      },
      text: 'Tamam.',
    });
    expect(outcome).toMatchObject({ status: 'rejected', error: { code: 'WRITE_UNSUPPORTED' } });
  });
});

describe('Outlook add-in connector: events', () => {
  it('reports the next email in a pinned pane: the conversation, then the page state', async () => {
    const { connector, controls } = setup(received());
    const events: MailEvent[] = [];
    connector.subscribe((event) => events.push(event));
    await tick();

    controls.switchItem({
      mode: 'read',
      bodyHtml: WEB_RECEIVED_MESSAGE,
      itemId: 'item-2',
      conversationId: 'c-2',
    });
    expect(events.map((event) => event.type)).toEqual(['active-thread-changed', 'page-state-changed']);

    controls.switchItem(null);
    expect(connector.getPageState().activeThread).toBeNull();
  });

  it('reports a draft that appears and disappears', async () => {
    const { connector, controls } = setup(received());
    const events: MailEvent[] = [];
    connector.subscribe((event) => events.push(event));
    await tick();

    controls.switchItem({ mode: 'compose', bodyHtml: WEB_REPLY_DRAFT, conversationId: 'c-3' });
    controls.switchItem(null);
    expect(events.map((event) => event.type)).toEqual([
      'active-thread-changed',
      'composer-added',
      'page-state-changed',
      'composer-removed',
      'active-thread-changed',
      'page-state-changed',
    ]);
  });

  it("notices the user's typing by reading the draft again while someone listens", async () => {
    const { connector, controls } = setup(draft(WEB_REPLY_DRAFT), { pollMs: 5 });
    await editable(connector);
    const events: MailEvent[] = [];
    connector.subscribe((event) => events.push(event));

    controls.type(' Yarın da olur.');
    await tick(40);
    expect(events).toContainEqual(expect.objectContaining({ type: 'composer-changed', revision: 1 }));
  });
});
