import { appError, err, ok, type AppError, type ErrorCode, type Result } from '@writehand/contracts';

import type {
  BodyContent,
  BodyFormat,
  ComposeType,
  MailboxVersion,
  OfficeComposeItem,
  OfficeItem,
  OfficeMailbox,
  OfficeReadItem,
} from '../mailbox';

type OfficeApi = typeof Office;

/**
 * The real Office.js behind `OfficeMailbox`; the only file of the connector that touches
 * `Office`. It is created after `Office.onReady` has resolved. Every callback is turned into a
 * `Result`; failures carry an error code only, never Office's message, which may quote content.
 */
export function createOfficeMailbox(office: OfficeApi): OfficeMailbox {
  const mailbox = office.context.mailbox;
  const supports = (version: MailboxVersion) =>
    office.context.requirements.isSetSupported('Mailbox', version);

  /** Runs an Office.js async call; a thrown error or a failed result becomes `failure`. */
  const call = <T>(
    start: (callback: (result: Office.AsyncResult<T>) => void) => void,
    failure: ErrorCode,
  ): Promise<Result<T, AppError>> =>
    new Promise((resolve) => {
      try {
        start((result) =>
          resolve(
            result.status === office.AsyncResultStatus.Succeeded ? ok(result.value) : err(appError(failure)),
          ),
        );
      } catch {
        resolve(err(appError(failure)));
      }
    });

  const coercion = (format: BodyFormat) =>
    format === 'html' ? office.CoercionType.Html : office.CoercionType.Text;
  const data = (content: BodyContent, format: BodyFormat) =>
    format === 'html' ? content.html : content.text;

  function readItem(item: Office.MessageRead): OfficeReadItem {
    const sentAt = item.dateTimeCreated instanceof Date ? item.dateTimeCreated : null;
    return {
      mode: 'read',
      itemId: item.itemId ?? null,
      conversationId: item.conversationId ?? null,
      subject: typeof item.subject === 'string' ? item.subject : null,
      senderName: item.from?.displayName ?? item.sender?.displayName ?? null,
      sentAt: sentAt !== null && !Number.isNaN(sentAt.getTime()) ? sentAt.toISOString() : null,
      getBodyHtml: () =>
        call<string>((callback) => item.body.getAsync(office.CoercionType.Html, callback), 'PAGE_NOT_READY'),
      displayReplyForm(html) {
        if (supports('1.9')) {
          return call<void>(
            (callback) => item.displayReplyFormAsync({ htmlBody: html }, callback),
            'WRITE_UNSUPPORTED',
          );
        }
        try {
          item.displayReplyForm(html);
          return Promise.resolve(ok(undefined));
        } catch {
          return Promise.resolve(err(appError('WRITE_UNSUPPORTED')));
        }
      },
    };
  }

  function composeItem(item: Office.MessageCompose): OfficeComposeItem {
    return {
      mode: 'compose',
      conversationId: item.conversationId ?? null,
      async composeType() {
        if (!supports('1.10')) return null;
        const result = await call<{ composeType: string }>(
          (callback) => item.getComposeTypeAsync(callback),
          'PAGE_NOT_READY',
        );
        const type = result.ok ? result.value.composeType : null;
        return type === 'reply' || type === 'forward' || type === 'newMail' ? (type as ComposeType) : null;
      },
      async bodyFormat() {
        const result = await call<Office.CoercionType>(
          (callback) => item.body.getTypeAsync(callback),
          'PAGE_NOT_READY',
        );
        return result.ok ? ok(result.value === office.CoercionType.Text ? 'text' : 'html') : result;
      },
      getBodyHtml: () =>
        call<string>((callback) => item.body.getAsync(office.CoercionType.Html, callback), 'PAGE_NOT_READY'),
      async getSelectedText() {
        const result = await call<{ data: string; sourceProperty: string }>(
          (callback) => item.getSelectedDataAsync(office.CoercionType.Text, callback),
          'SELECTION_INVALID',
        );
        // A field other than the body or subject being selected is reported as an error.
        if (!result.ok) return ok(null);
        const { data, sourceProperty } = result.value;
        if (typeof data !== 'string' || data === '') return ok(null);
        return ok({ text: data, source: sourceProperty === 'subject' ? 'subject' : 'body' });
      },
      replaceSelection: (content, format) =>
        call<void>(
          (callback) =>
            item.body.setSelectedDataAsync(
              data(content, format),
              { coercionType: coercion(format) },
              callback,
            ),
          'WRITE_UNSUPPORTED',
        ),
      prepend: (content, format) =>
        call<void>(
          (callback) =>
            item.body.prependAsync(data(content, format), { coercionType: coercion(format) }, callback),
          'WRITE_UNSUPPORTED',
        ),
      setBody: (content, format) =>
        call<void>(
          (callback) =>
            item.body.setAsync(data(content, format), { coercionType: coercion(format) }, callback),
          'WRITE_UNSUPPORTED',
        ),
    };
  }

  return {
    supports,

    accountHint: () => mailbox.userProfile?.emailAddress ?? null,

    item(): OfficeItem | null {
      const item = mailbox.item;
      if (item === null || item === undefined || item.itemType !== office.MailboxEnums.ItemType.Message) {
        return null;
      }
      // Only a received message has `displayReplyForm`; a draft has `getSelectedDataAsync`.
      const asRead = item as Office.MessageRead;
      return typeof asRead.displayReplyForm === 'function'
        ? readItem(asRead)
        : composeItem(item as Office.MessageCompose);
    },

    async onItemChanged(listener) {
      if (!supports('1.5')) return () => undefined;
      const added = await call<void>(
        (callback) => mailbox.addHandlerAsync(office.EventType.ItemChanged, listener, callback),
        'UNEXPECTED',
      );
      if (!added.ok) return () => undefined;
      return () => mailbox.removeHandlerAsync(office.EventType.ItemChanged);
    },
  };
}
