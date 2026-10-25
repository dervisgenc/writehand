import { z } from 'zod';

import { helperCommandSchema, helperStatusSchema } from './ai';
import { hostInfoSchema, hostUpdateCheckSchema, hostUpdateResultSchema } from './host';
import {
  cancellationRequestSchema,
  cancellationResultSchema,
  emptyPayloadSchema,
  generationRequestSchema,
  generationResultSchema,
  requestSchema,
} from './protocol';

/**
 * Requests the background sends to the helper app over native messaging. Their format stays
 * readable by every helper app version the extension supports (`MIN_HOST_VERSION`): a new
 * capability is a new request type, which an older helper app answers with
 * `AI_VERSION_MISMATCH`. The extension's own messages never reach the helper app.
 */
export const hostRequestSchema = z.discriminatedUnion('type', [
  requestSchema('AI_STATUS', emptyPayloadSchema),
  requestSchema('AI_COMMAND', helperCommandSchema),
  requestSchema('AI_GENERATE', generationRequestSchema),
  requestSchema('AI_CANCEL', cancellationRequestSchema),
  requestSchema('HOST_INFO', emptyPayloadSchema),
  requestSchema('HOST_UPDATE_CHECK', emptyPayloadSchema),
  requestSchema('HOST_UPDATE', emptyPayloadSchema),
]);

export type HostRequest = z.infer<typeof hostRequestSchema>;
export type HostRequestType = HostRequest['type'];

/** Response schema for each request type. */
export const HOST_RESPONSE_PAYLOADS = {
  AI_STATUS: helperStatusSchema,
  AI_COMMAND: helperStatusSchema,
  AI_GENERATE: generationResultSchema,
  AI_CANCEL: cancellationResultSchema,
  HOST_INFO: hostInfoSchema,
  HOST_UPDATE_CHECK: hostUpdateCheckSchema,
  HOST_UPDATE: hostUpdateResultSchema,
} as const satisfies Record<HostRequestType, z.ZodType>;

export type HostResponsePayload<T extends HostRequestType> = z.infer<(typeof HOST_RESPONSE_PAYLOADS)[T]>;

/**
 * The helper app's local Outlook add-in server answers the task pane's requests at this path, on
 * the pane's own origin. A request carries the token the server wrote into the pane's page.
 */
export const OUTLOOK_BRIDGE = Object.freeze({
  path: '/api/host',
  tokenHeader: 'x-writehand-bridge',
  /** `<meta name>` in `taskpane.html` whose `content` the server fills with the token. */
  tokenMeta: 'writehand-bridge',
});

/**
 * What the add-in may ask the helper app. Updates are not among them: they stay with the browser
 * extension's settings and the `writehand update` command.
 */
export const OUTLOOK_BRIDGE_REQUESTS: ReadonlySet<HostRequestType> = new Set([
  'AI_STATUS',
  'AI_COMMAND',
  'AI_GENERATE',
  'AI_CANCEL',
  'HOST_INFO',
]);
