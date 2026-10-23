/** An element the user can type in: `contenteditable="true"` and, in browsers, really editable. */
export function isEditableElement(element: HTMLElement): boolean {
  if (element.getAttribute('contenteditable') !== 'true') {
    return false;
  }
  // The test DOM does not implement `isContentEditable`; browsers get the extra check.
  return element.isContentEditable !== false;
}

/**
 * Whether the element belongs to a document that is laid out. A document parsed with `DOMParser`
 * has no window and no layout: `checkVisibility` reports every element of it as hidden.
 */
export function isRendered(element: Element): boolean {
  return element.isConnected && element.ownerDocument.defaultView !== null;
}

/** Visible on screen; environments without `checkVisibility` (the test DOM) count it as visible. */
export function isVisibleElement(element: HTMLElement): boolean {
  return typeof element.checkVisibility === 'function' && isRendered(element)
    ? element.checkVisibility()
    : true;
}

/** Keeps only the outermost elements: a match nested inside another match is dropped. */
export function outermostElements<T extends Element>(elements: readonly T[]): T[] {
  return elements.filter(
    (element) => !elements.some((other) => other !== element && other.contains(element)),
  );
}

/** Keeps only the innermost elements: a match that contains another match is dropped. */
export function innermostElements<T extends Element>(elements: readonly T[]): T[] {
  return elements.filter(
    (element) => !elements.some((other) => other !== element && element.contains(other)),
  );
}

/**
 * Whether the element is rendered: not hidden by itself or an ancestor. Browsers answer with
 * `checkVisibility`; the test DOM, which lacks it, is checked for `hidden` and an inline
 * `display: none` on the element and its ancestors.
 */
export function isRenderedElement(element: HTMLElement): boolean {
  if (typeof element.checkVisibility === 'function' && isRendered(element)) {
    return element.checkVisibility();
  }
  for (let current: HTMLElement | null = element; current !== null; current = current.parentElement) {
    const style = current.getAttribute('style')?.toLowerCase().replace(/\s+/g, '') ?? '';
    if (current.hidden || style.includes('display:none')) {
      return false;
    }
  }
  return true;
}
