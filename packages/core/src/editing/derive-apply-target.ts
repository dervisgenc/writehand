import { isInstructionOperation, type ApplyTarget, type Operation } from '@writehand/contracts';

import type { SessionState, SourceBinding } from '../session/session-state';

/**
 * Derives a safe write target from the source binding. Text typed in the panel or a
 * received message never grants permission to overwrite the open draft automatically.
 * Replacing a non-empty draft when drafting a reply also requires explicit confirmation.
 */
export function deriveApplyTarget(binding: SourceBinding, operation: Operation): ApplyTarget | null {
  switch (binding.kind) {
    case 'draft-selection':
      return {
        mode: 'replace-selection',
        composerRef: binding.composerRef,
        expectedRevision: binding.composerRevision,
        selectionId: binding.selectionId,
      };
    case 'draft': {
      const isEmpty = binding.loadedText.trim().length === 0;
      if (isEmpty && binding.canInsertIntoEmptyBody) {
        return {
          mode: 'insert-empty',
          composerRef: binding.composerRef,
          expectedRevision: binding.composerRevision,
        };
      }
      // Text written from an instruction never replaces a non-empty draft on its own; the user confirms.
      if (!isEmpty && binding.canReplaceBody && !isInstructionOperation(operation)) {
        return {
          mode: 'replace-body',
          composerRef: binding.composerRef,
          expectedRevision: binding.composerRevision,
        };
      }
      return null;
    }
    case 'panel':
    case 'received-message':
      return null;
  }
}

/**
 * Current target for the write. The session is its only owner. A received message never grants
 * a draft target; a new reply the user chose writes over nothing, so it stays valid.
 */
export function effectiveApplyTarget(state: SessionState): ApplyTarget | null {
  if (state.binding.kind === 'received-message') {
    return state.explicitTarget?.mode === 'create-reply' ? state.explicitTarget : null;
  }
  return state.explicitTarget ?? deriveApplyTarget(state.binding, state.form.operation);
}
