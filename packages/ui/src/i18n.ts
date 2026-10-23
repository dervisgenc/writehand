import type {
  ApplyMode,
  ContextNotice,
  ErrorCode,
  RefinementKind,
  Operation,
  SourceOrigin,
  Tone,
} from '@writehand/contracts';
import { inject, provide, type InjectionKey, type Ref } from 'vue';
import type { AiText } from './ai-text';
import type { HelperText } from './helper';

type CountedNotice = Extract<ContextNotice, { count: number }>['kind'];
type PlainNotice = Exclude<ContextNotice['kind'], CountedNotice>;

/**
 * All panel text. Components never produce text of their own; the dictionary
 * comes from the extension's `locales/` files.
 */
export interface UiText {
  /** Locale (BCP 47) used for language names and sorting. */
  readonly locale: string;
  readonly ai: AiText;
  readonly helper: HelperText;
  readonly panelTitle: string;
  readonly close: string;
  /** The "Draft reply" button in the reading pane. */
  readonly threadLauncher: {
    readonly label: string;
    readonly tooltip: string;
    /** Added to the tooltip: the button can be dragged out of the way. */
    readonly dragHint: string;
  };
  /** Toolbar embedded in the compose area. */
  readonly compose: {
    readonly toolbarLabel: string;
    readonly reply: string;
    readonly replyTooltip: string;
    readonly write: string;
    readonly writeTooltip: string;
    readonly revise: string;
    readonly reviseTooltip: string;
    readonly translate: string;
    readonly translateTooltip: (language: string) => string;
    readonly chooseLanguage: string;
    readonly openPanel: string;
  };
  /** Result card next to the compose area. */
  readonly inline: {
    readonly titles: Readonly<Record<Operation, string>>;
    readonly instructionLabel: string;
    readonly instructionPlaceholder: string;
    readonly write: string;
    readonly contextChip: (count: number) => string;
    readonly contextReading: string;
    readonly openPanel: string;
    readonly translatedTo: (language: string) => string;
    readonly translateLanguage: string;
    readonly translate: string;
    readonly translateAgain: string;
  };
  readonly operations: Readonly<Record<Operation, string>>;
  readonly prepareButton: Readonly<Record<Operation, string>>;
  readonly target: {
    readonly label: string;
    readonly none: string;
    readonly composer: string;
    readonly replyComposer: string;
    readonly receivedMessage: string;
    /** A new reply to the open email, opened by the mail app (Outlook add-in in read mode). */
    readonly newReply: string;
  };
  readonly source: {
    readonly textLabel: string;
    readonly instructionLabel: string;
    readonly composeInstructionLabel: string;
    readonly originLabel: string;
    readonly origins: Readonly<Record<SourceOrigin, string>>;
    readonly edited: string;
    readonly placeholders: Readonly<Record<Operation, string>>;
    readonly loadDraft: string;
    readonly loadSelection: string;
    readonly loadReceivedSelection: string;
    readonly confirmReplace: string;
    readonly confirm: string;
    readonly cancel: string;
    readonly characters: (count: number, limit: number) => string;
  };
  readonly options: {
    readonly targetLanguage: string;
    readonly tone: string;
    readonly tones: Readonly<Record<Tone, string>>;
    readonly useConversation: string;
    readonly languagePlaceholder: string;
    readonly otherLanguage: string;
    readonly manageLanguages: string;
  };
  readonly context: {
    readonly title: string;
    readonly summary: (included: number, total: number) => string;
    readonly refresh: string;
    readonly read: string;
    readonly reading: string;
    readonly notLoaded: string;
    readonly stale: string;
    readonly activeLocked: string;
    readonly chooseReplyTarget: string;
    readonly replyTarget: string;
    readonly unknownSender: string;
    readonly currentGroup: string;
    readonly otherGroup: (count: number) => string;
    readonly otherHint: string;
    readonly includeMessage: (sender: string) => string;
    readonly replyTargetBadge: string;
    readonly editedBadge: string;
    readonly showBody: string;
    readonly hideBody: string;
    readonly edit: string;
    readonly editLabel: string;
    readonly save: string;
    readonly cancelEdit: string;
    readonly resetEdit: string;
    readonly omittedBlock: Readonly<Record<'signature' | 'quote', string>>;
    readonly includeBlock: string;
    readonly counted: Readonly<Record<CountedNotice, (count: number) => string>>;
    readonly plain: Readonly<Record<PlainNotice, string>>;
  };
  readonly preview: {
    readonly title: string;
    readonly regenerate: string;
    readonly sampleLabel: string;
    /** Short label for narrow spaces (the result card); the full description stays in the tooltip. */
    readonly sampleShort: string;
    readonly stale: string;
    readonly unchanged: string;
    readonly editSource: string;
    readonly showFormatted: string;
  };
  /** Bar for refining a finished result. */
  readonly refine: {
    readonly title: string;
    readonly kinds: Readonly<Record<RefinementKind, string>>;
    readonly customLabel: string;
    readonly customPlaceholder: string;
    readonly customSubmit: string;
  };
  readonly apply: {
    readonly scopeLabel: string;
    readonly scopes: Readonly<Record<ApplyMode, string>>;
    readonly noTarget: string;
    readonly formattingNote: string;
    readonly copy: string;
    readonly apply: string;
    readonly undo: string;
    readonly replaceExistingReply: string;
    readonly useOpenComposer: string;
    /** Opens a new reply to the open email with the result. */
    readonly createReply: string;
  };
  readonly status: {
    readonly reading: string;
    readonly preparing: string;
    readonly applying: string;
    readonly undoing: string;
    readonly applied: string;
    readonly undone: string;
    readonly copied: string;
    readonly retry: string;
    readonly dismiss: string;
  };
  readonly errors: Readonly<Record<ErrorCode, string>>;
}

const UI_TEXT_KEY: InjectionKey<Readonly<Ref<UiText>>> = Symbol('writehand-ui-text');

export function provideUiText(text: Readonly<Ref<UiText>>): void {
  provide(UI_TEXT_KEY, text);
}

export function useUiText(): Readonly<Ref<UiText>> {
  const text = inject(UI_TEXT_KEY);
  if (text === undefined) {
    throw new Error('UiText was not provided: call provideUiText first.');
  }
  return text;
}

export function describeNotice(text: UiText, notice: ContextNotice): string {
  return 'count' in notice
    ? text.context.counted[notice.kind](notice.count)
    : text.context.plain[notice.kind];
}
