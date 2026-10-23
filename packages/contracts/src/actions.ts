import { z } from 'zod';

import type { ContextSnapshot } from './context';
import type { TargetLanguage } from './languages';
import type { ComposerRef, ThreadRef } from './mail';

export const OPERATIONS = ['revise', 'translate', 'reply', 'compose'] as const;
export type Operation = (typeof OPERATIONS)[number];

/**
 * Operations whose source is the user's instruction: a reply to the conversation
 * (`reply`) and a new email without context (`compose`). The others work on existing text.
 */
export function isInstructionOperation(operation: Operation): operation is 'reply' | 'compose' {
  return operation === 'reply' || operation === 'compose';
}

export const TONES = ['neutral', 'formal', 'friendly'] as const;
export type Tone = (typeof TONES)[number];

export type SourceOrigin = 'panel' | 'draft' | 'draft-selection' | 'received-message';

/**
 * Where the result is written in an open draft. Replacing a selection cannot be
 * represented without a `selectionId`.
 */
export type ComposerApplyTarget =
  | {
      readonly mode: 'replace-selection';
      readonly composerRef: ComposerRef;
      readonly expectedRevision: number;
      readonly selectionId: string;
    }
  | {
      readonly mode: 'replace-body' | 'insert-empty';
      readonly composerRef: ComposerRef;
      readonly expectedRevision: number;
    };

/**
 * Opens a new reply to a received message with the result (an Outlook add-in in read mode).
 * Nothing existing is overwritten and nothing is sent; the user edits or discards the reply.
 * It is never derived automatically: the user chooses it in the panel.
 */
export interface ReplyApplyTarget {
  readonly mode: 'create-reply';
  readonly threadRef: ThreadRef;
  /** The message replied to; it must still be the open one. */
  readonly messageKey: string;
  readonly expectedThreadRevision: number;
}

/** Where the result is written: an open draft, or a new reply to the open message. */
export type ApplyTarget = ComposerApplyTarget | ReplyApplyTarget;

export type ApplyMode = ApplyTarget['mode'];

export function isComposerTarget(target: ApplyTarget): target is ComposerApplyTarget {
  return target.mode !== 'create-reply';
}

/**
 * A requested change to a finished result (e.g. turn it into a table, shorten it).
 * The original task stays as context; the change is applied to the previous result.
 */
export interface Refinement {
  readonly instruction: string;
  readonly previous: string;
}

export const REFINEMENTS = ['table', 'list', 'chart', 'shorter', 'formal', 'friendly'] as const;
export type RefinementKind = (typeof REFINEMENTS)[number];
export const MAX_REFINEMENT_LENGTH = 500;

/** Refinements that need formatting; offered only for results written to the whole draft. */
export const RICH_REFINEMENTS: readonly RefinementKind[] = ['table', 'list', 'chart'];

/** Explicit instructions for the model; the UI labels are localized. */
export const REFINEMENT_INSTRUCTIONS: Readonly<Record<RefinementKind, string>> = {
  table:
    'Present the key facts or figures as a Markdown table where that makes them easier to read. Keep the greeting, the surrounding sentences and the sign-off as normal text.',
  list: 'Restructure the main content into concise bullet points. Keep the greeting and the sign-off as normal lines.',
  chart:
    'Add a bar chart (a ```chart block) that visualises the numbers already in the text, where it fits best. Use only numbers that appear in the text. If there are fewer than two comparable numbers, leave the text unchanged.',
  shorter:
    'Make it noticeably shorter and more concise while keeping every important fact, request and date.',
  formal: 'Make the tone more formal and professional.',
  friendly: 'Make the tone warmer and friendlier while staying professional.',
};

/**
 * Validated, immutable action record. It is an independent copy of the data, not a
 * reference to the on-screen Vue object. No prompt is built at this stage.
 */
export interface PreparedAction {
  readonly requestId: string;
  readonly sessionId: string;
  readonly formRevision: number;
  readonly operation: Operation;
  readonly source: {
    readonly origin: SourceOrigin;
    readonly text: string;
  };
  /** The user's request when drafting a reply; never merged with the email content. */
  readonly instruction: string;
  /** Set only for translation; replies and new emails follow the conversation or instruction language. */
  readonly targetLanguage: TargetLanguage | null;
  readonly tone: Tone;
  readonly context: ContextSnapshot | null;
  /** Immutable copy of the target at preparation time. The session owns the current target. */
  readonly target: ApplyTarget | null;
  /** When set, the previous result is changed with this instruction. */
  readonly refinement: Refinement | null;
  readonly createdAt: string;
}

/** Result record validated before it is accepted into the preview. */
export const previewCandidateSchema = z
  .object({
    requestId: z.string().min(1).max(128),
    sessionId: z.string().min(1).max(128),
    formRevision: z.number().int().nonnegative(),
    text: z.string(),
    /** Marks a sample result from the development source. */
    sample: z.boolean(),
  })
  .strict();

export type PreviewCandidate = z.infer<typeof previewCandidateSchema>;
