import {
  appError,
  err,
  isComposerTarget,
  isSameScope,
  ok,
  type AppError,
  type ApplyOutcome,
  type ApplyRequest,
  type ComposerApplyTarget,
  type ComposerRef,
  type ErrorCode,
  type MailConnector,
  type MailEvent,
  type MailScope,
  type MessageSnapshot,
  type PageFeatures,
  type PageState,
  type ReplyApplyTarget,
  type Result,
  type TextBlock,
  type ThreadRef,
  type UndoOutcome,
} from '@writehand/contracts';
import { comparableText, isProtectedIntact, opaqueHash, senderDisplayName } from '@writehand/mail-dom';

import { readBlocks, readDraftBody, type DraftBody } from './body';
import { blockHtml, byteLength, inlineHtml } from './html';
import type {
  BodyContent,
  BodyFormat,
  ComposeType,
  OfficeComposeItem,
  OfficeItem,
  OfficeMailbox,
} from './mailbox';

export const OUTLOOK_ADDIN_PROVIDER_ID = 'outlook-addin';

/** Outlook's limit for the HTML body of a reply form ("limited to 32 KB"). */
export const REPLY_FORM_LIMIT_BYTES = 32 * 1024;

const DEFAULT_POLL_MS = 2_000;
const DEFAULT_SETTLE_MS = 300;

export interface OutlookAddinConnectorOptions {
  readonly mailbox: OfficeMailbox;
  readonly createId?: () => string;
  readonly now?: () => string;
  /**
   * How often an open draft is read again to notice the user's edits, while someone listens;
   * Office.js has no event for body changes. `0` turns it off.
   */
  readonly pollMs?: number;
  /** How long to wait before checking a write a second time, while Outlook finishes it. */
  readonly settleMs?: number;
  /** The displayed date of a received message. */
  readonly formatDate?: (iso: string) => string;
}

interface CurrentItem {
  readonly item: OfficeItem;
  /** New for every item the task pane shows, so a draft's key never carries over. */
  readonly instanceKey: string;
  readonly threadKey: string | null;
  readonly messageKey: string | null;
  composeType: Promise<ComposeType | null> | null;
}

type ComposeEntry = CurrentItem & { readonly item: OfficeComposeItem };

interface ReadDraft {
  readonly html: string;
  readonly body: DraftBody;
  readonly format: BodyFormat;
  /** A reply or forward: earlier mail may sit in the body. */
  readonly isReply: boolean;
}

interface SelectionRecord {
  readonly selectionId: string;
  readonly composerKey: string;
  readonly revision: number;
  readonly start: number;
  readonly end: number;
  /** The selection in the user's region of the body. */
  readonly text: string;
  /** The selection as Office.js reported it, to check it is still selected before writing. */
  readonly officeText: string;
}

interface UndoRecord {
  readonly composerKey: string;
  readonly revisionAfter: number;
  readonly previous: BodyContent;
  readonly previousEditableText: string;
  readonly format: BodyFormat;
}

function rejected(code: ErrorCode): ApplyOutcome {
  return { status: 'rejected', error: appError(code, { field: 'target' }) };
}

function accountScopeFor(hint: string | null): string {
  const normalized = hint?.trim().toLowerCase() ?? '';
  return normalized === '' ? 'unknown' : `acct-${opaqueHash(normalized)}`;
}

function defaultFormatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/** Rich content reads back with table cells joined by " | " and without list markers. */
function richComparable(text: string): string {
  return text.normalize('NFC').replace(/[\s|]+/gu, '');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Where Office's selection text sits in the user's region. Office.js and the body reader may
 * differ in whitespace (line breaks, non-breaking spaces), so a whitespace-insensitive match is
 * tried when the exact text is not found.
 */
function locate(haystack: string, needle: string): { start: number; end: number } | null {
  const exact = haystack.indexOf(needle);
  if (exact >= 0) return { start: exact, end: exact + needle.length };
  const words = needle
    .trim()
    .split(/\s+/u)
    .filter((word) => word !== '');
  if (words.length === 0) return null;
  const match = new RegExp(words.map(escapeRegExp).join('\\s+'), 'u').exec(haystack);
  return match === null ? null : { start: match.index, end: match.index + match[0].length };
}

function occurrences(haystack: string, needle: string): number[] {
  const starts: number[] = [];
  for (let index = haystack.indexOf(needle); index >= 0; index = haystack.indexOf(needle, index + 1)) {
    starts.push(index);
  }
  return starts;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * `MailConnector` over Office.js for the Outlook add-in's task pane. It works only with the
 * open item: in read mode the open email, in compose mode the draft and the earlier mail quoted
 * in it. Every write is checked against a fresh read first and verified by reading the body
 * again; a write is never repeated.
 *
 * Writes, as Office.js allows them (it has no range API):
 * - `replace-selection`: `setSelectedDataAsync`, after checking that the captured selection is
 *   still selected; no undo.
 * - `insert-empty`: `prependAsync` into an empty user region, above the signature and quote; no
 *   undo.
 * - `replace-body`: `setAsync`, only in a new message without a signature or quote, where it
 *   cannot touch earlier mail; undone by writing the previous body back.
 * - `create-reply` (read mode): `displayReplyFormAsync` opens a reply draft; nothing is sent.
 */
export function createOutlookAddinConnector(options: OutlookAddinConnectorOptions): MailConnector {
  const { mailbox } = options;
  const createId = options.createId ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date().toISOString());
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const settleMs = options.settleMs ?? DEFAULT_SETTLE_MS;
  const formatDate = options.formatDate ?? defaultFormatDate;

  const documentInstanceId = createId();
  let accountScopeId = accountScopeFor(mailbox.accountHint());
  const listeners = new Set<(event: MailEvent) => void>();
  const selections = new Map<string, SelectionRecord>();
  const undos = new Map<string, UndoRecord>();
  const attempts = new Map<string, 'applied' | 'uncertain' | 'rejected'>();
  let draft = { revision: 0, fingerprint: null as string | null };
  let thread = { revision: 0, fingerprint: null as string | null };
  let writing = false;
  let polling = false;
  let disposed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let stopItemChanged: (() => void) | null = null;

  const scope = (): MailScope => ({
    providerId: OUTLOOK_ADDIN_PROVIDER_ID,
    accountScopeId,
    documentInstanceId,
  });

  function probe(item: OfficeItem | null): CurrentItem | null {
    if (item === null) return null;
    const instanceKey = createId();
    const threadSource = item.conversationId ?? (item.mode === 'read' ? item.itemId : null);
    return {
      item,
      instanceKey,
      threadKey: threadSource === null ? null : `thread-${opaqueHash(threadSource)}`,
      messageKey: item.mode === 'read' ? `message-${opaqueHash(item.itemId ?? instanceKey)}` : null,
      composeType: null,
    };
  }

  let current = probe(mailbox.item());

  const emit = (event: MailEvent) => {
    for (const listener of [...listeners]) listener(event);
  };

  const composerRef = (entry: CurrentItem): ComposerRef => ({
    scope: scope(),
    composerKey: `draft-${entry.instanceKey}`,
    threadKey: entry.threadKey,
  });

  const threadRef = (entry: CurrentItem | null): ThreadRef | null =>
    entry?.threadKey == null ? null : { scope: scope(), threadKey: entry.threadKey };

  const features = (): PageFeatures => ({
    // Office.js reads a selection only while composing.
    receivedSelection: false,
    richContent: true,
    createReply: current?.item.mode === 'read' && current.threadKey !== null,
  });

  function getPageState(): PageState {
    return {
      support: 'ready',
      scope: scope(),
      activeThread: threadRef(current),
      composers: current?.item.mode === 'compose' ? [composerRef(current)] : [],
      features: features(),
    };
  }

  function composeEntry(ref: ComposerRef): ComposeEntry | null {
    if (current === null || current.item.mode !== 'compose' || !isSameScope(ref.scope, scope())) return null;
    return ref.composerKey === composerRef(current).composerKey ? (current as ComposeEntry) : null;
  }

  function isCurrentThread(ref: ThreadRef): boolean {
    return (
      current?.threadKey != null && ref.threadKey === current.threadKey && isSameScope(ref.scope, scope())
    );
  }

  function composeTypeOf(entry: ComposeEntry): Promise<ComposeType | null> {
    entry.composeType ??= entry.item.composeType();
    return entry.composeType;
  }

  /** Records the draft's fingerprint; a change raises the revision and is reported. */
  function trackDraft(entry: ComposeEntry, fingerprint: string): number {
    if (draft.fingerprint !== null && draft.fingerprint !== fingerprint) {
      draft = { revision: draft.revision + 1, fingerprint };
      emit({ type: 'composer-changed', ref: composerRef(entry), revision: draft.revision });
    } else {
      draft = { ...draft, fingerprint };
    }
    return draft.revision;
  }

  async function readDraft(entry: ComposeEntry): Promise<Result<ReadDraft, AppError>> {
    const [html, format, type] = await Promise.all([
      entry.item.getBodyHtml(),
      entry.item.bodyFormat(),
      composeTypeOf(entry),
    ]);
    if (!html.ok) return html;
    if (!format.ok) return format;
    if (current !== entry) return err(appError('TARGET_MISSING'));
    const isReply = type === null ? entry.item.conversationId !== null : type !== 'newMail';
    const body = readDraftBody(html.value, isReply);
    trackDraft(entry, body.fingerprint);
    return ok({ html: html.value, body, format: format.value, isReply });
  }

  /** Only a new message without a signature or quote: `setAsync` then touches nothing else. */
  const canReplaceBody = (read: ReadDraft) =>
    !read.isReply && read.body.anatomy.boundary === null && read.body.anatomy.canReplaceBody;

  async function poll(): Promise<void> {
    const entry = current;
    if (polling || writing || entry === null || entry.item.mode !== 'compose') return;
    polling = true;
    try {
      await readDraft(entry as ComposeEntry);
    } finally {
      polling = false;
    }
  }

  function startPolling(): void {
    if (pollMs > 0 && pollTimer === null) pollTimer = setInterval(() => void poll(), pollMs);
  }

  function stopPolling(): void {
    if (pollTimer !== null) clearInterval(pollTimer);
    pollTimer = null;
  }

  function itemChanged(): void {
    if (disposed) return;
    const previous = current;
    const previousThread = threadRef(previous);
    const previousComposer = previous?.item.mode === 'compose' ? composerRef(previous) : null;

    const nextScope = accountScopeFor(mailbox.accountHint());
    const accountChanged = nextScope !== 'unknown' && nextScope !== accountScopeId;
    if (accountChanged) accountScopeId = nextScope;
    current = probe(mailbox.item());
    draft = { revision: 0, fingerprint: null };
    thread = { revision: 0, fingerprint: null };
    selections.clear();
    undos.clear();

    if (accountChanged) emit({ type: 'account-changed' });
    if (previousComposer !== null) emit({ type: 'composer-removed', ref: previousComposer });
    const nextThread = threadRef(current);
    const sameThread =
      previousThread !== null &&
      nextThread !== null &&
      previousThread.threadKey === nextThread.threadKey &&
      isSameScope(previousThread.scope, nextThread.scope);
    if (!sameThread && (previousThread !== null || nextThread !== null)) {
      emit({ type: 'active-thread-changed', previous: previousThread, current: nextThread });
    }
    if (current?.item.mode === 'compose') emit({ type: 'composer-added', ref: composerRef(current) });
    emit({ type: 'page-state-changed', state: getPageState() });
  }

  void mailbox.onItemChanged(itemChanged).then((stop) => {
    if (disposed) stop();
    else stopItemChanged = stop;
  });

  function quotedChain(blocks: readonly TextBlock[]): TextBlock[] {
    // Only the recognized quote is conversation context; the draft and its signature are not.
    // The chain stays together: localized From/Sent headers do not reliably separate messages.
    return blocks
      .filter((block) => block.kind === 'quote' && block.text.trim() !== '')
      .map(({ text }) => ({ kind: 'unknown', certainty: 'uncertain', text }));
  }

  async function openReply(request: ApplyRequest, target: ReplyApplyTarget): Promise<ApplyOutcome> {
    const entry = current;
    // A draft is open: the pane cannot open another reply from it.
    if (entry?.item.mode === 'compose') return rejected('WRITE_UNSUPPORTED');
    if (
      entry === null ||
      entry.item.mode !== 'read' ||
      !isCurrentThread(target.threadRef) ||
      entry.messageKey !== target.messageKey ||
      thread.revision !== target.expectedThreadRevision
    ) {
      return rejected('THREAD_CHANGED');
    }
    const html = request.rich?.html ?? blockHtml(request.text);
    if (byteLength(html) > REPLY_FORM_LIMIT_BYTES) return rejected('REPLY_TOO_LARGE');
    // Marked before the call, so even an unexpected failure never opens a second reply.
    attempts.set(request.applyOperationId, 'uncertain');
    const opened = await entry.item.displayReplyForm(html);
    if (!opened.ok) return { status: 'uncertain', error: appError('WRITE_UNCERTAIN') };
    attempts.set(request.applyOperationId, 'applied');
    return { status: 'applied', composerRevision: null, undoId: null };
  }

  async function writeDraft(request: ApplyRequest, target: ComposerApplyTarget): Promise<ApplyOutcome> {
    const entry = composeEntry(target.composerRef);
    if (entry === null) return rejected('TARGET_MISSING');
    // Rich content is never written into a selection within a sentence.
    if (request.rich !== undefined && target.mode === 'replace-selection')
      return rejected('WRITE_UNSUPPORTED');

    const before = await readDraft(entry);
    if (!before.ok) return rejected(before.error.code);
    if (draft.revision !== target.expectedRevision) return rejected('TARGET_CHANGED');
    const { anatomy } = before.value.body;
    const { format } = before.value;
    // A plain-text body takes no formatting; the plain text of the result is written instead.
    const rich = format === 'html' ? request.rich : undefined;
    const visible = rich?.visibleText ?? request.text;
    const compare = rich === undefined ? comparableText : richComparable;
    const editable = anatomy.editableText;

    let starts: number[];
    let length: number;
    let write: () => Promise<Result<void, AppError>>;
    switch (target.mode) {
      case 'replace-selection': {
        const record = selections.get(target.selectionId);
        if (
          record === undefined ||
          record.composerKey !== target.composerRef.composerKey ||
          record.revision !== target.expectedRevision ||
          editable.slice(record.start, record.end) !== record.text
        ) {
          return rejected('SELECTION_INVALID');
        }
        // Office writes where the selection is now: it must still be the captured one. A lost
        // selection would put the text at the top of the body instead.
        const live = await entry.item.getSelectedText();
        if (
          !live.ok ||
          live.value === null ||
          live.value.source !== 'body' ||
          comparableText(live.value.text) !== comparableText(record.officeText)
        ) {
          return rejected('SELECTION_INVALID');
        }
        starts = occurrences(editable, record.text);
        length = record.text.length;
        const content = { html: inlineHtml(request.text), text: request.text };
        write = () => entry.item.replaceSelection(content, format);
        break;
      }
      case 'insert-empty': {
        if (!anatomy.canInsertIntoEmptyBody) return rejected('TARGET_CHANGED');
        starts = [0];
        length = editable.length;
        const content = { html: rich?.html ?? blockHtml(request.text), text: request.text };
        write = () => entry.item.prepend(content, format);
        break;
      }
      case 'replace-body': {
        if (!canReplaceBody(before.value)) return rejected('WRITE_UNSUPPORTED');
        starts = [0];
        length = editable.length;
        const content = { html: rich?.html ?? blockHtml(request.text), text: request.text };
        write = () => entry.item.setBody(content, format);
        break;
      }
    }
    const expected = new Set(
      starts.map((start) => compare(editable.slice(0, start) + visible + editable.slice(start + length))),
    );

    const verify = async (): Promise<ReadDraft | null> => {
      const after = await readDraft(entry);
      if (!after.ok) return null;
      const { anatomy: now } = after.value.body;
      return expected.has(compare(now.editableText)) &&
        isProtectedIntact(anatomy.protectedText, now.protectedText)
        ? after.value
        : null;
    };

    writing = true;
    try {
      // Marked before writing, so even an unexpected error never leads to an automatic retry.
      attempts.set(request.applyOperationId, 'uncertain');
      const written = await write();
      let after = await verify();
      if (after === null && settleMs > 0) {
        await sleep(settleMs);
        after = await verify();
      }
      if (after === null) {
        const now = await readDraft(entry);
        const unchanged =
          now.ok &&
          comparableText(now.value.body.anatomy.editableText) === comparableText(editable) &&
          comparableText(now.value.body.anatomy.protectedText) === comparableText(anatomy.protectedText);
        if (!written.ok && unchanged) {
          attempts.set(request.applyOperationId, 'rejected');
          return rejected('WRITE_UNSUPPORTED');
        }
        return { status: 'uncertain', error: appError('WRITE_UNCERTAIN') };
      }

      attempts.set(request.applyOperationId, 'applied');
      for (const [id, record] of selections) {
        if (record.composerKey === target.composerRef.composerKey) selections.delete(id);
      }
      undos.clear();
      // Only a whole-body write of an HTML body can be put back exactly with one call.
      if (target.mode !== 'replace-body' || format !== 'html') {
        return { status: 'applied', composerRevision: draft.revision, undoId: null };
      }
      const undoId = createId();
      undos.set(undoId, {
        composerKey: target.composerRef.composerKey,
        revisionAfter: draft.revision,
        previous: { html: before.value.html, text: editable },
        previousEditableText: editable,
        format,
      });
      return { status: 'applied', composerRevision: draft.revision, undoId };
    } finally {
      writing = false;
    }
  }

  return {
    providerId: OUTLOOK_ADDIN_PROVIDER_ID,

    getPageState,

    async readThread(ref, signal) {
      const entry = current;
      if (entry === null || !isCurrentThread(ref)) return err(appError('THREAD_CHANGED'));
      const html = await entry.item.getBodyHtml();
      if (signal.aborted) return err(appError('READ_CANCELLED'));
      if (!html.ok) return html;
      if (current !== entry) return err(appError('THREAD_CHANGED'));

      const read = readBlocks(html.value);
      let message: MessageSnapshot | null = null;
      if (entry.item.mode === 'read' && entry.messageKey !== null) {
        const blocks = read.blocks.filter((block) => block.text.trim() !== '');
        const { senderName, sentAt } = entry.item;
        message = {
          messageKey: entry.messageKey,
          senderLabel: senderName === null ? null : senderDisplayName(senderName),
          sentAt,
          sentAtText: sentAt === null ? null : formatDate(sentAt),
          displayOrder: 0,
          blocks,
        };
      } else if (entry.item.mode === 'compose') {
        const blocks = quotedChain(read.blocks);
        message =
          blocks.length === 0
            ? null
            : {
                messageKey: `quoted-${entry.threadKey ?? entry.instanceKey}`,
                senderLabel: null,
                sentAt: null,
                sentAtText: null,
                displayOrder: 0,
                blocks,
              };
      }
      // A message cut short by the reading limit is not passed on as if it were complete.
      const messages = message === null || read.truncated ? [] : [message];

      const fingerprint = messages
        .flatMap((item) => item.blocks.map((block) => `${block.kind}:${block.text}`))
        .join('\u0001');
      if (thread.fingerprint !== null && thread.fingerprint !== fingerprint) {
        thread = { revision: thread.revision + 1, fingerprint };
      } else {
        thread = { ...thread, fingerprint };
      }

      return ok({
        ref,
        revision: thread.revision,
        capturedAt: now(),
        subject: entry.item.mode === 'read' ? entry.item.subject : null,
        activeMessageKey: messages[0]?.messageKey ?? null,
        messages,
        coverage: {
          source: 'item-body',
          status: 'partial',
          readableMessageCount: messages.length,
          knownUnreadableMessageCount: read.truncated ? 1 : 0,
          reasons: read.truncated ? ['read-limit'] : [],
        },
      });
    },

    async readComposer(ref) {
      const entry = composeEntry(ref);
      if (entry === null) return err(appError('TARGET_MISSING'));
      const read = await readDraft(entry);
      if (!read.ok) return read;
      const { anatomy } = read.value.body;
      return ok({
        ref: composerRef(entry),
        revision: draft.revision,
        capturedAt: now(),
        editableText: anatomy.editableText,
        canReplaceBody: canReplaceBody(read.value),
        canReplaceSelection: true,
        canInsertIntoEmptyBody: anatomy.canInsertIntoEmptyBody,
        containsRichContent: anatomy.containsRichContent,
      });
    },

    async captureDraftSelection(ref) {
      const entry = composeEntry(ref);
      if (entry === null) return err(appError('TARGET_MISSING'));
      // The first call reads the live selection before focus can move on.
      const selected = await entry.item.getSelectedText();
      if (!selected.ok) return selected;
      if (selected.value === null || selected.value.source !== 'body') return ok(null);
      const read = await readDraft(entry);
      if (!read.ok) return read;
      const editable = read.value.body.anatomy.editableText;
      // A selection in the signature or the quote is not the user's text to replace.
      const range = locate(editable, selected.value.text);
      if (range === null) return ok(null);
      const record: SelectionRecord = {
        selectionId: createId(),
        composerKey: ref.composerKey,
        revision: draft.revision,
        start: range.start,
        end: range.end,
        text: editable.slice(range.start, range.end),
        officeText: selected.value.text,
      };
      selections.set(record.selectionId, record);
      return ok({
        selectionId: record.selectionId,
        composerRef: composerRef(entry),
        composerRevision: record.revision,
        start: record.start,
        end: record.end,
        text: record.text,
      });
    },

    // Office.js reads no selection in a received message.
    readSelectedMessageText: async () => ok(null),

    subscribe(listener) {
      listeners.add(listener);
      startPolling();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stopPolling();
      };
    },

    async applyText(request) {
      const previous = attempts.get(request.applyOperationId);
      if (previous === 'applied' || previous === 'uncertain') {
        return {
          status: 'rejected',
          error: appError(previous === 'uncertain' ? 'WRITE_UNCERTAIN' : 'TARGET_CHANGED'),
        };
      }
      if (request.text.trim().length === 0) {
        return { status: 'rejected', error: appError('RESULT_INVALID', { field: 'preview' }) };
      }
      return isComposerTarget(request.target)
        ? writeDraft(request, request.target)
        : openReply(request, request.target);
    },

    async undoChange(undoId): Promise<UndoOutcome> {
      const record = undos.get(undoId);
      const entry = current;
      if (
        record === undefined ||
        entry === null ||
        entry.item.mode !== 'compose' ||
        composerRef(entry).composerKey !== record.composerKey
      ) {
        return { status: 'rejected', error: appError('UNDO_INVALID') };
      }
      const compose = entry as ComposeEntry;
      writing = true;
      try {
        const before = await readDraft(compose);
        if (!before.ok) return { status: 'rejected', error: before.error };
        // The user changed the draft since: undoing would lose what they wrote.
        if (draft.revision !== record.revisionAfter) {
          return { status: 'rejected', error: appError('UNDO_INVALID') };
        }
        undos.delete(undoId);
        const written = await compose.item.setBody(record.previous, record.format);
        const restored = async () => {
          const after = await readDraft(compose);
          return (
            after.ok &&
            comparableText(after.value.body.anatomy.editableText) ===
              comparableText(record.previousEditableText)
          );
        };
        let isRestored = await restored();
        if (!isRestored && settleMs > 0) {
          await sleep(settleMs);
          isRestored = await restored();
        }
        if (isRestored) return { status: 'undone', composerRevision: draft.revision };
        const now = await readDraft(compose);
        const unchanged =
          now.ok &&
          comparableText(now.value.body.anatomy.editableText) ===
            comparableText(before.value.body.anatomy.editableText);
        return !written.ok && unchanged
          ? { status: 'rejected', error: appError('WRITE_UNSUPPORTED') }
          : { status: 'uncertain', error: appError('WRITE_UNCERTAIN') };
      } finally {
        writing = false;
      }
    },

    dispose() {
      disposed = true;
      stopPolling();
      stopItemChanged?.();
      stopItemChanged = null;
      listeners.clear();
      selections.clear();
      undos.clear();
      attempts.clear();
    },
  };
}
