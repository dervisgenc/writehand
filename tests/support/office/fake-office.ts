/**
 * An in-memory subset of Office.js for the Outlook add-in's tests: `Office.context.mailbox` with
 * one open item (a received message or a draft), the body calls the connector uses, a selection
 * in the draft and the `ItemChanged` event. The body is kept as a DOM document, so writes behave
 * like an editor: a selection is replaced in place, a prepend goes to the start of the body.
 *
 * Office.js behaviour that matters for Writehand and is reproduced here:
 * - `setSelectedDataAsync` inserts at the top of the body when the body lost focus
 *   (`controls.focusLost`), as the Body reference documents.
 * - `getSelectedDataAsync` only exists while composing; a received message has
 *   `displayReplyForm` instead.
 */

export type FakeMailboxVersion = '1.1' | '1.2' | '1.3' | '1.5' | '1.8' | '1.9' | '1.10' | '1.14';

export interface FakeItemOptions {
  readonly mode: 'read' | 'compose';
  readonly bodyHtml: string;
  readonly bodyFormat?: 'html' | 'text';
  readonly composeType?: 'reply' | 'forward' | 'newMail';
  readonly conversationId?: string | null;
  readonly itemId?: string;
  readonly subject?: string;
  readonly senderName?: string;
  readonly senderAddress?: string;
  readonly sentAt?: Date;
}

export interface FakeOfficeOptions {
  readonly item: FakeItemOptions | null;
  readonly accountAddress?: string;
  readonly supported?: readonly FakeMailboxVersion[];
}

type Callback<T> = (result: { status: string; value: T; error?: { code: number; message: string } }) => void;

const SUCCEEDED = 'succeeded';
const FAILED = 'failed';
const ALL_VERSIONS: readonly FakeMailboxVersion[] = [
  '1.1',
  '1.2',
  '1.3',
  '1.5',
  '1.8',
  '1.9',
  '1.10',
  '1.14',
];

export interface FakeOfficeControls {
  /** Every Office.js call the connector made, by name. */
  readonly calls: string[];
  /** HTML bodies of the reply forms opened. */
  readonly openedReplies: string[];
  /** The body lost focus: `setSelectedDataAsync` writes at the top instead of the selection. */
  focusLost: boolean;
  /** The next call with this name fails without changing anything. */
  failNext: string | null;
  bodyHtml(): string;
  bodyText(): string;
  /** Selects the first occurrence of `phrase` inside one text node of the body. */
  select(phrase: string): void;
  clearSelection(): void;
  /** The user types at the end of the first line of the body. */
  type(text: string): void;
  /** Shows another item (or none) and fires `ItemChanged`, as a pinned task pane does. */
  switchItem(item: FakeItemOptions | null): void;
}

export interface FakeOffice {
  /** Pass as `typeof Office`; only the members the connector uses exist. */
  readonly office: unknown;
  readonly controls: FakeOfficeControls;
}

/**
 * The fake keeps a body's `<style>` blocks inert (as `<template>`) so that parsing it in the
 * task pane's page raises no CSP report, and gives them back as `<style>` from `getAsync`, as
 * Outlook does: the connector has to cope with them.
 */
const INERT_STYLE = 'template data-fake-style';

function parseDocument(html: string): Document {
  const inert = html.replace(/<style\b/gi, `<${INERT_STYLE}`).replace(/<\/style\s*>/gi, '</template>');
  return new DOMParser().parseFromString(inert, 'text/html');
}

function serialize(doc: Document): string {
  return doc.documentElement.outerHTML
    .replace(/<template data-fake-style=""/g, '<style')
    .replace(/<template data-fake-style/g, '<style')
    .replace(/<\/template>/g, '</style>');
}

export function createFakeOffice(options: FakeOfficeOptions): FakeOffice {
  const supported = new Set(options.supported ?? ALL_VERSIONS);
  const handlers = new Map<string, () => void>();
  const calls: string[] = [];
  const openedReplies: string[] = [];
  let doc = parseDocument('<html><body></body></html>');
  let selection: Range | null = null;
  let itemOptions: FakeItemOptions | null = null;
  let item: object | null = null;

  const controls: FakeOfficeControls = {
    calls,
    openedReplies,
    focusLost: false,
    failNext: null,
    bodyHtml: () => serialize(doc),
    bodyText: () => doc.body.textContent ?? '',
    select(phrase) {
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const index = (node.textContent ?? '').indexOf(phrase);
        if (index >= 0) {
          selection = doc.createRange();
          selection.setStart(node, index);
          selection.setEnd(node, index + phrase.length);
          return;
        }
      }
      throw new Error(`Phrase not found in the fake body: ${phrase}`);
    },
    clearSelection() {
      selection = null;
    },
    type(text) {
      const first = doc.body.querySelector('div, p') ?? doc.body;
      first.append(text);
    },
    switchItem(next) {
      load(next);
      handlers.get('olkItemSelectedChanged')?.();
    },
  };

  /** Runs `action` unless the test asked this call to fail; reports through the callback. */
  function respond<T>(name: string, callback: Callback<T> | undefined, action: () => T): void {
    calls.push(name);
    const fail = controls.failNext === name;
    if (fail) controls.failNext = null;
    const value = fail ? (undefined as T) : action();
    queueMicrotask(() =>
      callback?.(
        fail
          ? { status: FAILED, value, error: { code: 9002, message: 'Simulated failure' } }
          : { status: SUCCEEDED, value },
      ),
    );
  }

  function fragment(data: string, coercion: string): Node {
    if (coercion === 'html') {
      const parsed = parseDocument(`<body>${data}</body>`);
      const nodes = doc.createDocumentFragment();
      for (const child of [...parsed.body.childNodes]) nodes.append(doc.importNode(child, true));
      return nodes;
    }
    return doc.createTextNode(data);
  }

  const coercionOf = (options: { coercionType?: string } | Callback<void> | undefined) =>
    typeof options === 'object' && options !== null && 'coercionType' in options
      ? (options.coercionType ?? 'text')
      : 'text';

  function body() {
    return {
      getAsync(coercion: string, callback: Callback<string>) {
        respond('body.getAsync', callback, () =>
          coercion === 'html' ? serialize(doc) : (doc.body.textContent ?? ''),
        );
      },
      getTypeAsync(callback: Callback<string>) {
        respond('body.getTypeAsync', callback, () => itemOptions?.bodyFormat ?? 'html');
      },
      setSelectedDataAsync(data: string, options: { coercionType?: string }, callback: Callback<void>) {
        respond('body.setSelectedDataAsync', callback, () => {
          const nodes = fragment(data, coercionOf(options));
          if (controls.focusLost || selection === null) {
            doc.body.prepend(nodes);
          } else {
            selection.deleteContents();
            selection.insertNode(nodes);
            selection = null;
          }
        });
      },
      prependAsync(data: string, options: { coercionType?: string }, callback: Callback<void>) {
        respond('body.prependAsync', callback, () => doc.body.prepend(fragment(data, coercionOf(options))));
      },
      setAsync(data: string, options: { coercionType?: string }, callback: Callback<void>) {
        respond('body.setAsync', callback, () => {
          if (coercionOf(options) === 'html') {
            doc = parseDocument(/^\s*<html/i.test(data) ? data : `<html><body>${data}</body></html>`);
          } else {
            doc = parseDocument('<html><body></body></html>');
            doc.body.textContent = data;
          }
          selection = null;
        });
      },
    };
  }

  function load(next: FakeItemOptions | null): void {
    itemOptions = next;
    selection = null;
    if (next === null) {
      item = null;
      return;
    }
    doc = parseDocument(next.bodyHtml);
    const conversationId = next.conversationId === undefined ? 'conversation-1' : next.conversationId;
    if (next.mode === 'read') {
      item = {
        itemType: 'message',
        itemId: next.itemId ?? 'item-1',
        conversationId,
        subject: next.subject ?? 'Proje toplantısı',
        from: {
          displayName: next.senderName ?? 'Ayşe Kaya',
          emailAddress: next.senderAddress ?? 'ayse@example.test',
        },
        sender: {
          displayName: next.senderName ?? 'Ayşe Kaya',
          emailAddress: next.senderAddress ?? 'ayse@example.test',
        },
        dateTimeCreated: next.sentAt ?? new Date('2026-10-09T07:15:00.000Z'),
        body: { getAsync: body().getAsync },
        displayReplyForm(data: string | { htmlBody?: string }) {
          calls.push('displayReplyForm');
          openedReplies.push(typeof data === 'string' ? data : (data.htmlBody ?? ''));
        },
        displayReplyFormAsync(data: { htmlBody?: string }, callback: Callback<void>) {
          respond('displayReplyFormAsync', callback, () => {
            openedReplies.push(data.htmlBody ?? '');
          });
        },
      };
    } else {
      item = {
        itemType: 'message',
        conversationId,
        body: body(),
        getComposeTypeAsync(callback: Callback<{ composeType: string; coercionType: string }>) {
          respond('getComposeTypeAsync', callback, () => ({
            composeType: next.composeType ?? (conversationId === null ? 'newMail' : 'reply'),
            coercionType: next.bodyFormat ?? 'html',
          }));
        },
        getSelectedDataAsync(coercion: string, callback: Callback<{ data: string; sourceProperty: string }>) {
          respond('getSelectedDataAsync', callback, () => ({
            data: selection?.toString() ?? '',
            sourceProperty: 'body',
          }));
        },
      };
    }
  }

  load(options.item);

  const office = {
    AsyncResultStatus: { Succeeded: SUCCEEDED, Failed: FAILED },
    CoercionType: { Html: 'html', Text: 'text' },
    EventType: { ItemChanged: 'olkItemSelectedChanged' },
    MailboxEnums: { ItemType: { Message: 'message', Appointment: 'appointment' } },
    context: {
      requirements: {
        isSetSupported: (name: string, version: string) =>
          name === 'Mailbox' && supported.has(version as FakeMailboxVersion),
      },
      mailbox: {
        get item() {
          return item;
        },
        userProfile: { emailAddress: options.accountAddress ?? 'deniz@example.test' },
        addHandlerAsync(eventType: string, handler: () => void, callback?: Callback<void>) {
          respond('addHandlerAsync', callback, () => {
            handlers.set(eventType, handler);
          });
        },
        removeHandlerAsync(eventType: string, callback?: Callback<void>) {
          respond('removeHandlerAsync', callback, () => {
            handlers.delete(eventType);
          });
        },
      },
    },
  };

  return { office, controls };
}
