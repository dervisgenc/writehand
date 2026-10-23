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
  type MailScope,
  type Result,
} from '@writehand/contracts';

import { editableRegionRange, emptyInsertionRange, type ComposerAnatomy } from '../composer-anatomy';
import type { SelectionRegistry } from '../selection/selection-registry';
import { rangeForOffsets } from '../selection/text-range-map';
import { comparableText, isEditorWritable, isProtectedIntact, type ComposerHandle } from './composer-handle';
import type { EditorWriter } from './editor-writer';
import type { UndoStore } from './undo-store';

export interface WriteDependencies {
  readonly document: Document;
  readonly scope: () => MailScope;
  readonly findComposer: (ref: ComposerRef) => ComposerHandle | null;
  readonly selections: SelectionRegistry;
  readonly undo: UndoStore;
  readonly writer: EditorWriter;
  readonly createId: () => string;
  /** Waits for the editor's next regular re-render; the result is then verified again. */
  readonly settle: () => Promise<void>;
  /** Apply operation id → outcome. The same id never writes twice. */
  readonly attempts: Map<string, 'applied' | 'uncertain' | 'rejected'>;
}

interface WritePlan {
  readonly range: Range;
  readonly start: number;
  readonly end: number;
}

const RICH_SELECTOR = 'table, img, picture, svg, video, audio, iframe, object, embed, canvas';

function rejected(code: ErrorCode): ApplyOutcome {
  return { status: 'rejected', error: appError(code, { field: 'target' }) };
}

function crossesStructure(range: Range): boolean {
  if (range.cloneContents().querySelector(RICH_SELECTOR) !== null) {
    return true;
  }
  const cellOf = (node: Node) =>
    (node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement)?.closest('td, th') ?? null;
  return cellOf(range.startContainer) !== cellOf(range.endContainer);
}

function planWrite(
  target: ComposerApplyTarget,
  anatomy: ComposerAnatomy,
  deps: WriteDependencies,
): Result<WritePlan, AppError> {
  switch (target.mode) {
    case 'replace-selection': {
      const record = deps.selections.get(target.selectionId);
      const isValid =
        record !== null &&
        record.composerKey === target.composerRef.composerKey &&
        record.revision === target.expectedRevision &&
        anatomy.editableText.slice(record.start, record.end) === record.text;
      if (!isValid) {
        // Searching for the same text elsewhere on the page is forbidden; ask for a new selection.
        return err(appError('SELECTION_INVALID', { field: 'target' }));
      }
      const range = rangeForOffsets(deps.document, anatomy.editableSegments, record.start, record.end);
      if (range === null) {
        return err(appError('SELECTION_INVALID', { field: 'target' }));
      }
      if (crossesStructure(range)) {
        return err(appError('WRITE_UNSUPPORTED', { field: 'target' }));
      }
      return ok({ range, start: record.start, end: record.end });
    }
    case 'replace-body':
      if (!anatomy.canReplaceBody) {
        return err(appError('WRITE_UNSUPPORTED', { field: 'target' }));
      }
      return ok({ range: editableRegionRange(anatomy), start: 0, end: anatomy.editableText.length });
    case 'insert-empty':
      if (!anatomy.canInsertIntoEmptyBody) {
        return err(appError('TARGET_CHANGED', { field: 'target' }));
      }
      return ok({ range: emptyInsertionRange(anatomy), start: 0, end: 0 });
  }
}

/**
 * In rich content, table cells read back joined by " | ", and list markers and
 * chart bars are not text. The comparison ignores whitespace and cell separators.
 */
function richComparable(text: string): string {
  return text.normalize('NFC').replace(/[\s|]+/gu, '');
}

/**
 * Re-validates the target right before writing to the DOM, inserts the plain
 * text as a single edit and checks the result by reading the editor again.
 * There is no await or network call between the last check and the write.
 */
export async function applyText(request: ApplyRequest, deps: WriteDependencies): Promise<ApplyOutcome> {
  const { target } = request;
  // A web mail page has no reply the connector could open; that target belongs to Office add-ins.
  if (!isComposerTarget(target)) {
    return rejected('WRITE_UNSUPPORTED');
  }
  if (request.text.trim().length > 0) {
    await focusEditor(target.composerRef, deps);
  }
  return applyFocused(request, target, deps);
}

/**
 * When the draft gains focus, the mail app may fill in the quote or restructure
 * the content. The editor is focused before writing and that reaction is awaited;
 * all checks run afterwards, with no await between them and the write.
 */
export async function focusEditor(ref: ComposerRef, deps: WriteDependencies): Promise<void> {
  if (!isSameScope(ref.scope, deps.scope())) {
    return;
  }
  const handle = deps.findComposer(ref);
  if (handle === null || !isEditorWritable(handle.editor)) {
    return;
  }
  const active = deps.document.activeElement;
  if (active !== null && handle.editor.contains(active)) {
    return;
  }
  handle.editor.focus({ preventScroll: true });
  await deps.settle();
}

async function applyFocused(
  request: ApplyRequest,
  target: ComposerApplyTarget,
  deps: WriteDependencies,
): Promise<ApplyOutcome> {
  const { text, rich, applyOperationId } = request;

  const previous = deps.attempts.get(applyOperationId);
  if (previous === 'applied' || previous === 'uncertain') {
    return {
      status: 'rejected',
      error: appError(previous === 'uncertain' ? 'WRITE_UNCERTAIN' : 'TARGET_CHANGED'),
    };
  }
  if (text.trim().length === 0) {
    return { status: 'rejected', error: appError('RESULT_INVALID', { field: 'preview' }) };
  }
  if (!isSameScope(target.composerRef.scope, deps.scope())) {
    return rejected('TARGET_MISSING');
  }
  // Rich content is never written into a selection within a sentence.
  if (rich !== undefined && target.mode === 'replace-selection') {
    return rejected('WRITE_UNSUPPORTED');
  }
  const handle = deps.findComposer(target.composerRef);
  if (handle === null || !isEditorWritable(handle.editor)) {
    return rejected('TARGET_MISSING');
  }
  // An active IME composition means the user is changing this draft.
  if (handle.tracker.isComposing() || handle.tracker.sync() !== target.expectedRevision) {
    return rejected('TARGET_CHANGED');
  }

  const before = handle.readAnatomy();
  const plan = planWrite(target, before, deps);
  if (!plan.ok) {
    return { status: 'rejected', error: plan.error };
  }
  const { start, end } = plan.value;
  const prefix = before.editableText.slice(0, start);
  const suffix = before.editableText.slice(end);
  const compare = rich === undefined ? comparableText : richComparable;
  const expected = compare(prefix + (rich?.visibleText ?? text) + suffix);

  // Marked before writing, so even an unexpected error never leads to an automatic retry.
  deps.attempts.set(applyOperationId, 'uncertain');
  let accepted: boolean;
  try {
    accepted =
      rich === undefined
        ? deps.writer.replaceRange(handle.editor, plan.value.range, text)
        : deps.writer.insertHtml(handle.editor, plan.value.range, rich.html);
  } catch {
    accepted = false;
  }

  const verify = (): ComposerAnatomy | null => {
    const current = handle.readAnatomy();
    const isExpected =
      compare(current.editableText) === expected &&
      isProtectedIntact(before.protectedText, current.protectedText);
    return isExpected ? current : null;
  };

  let after = verify();
  if (after !== null) {
    await deps.settle();
    after = verify();
  }

  if (after === null) {
    const unchanged =
      comparableText(handle.readAnatomy().editableText) === comparableText(before.editableText);
    if (!accepted && unchanged) {
      deps.attempts.set(applyOperationId, 'rejected');
      return rejected('WRITE_UNSUPPORTED');
    }
    return { status: 'uncertain', error: appError('WRITE_UNCERTAIN') };
  }

  const revisionAfter = handle.tracker.sync();
  deps.selections.forgetComposer(target.composerRef.composerKey);
  deps.attempts.set(applyOperationId, 'applied');

  const boundariesIntact = after.editableText.startsWith(prefix) && after.editableText.endsWith(suffix);
  if (!boundariesIntact) {
    // If the changed part cannot be delimited exactly, undo is not offered.
    deps.undo.forgetComposer(target.composerRef.composerKey);
    return { status: 'applied', composerRevision: revisionAfter, undoId: null };
  }

  const undoId = deps.createId();
  deps.undo.save({
    undoId,
    applyOperationId,
    composerRef: target.composerRef,
    revisionAfter,
    start,
    insertedText: after.editableText.slice(start, after.editableText.length - suffix.length),
    previousText: before.editableText.slice(start, end),
    editableTextBefore: before.editableText,
    protectedText: before.protectedText,
  });
  return { status: 'applied', composerRevision: revisionAfter, undoId };
}
