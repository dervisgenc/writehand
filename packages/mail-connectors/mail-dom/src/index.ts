export { createComposerRegistry } from './composer-registry';
export type { ComposerRegistry, ComposerRegistryOptions, FoundComposer } from './composer-registry';
export { composerFingerprint, readComposerAnatomy } from './composer-anatomy';
export type { AnatomyOptions, ComposerAnatomy } from './composer-anatomy';
export {
  innermostElements,
  isEditableElement,
  isRenderedElement,
  isVisibleElement,
  outermostElements,
} from './dom';
export { extractTextBlocks } from './extract-text-blocks';
export type { ElementRole, ExtractedBlock, ExtractOptions, TextSegment } from './extract-text-blocks';
export { createIdentityRegistry, opaqueHash } from './identity';
export type { IdentityRegistry } from './identity';
export { locateLauncherAnchors } from './launcher-anchors';
export type { AnchorSources, MailLauncherAnchor } from './launcher-anchors';
export { observePage } from './observe-page';
export type { ObservePageOptions, PageObserver } from './observe-page';
export { captureReceivedSelection } from './selection/capture-received-selection';
export type { ReceivedSelectionSources } from './selection/capture-received-selection';
export {
  createMailMarkupClassifier,
  MAIL_QUOTE_START_SELECTORS,
  MAIL_SIGNATURE_SELECTORS,
  WORD_MAIL_QUOTE_START_SELECTORS,
  WORD_MAIL_SIGNATURE_SELECTORS,
} from './mail-markup';
export type { MailMarkup } from './mail-markup';
export { labelText, senderDisplayName } from './text';
export { isDarkBackground, relativeLuminance } from './theme';
export { comparableText, isProtectedIntact } from './writing/composer-handle';
export { createExecCommandWriter, createPasteEventWriter } from './writing/editor-writer';
export type { EditorWriter } from './writing/editor-writer';
export { selectorQueries } from './selectors';
export type { EvidenceLevel, SelectorDefinition, SelectorQueries, SelectorStatus } from './selectors';
