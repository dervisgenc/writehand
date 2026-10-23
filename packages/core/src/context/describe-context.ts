import type { ContextNotice, ContextSnapshot, OmissionReason } from '@writehand/contracts';

type CountedNoticeKind = Extract<ContextNotice, { count: number }>['kind'];

function countMessages(context: ContextSnapshot, reason: OmissionReason): number {
  return context.omissions.filter(
    (omission) => omission.reason === reason && omission.blockIndex === undefined,
  ).length;
}

function countBlocks(context: ContextSnapshot, reason: OmissionReason): number {
  return context.omissions.filter(
    (omission) => omission.reason === reason && omission.blockIndex !== undefined,
  ).length;
}

/**
 * Produces records that explain the context's coverage to the user. Incomplete coverage
 * is never hidden behind a generic "Context ready" message.
 */
export function describeContext(context: ContextSnapshot): ContextNotice[] {
  const notices: ContextNotice[] = [{ kind: 'message-count', count: context.messages.length }];
  const { coverage } = context;

  if (coverage.knownUnreadableMessageCount !== null && coverage.knownUnreadableMessageCount > 0) {
    notices.push({ kind: 'collapsed-unread', count: coverage.knownUnreadableMessageCount });
  } else if (
    coverage.knownUnreadableMessageCount === null &&
    coverage.reasons.includes('collapsed-messages')
  ) {
    notices.push({ kind: 'collapsed-unknown' });
  }
  if (coverage.reasons.includes('virtualized-content')) {
    notices.push({ kind: 'virtualized-content' });
  }
  if (coverage.reasons.includes('read-limit')) {
    notices.push({ kind: 'read-limit' });
  }
  if (coverage.source === 'visible-dom') {
    notices.push({ kind: 'coverage-unverified' });
  } else {
    notices.push({ kind: 'open-item-only' });
  }

  const counted: [CountedNoticeKind, number][] = [
    ['other-conversations', context.messages.filter((m) => m.conversation === 'other').length],
    ['user-edited', context.messages.filter((m) => m.edited).length],
    ['user-excluded', countMessages(context, 'user-excluded')],
    ['message-limited', countMessages(context, 'message-limit')],
    ['size-limited', countMessages(context, 'size-limit')],
    ['signature-removed', countBlocks(context, 'signature')],
    ['duplicate-quote-removed', countBlocks(context, 'duplicate-quote')],
  ];
  for (const [kind, count] of counted) {
    if (count > 0) {
      notices.push({ kind, count });
    }
  }

  if (context.ordering === 'display-order') {
    notices.push({ kind: 'display-order-used' });
  }
  return notices;
}
