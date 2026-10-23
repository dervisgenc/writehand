import type { TextBlockKind } from '@writehand/contracts';

import { isRendered } from './dom';

/**
 * One-to-one mapping of the `[start, end)` range in the output text to the
 * `[nodeOffset, nodeOffset + (end - start))` range in a text node. Inserted line
 * breaks and separators map to no node.
 */
export interface TextSegment {
  readonly node: Text;
  readonly nodeOffset: number;
  readonly start: number;
  readonly end: number;
}

export interface ExtractedBlock {
  readonly kind: TextBlockKind;
  readonly certainty: 'certain' | 'uncertain';
  readonly text: string;
  readonly segments: readonly TextSegment[];
}

/**
 * An element's role in the text: everything after `quote-start` counts as quote;
 * `signature` covers only the element's own content; `exclude` skips the content
 * entirely.
 */
export type ElementRole = 'quote-start' | 'signature' | 'exclude' | null;

export interface ExtractOptions {
  readonly classify?: (element: Element) => ElementRole;
  /** The walk stops on reaching this element (e.g. the signature boundary in an editor). */
  readonly stopAt?: Element | null;
  /** Inspection budget in UTF-16 code units. Exceeding it sets `truncated`. */
  readonly maxLength?: number;
}

export interface ExtractionResult {
  readonly blocks: readonly ExtractedBlock[];
  readonly truncated: boolean;
}

const SKIPPED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'HEAD',
  'META',
  'LINK',
  'TITLE',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'BUTTON',
  'FORM',
  'IMG',
  'PICTURE',
  'SVG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'IFRAME',
  'OBJECT',
  'EMBED',
]);

const BLOCK_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DD',
  'DIV',
  'DL',
  'DT',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'TBODY',
  'THEAD',
  'TFOOT',
  'TR',
  'UL',
  'CENTER',
]);

const TABLE_CELL_SEPARATOR = ' | ';

/** Structural elements whose whitespace-only text nodes are not rendered. */
const STRUCTURAL_PARENTS = new Set(['TABLE', 'TBODY', 'THEAD', 'TFOOT', 'TR', 'UL', 'OL', 'DL']);

/**
 * Invisible tracking and preview text is usually hidden with inline styles. In
 * environments without `checkVisibility` (e.g. the test DOM) and in documents that are never
 * rendered (body HTML parsed with `DOMParser`) this check is the fallback.
 */
function isHidden(element: Element): boolean {
  if (element.hasAttribute('hidden')) {
    return true;
  }
  const style = element.getAttribute('style')?.toLowerCase().replace(/\s+/g, '') ?? '';
  if (
    style.includes('display:none') ||
    style.includes('visibility:hidden') ||
    style.includes('mso-hide:all')
  ) {
    return true;
  }
  if (typeof element.checkVisibility === 'function' && isRendered(element)) {
    return !element.checkVisibility({ visibilityProperty: true });
  }
  return false;
}

/** Number of trailing line breaks (at most two); the breaks may span several parts. */
function trailingBreaks(parts: readonly string[]): number {
  let count = 0;
  for (let index = parts.length - 1; index >= 0 && count < 2; index -= 1) {
    const part = parts[index] ?? '';
    let position = part.length - 1;
    while (position >= 0 && part.charAt(position) === '\n' && count < 2) {
      count += 1;
      position -= 1;
    }
    if (position >= 0) {
      break;
    }
  }
  return count;
}

function isPreformatted(element: Element): boolean {
  return element.tagName === 'PRE' || /white-space:\s*pre/i.test(element.getAttribute('style') ?? '');
}

class BlockWriter {
  readonly blocks: { kind: TextBlockKind; parts: string[]; segments: TextSegment[]; length: number }[] = [];
  private pendingBreaks = 0;
  private totalLength = 0;
  truncated = false;

  constructor(private readonly maxLength: number) {}

  private current(kind: TextBlockKind) {
    const last = this.blocks[this.blocks.length - 1];
    if (last !== undefined && last.kind === kind) {
      return last;
    }
    const block = { kind, parts: [] as string[], segments: [] as TextSegment[], length: 0 };
    this.blocks.push(block);
    this.pendingBreaks = 0;
    return block;
  }

  private endsWithBreak(kind: TextBlockKind): boolean {
    const block = this.current(kind);
    const lastPart = block.parts[block.parts.length - 1];
    return block.length === 0 || lastPart === undefined || lastPart.endsWith('\n');
  }

  /** Characters written so far (including synthetic text). */
  get written(): number {
    return this.totalLength;
  }

  requestBreak(count = 1): void {
    this.pendingBreaks = Math.max(this.pendingBreaks, count);
  }

  /** Synthetic text that maps to no node (line break, list marker, table separator). */
  writeSynthetic(kind: TextBlockKind, text: string): void {
    this.flushBreaks(kind);
    // A separator starting with a space does not double up with a preceding space.
    const value = text.startsWith(' ') && this.endsWithSpace(kind) ? text.slice(1) : text;
    this.append(kind, value, null, 0);
  }

  writeText(kind: TextBlockKind, node: Text, preformatted: boolean): void {
    const data = node.data;
    let index = 0;
    while (index < data.length && !this.truncated) {
      const char = data.charAt(index);
      if (!preformatted && /[ \t\n\r\f]/.test(char)) {
        // Runs of whitespace collapse to one space; whitespace at the start of a line is skipped.
        let runEnd = index + 1;
        while (runEnd < data.length && /[ \t\n\r\f]/.test(data.charAt(runEnd))) {
          runEnd += 1;
        }
        if (this.pendingBreaks === 0 && !this.endsWithBreak(kind) && !this.endsWithSpace(kind)) {
          this.append(kind, ' ', node, index);
        }
        index = runEnd;
        continue;
      }
      let runEnd = index + 1;
      while (runEnd < data.length && (preformatted || !/[ \t\n\r\f]/.test(data.charAt(runEnd)))) {
        runEnd += 1;
      }
      this.flushBreaks(kind);
      // Non-breaking spaces become regular spaces one-for-one, keeping the mapping intact.
      this.append(kind, data.slice(index, runEnd).replace(/\u00a0/g, ' '), node, index);
      index = runEnd;
    }
  }

  private endsWithSpace(kind: TextBlockKind): boolean {
    const block = this.current(kind);
    return block.parts[block.parts.length - 1]?.endsWith(' ') ?? false;
  }

  private flushBreaks(kind: TextBlockKind): void {
    if (this.pendingBreaks === 0) {
      return;
    }
    const breaks = this.pendingBreaks;
    this.pendingBreaks = 0;
    const block = this.current(kind);
    if (block.length === 0) {
      return;
    }
    const existing = trailingBreaks(block.parts);
    if (breaks > existing) {
      this.append(kind, '\n'.repeat(breaks - existing), null, 0);
    }
  }

  /**
   * A single space right before a line break is invisible, so it is left out of
   * the text. Whitespace runs are always written as a separate `' '` part, so only
   * that part and its mapping are rolled back. A selection point on an unmapped
   * space snaps to the nearest text in the selection mapping.
   */
  private dropTrailingSpace(block: BlockWriter['blocks'][number]): void {
    if (block.parts[block.parts.length - 1] !== ' ') {
      return;
    }
    block.parts.pop();
    const lastSegment = block.segments[block.segments.length - 1];
    if (lastSegment !== undefined && lastSegment.end === block.length) {
      block.segments.pop();
    }
    block.length -= 1;
    this.totalLength -= 1;
  }

  private append(kind: TextBlockKind, text: string, node: Text | null, nodeOffset: number): void {
    if (this.totalLength + text.length > this.maxLength) {
      this.truncated = true;
      return;
    }
    const block = this.current(kind);
    if (text.startsWith('\n')) {
      this.dropTrailingSpace(block);
    }
    if (node !== null) {
      block.segments.push({ node, nodeOffset, start: block.length, end: block.length + text.length });
    }
    block.parts.push(text);
    block.length += text.length;
    this.totalLength += text.length;
  }
}

/**
 * Converts message or editor content to plain text with a controlled DOM walk.
 * The email HTML is never re-inserted into the page or executed; a single
 * `textContent` call is avoided because it would mix in hidden text.
 */
export function extractTextBlocks(root: Node, options: ExtractOptions = {}): ExtractionResult {
  const writer = new BlockWriter(options.maxLength ?? Number.POSITIVE_INFINITY);
  /** Characters written when each table row was entered. */
  const rowStarts = new Map<Element, number>();
  let mode: 'body' | 'quote' = 'body';
  let stopped = false;

  const visit = (node: Node, kind: () => TextBlockKind, preformatted: boolean): void => {
    if (writer.truncated || stopped) {
      return;
    }
    if (node === options.stopAt) {
      stopped = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      // Formatting whitespace inside table and list structure is not visible in the browser either.
      const parentTag = node.parentElement?.tagName.toUpperCase() ?? '';
      if (STRUCTURAL_PARENTS.has(parentTag) && (node.textContent ?? '').trim() === '') {
        return;
      }
      writer.writeText(kind(), node as Text, preformatted);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const element = node as Element;
    const tag = element.tagName.toUpperCase();
    if (SKIPPED_TAGS.has(tag) || isHidden(element)) {
      return;
    }

    const role = options.classify?.(element) ?? null;
    if (role === 'exclude') {
      return;
    }
    if (role === 'quote-start') {
      mode = 'quote';
    }
    // Nested elements inside a signature inherit the signature kind; everything
    // after the quote starts is quote.
    const childKind: () => TextBlockKind = role === 'signature' && mode === 'body' ? () => 'signature' : kind;

    if (tag === 'BR') {
      writer.writeSynthetic(kind(), '\n');
      return;
    }

    const isBlock = BLOCK_TAGS.has(tag) || role !== null;
    if (isBlock) {
      writer.requestBreak(tag === 'P' ? 2 : 1);
    }
    if (tag === 'LI') {
      const parent = element.parentElement;
      const marker =
        parent?.tagName === 'OL'
          ? `${
              Array.from(parent.children)
                .filter((child) => child.tagName === 'LI')
                .indexOf(element) + 1
            }. `
          : '- ';
      writer.writeSynthetic(childKind(), marker);
    }
    if (tag === 'TR') {
      rowStarts.set(element, writer.written);
    }
    // A cell separator is added only if earlier cells in the row wrote text, so
    // empty color/spacer cells in email templates produce no separator.
    const rowStart = element.parentElement === null ? undefined : rowStarts.get(element.parentElement);
    if ((tag === 'TD' || tag === 'TH') && rowStart !== undefined && writer.written > rowStart) {
      writer.writeSynthetic(childKind(), TABLE_CELL_SEPARATOR);
    }

    const childPreformatted = preformatted || isPreformatted(element);
    for (const child of Array.from(element.childNodes)) {
      visit(child, childKind, childPreformatted);
    }

    if (isBlock) {
      writer.requestBreak(tag === 'P' ? 2 : 1);
    }
  };

  for (const child of Array.from(root.childNodes)) {
    visit(child, () => (mode === 'quote' ? 'quote' : 'body'), false);
  }

  const blocks = writer.blocks
    .map((block) => ({
      kind: block.kind,
      certainty: 'certain' as const,
      text: block.parts.join(''),
      segments: block.segments,
    }))
    .filter((block) => block.text.trim().length > 0);
  return { blocks: mergeAdjacentBlocks(blocks), truncated: writer.truncated };
}

/**
 * Blocks of the same kind that only a whitespace-only block separated (for example a signature
 * whose "-- " line is followed by a line break outside it) become one block. The second block's
 * text is joined after a line break and its node mapping is shifted with it.
 */
function mergeAdjacentBlocks(blocks: readonly ExtractedBlock[]): ExtractedBlock[] {
  const merged: ExtractedBlock[] = [];
  for (const block of blocks) {
    const previous = merged[merged.length - 1];
    if (previous === undefined || previous.kind !== block.kind) {
      merged.push(block);
      continue;
    }
    const separator = previous.text.endsWith('\n') || block.text.startsWith('\n') ? '' : '\n';
    const offset = previous.text.length + separator.length;
    merged[merged.length - 1] = {
      ...previous,
      text: previous.text + separator + block.text,
      segments: [
        ...previous.segments,
        ...block.segments.map((segment) => ({
          ...segment,
          start: segment.start + offset,
          end: segment.end + offset,
        })),
      ],
    };
  }
  return merged;
}
