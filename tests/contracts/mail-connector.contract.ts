import {
  pageFeatures,
  type ComposerRef,
  type MailConnector,
  type MailEvent,
  type ThreadRef,
} from '@writehand/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Shared contract tests every mail connector must pass. When a new connector
 * (e.g. Gmail Web) is added, the same tests run against it as well, and the
 * tests of the existing connectors must keep passing.
 */
export interface ContractHarness {
  readonly connector: MailConnector;
  /** Selects a phrase in the user-owned part of the draft. */
  selectInComposer(ref: ComposerRef, phrase: string): void;
  /** Simulates the user typing in the draft. */
  typeInComposer(ref: ComposerRef, text: string): void;
  /** A phrase present in the draft that can be selected. */
  readonly selectablePhrase: string;
  cleanup(): void;
}

const notAborted = { aborted: false };

export function describeMailConnectorContract(name: string, setup: () => ContractHarness): void {
  describe(`MailConnector contract: ${name}`, () => {
    let harness: ContractHarness;
    let connector: MailConnector;

    const firstComposer = (): ComposerRef => {
      const composer = connector.getPageState().composers[0];
      if (composer === undefined) {
        throw new Error('The contract test needs an open draft.');
      }
      return composer;
    };
    const activeThread = (): ThreadRef => {
      const thread = connector.getPageState().activeThread;
      if (thread === null) {
        throw new Error('The contract test needs an open conversation.');
      }
      return thread;
    };

    async function selectAndApply(text: string, applyOperationId = 'apply-1') {
      const composer = firstComposer();
      harness.selectInComposer(composer, harness.selectablePhrase);
      const selection = await connector.captureDraftSelection(composer);
      if (!selection.ok || selection.value === null) {
        throw new Error('Could not capture the selection.');
      }
      const request = {
        applyOperationId,
        target: {
          mode: 'replace-selection' as const,
          composerRef: composer,
          expectedRevision: selection.value.composerRevision,
          selectionId: selection.value.selectionId,
        },
        text,
      };
      return { composer, request, outcome: await connector.applyText(request) };
    }

    beforeEach(() => {
      harness = setup();
      connector = harness.connector;
    });
    afterEach(() => {
      connector.dispose();
      harness.cleanup();
    });

    it('reports page state with conversation and draft references from a single scope', () => {
      const state = connector.getPageState();
      expect(state.support).toBe('ready');
      expect(state.scope).not.toBeNull();
      expect(activeThread().scope).toEqual(state.scope);
      expect(
        state.composers.every((composer) => composer.scope.accountScopeId === state.scope?.accountScopeId),
      ).toBe(true);
    });

    it('does not read a conversation from another scope and never reports coverage as "complete"', async () => {
      const thread = activeThread();
      const foreign = { ...thread, scope: { ...thread.scope, accountScopeId: 'baska-hesap' } };
      const rejected = await connector.readThread(foreign, notAborted);
      expect(rejected).toEqual({ ok: false, error: expect.objectContaining({ code: 'THREAD_CHANGED' }) });

      const snapshot = await connector.readThread(thread, notAborted);
      if (!snapshot.ok) throw new Error(snapshot.error.code);
      expect(snapshot.value.ref).toEqual(thread);
      expect(['visible-dom', 'item-body']).toContain(snapshot.value.coverage.source);
      expect(['partial', 'unknown']).toContain(snapshot.value.coverage.status);
    });

    it('does not offer a new reply while a draft is open, and refuses that target without writing', async () => {
      expect(pageFeatures(connector.getPageState()).createReply).toBe(false);
      const before = await connector.readComposer(firstComposer());
      const outcome = await connector.applyText({
        applyOperationId: 'apply-reply',
        target: {
          mode: 'create-reply',
          threadRef: activeThread(),
          messageKey: 'm1',
          expectedThreadRevision: 1,
        },
        text: 'Yeni yanıt',
      });
      expect(outcome).toEqual({
        status: 'rejected',
        error: expect.objectContaining({ code: 'WRITE_UNSUPPORTED' }),
      });
      expect(await connector.readComposer(firstComposer())).toEqual(before);
    });

    it('returns TARGET_MISSING for an unknown draft', async () => {
      const composer = { ...firstComposer(), composerKey: 'olmayan-taslak' };
      expect(await connector.readComposer(composer)).toEqual({
        ok: false,
        error: expect.objectContaining({ code: 'TARGET_MISSING' }),
      });
    });

    it("matches the captured selection to the range in the draft's editable text", async () => {
      const composer = firstComposer();
      harness.selectInComposer(composer, harness.selectablePhrase);
      const selection = await connector.captureDraftSelection(composer);
      const snapshot = await connector.readComposer(composer);
      if (!selection.ok || selection.value === null || !snapshot.ok) throw new Error('unexpected error');

      expect(selection.value.text).toBe(harness.selectablePhrase);
      expect(snapshot.value.editableText.slice(selection.value.start, selection.value.end)).toBe(
        harness.selectablePhrase,
      );
    });

    it('does not write twice with the same apply operation ID', async () => {
      const { request, outcome } = await selectAndApply('YENİ METİN');
      expect(outcome.status).toBe('applied');
      const again = await connector.applyText(request);
      expect(again.status).toBe('rejected');
    });

    it('does not write to a stale target after the draft has changed', async () => {
      const composer = firstComposer();
      harness.selectInComposer(composer, harness.selectablePhrase);
      const selection = await connector.captureDraftSelection(composer);
      if (!selection.ok || selection.value === null) throw new Error('no selection');
      harness.typeInComposer(composer, ' sonradan yazdım');

      const outcome = await connector.applyText({
        applyOperationId: 'apply-stale',
        target: {
          mode: 'replace-selection',
          composerRef: composer,
          expectedRevision: selection.value.composerRevision,
          selectionId: selection.value.selectionId,
        },
        text: 'YENİ METİN',
      });
      const after = await connector.readComposer(composer);
      expect(outcome).toEqual({
        status: 'rejected',
        error: expect.objectContaining({ code: 'TARGET_CHANGED' }),
      });
      expect(after.ok && after.value.editableText.includes('YENİ METİN')).toBe(false);
      expect(after.ok && after.value.editableText.includes('sonradan yazdım')).toBe(true);
    });

    it('undoes the last apply, but not after the user has typed in between', async () => {
      const before = await connector.readComposer(firstComposer());
      const { composer, outcome } = await selectAndApply('YENİ METİN');
      if (outcome.status !== 'applied' || outcome.undoId === null) throw new Error('not applied');

      const undone = await connector.undoChange(outcome.undoId);
      const restored = await connector.readComposer(composer);
      expect(undone.status).toBe('undone');
      expect(restored.ok && before.ok && restored.value.editableText).toBe(
        before.ok && before.value.editableText,
      );

      const second = await selectAndApply('İKİNCİ', 'apply-2');
      if (second.outcome.status !== 'applied' || second.outcome.undoId === null)
        throw new Error('not applied');
      harness.typeInComposer(composer, ' yeni yazı');
      expect(await connector.undoChange(second.outcome.undoId)).toEqual({
        status: 'rejected',
        error: expect.objectContaining({ code: 'UNDO_INVALID' }),
      });
    });

    it('can unsubscribe', () => {
      const events: MailEvent[] = [];
      const unsubscribe = connector.subscribe((event) => events.push(event));
      unsubscribe();
      expect(typeof unsubscribe).toBe('function');
      expect(events).toEqual([]);
    });
  });
}
