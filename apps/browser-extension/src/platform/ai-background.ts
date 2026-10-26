import type { AiConnection, HelperClient } from '@writehand/ai-connection';
import { appError, err, ok } from '@writehand/contracts';

import type { RuntimeHandlers } from './runtime-messaging';

export function createAiHandlers(options: {
  connection: AiConnection;
  helper: HelperClient;
  openOptions: () => Promise<void>;
}): RuntimeHandlers {
  const { connection, helper } = options;
  const owners = new Map<string, string>();
  return {
    AI_STATUS: async () => ok(await connection.status()),
    AI_COMMAND: (command) => connection.command(command),
    AI_SUMMARY: async () => ok(await connection.summary()),
    AI_GENERATE: async (payload, sender) => {
      if (owners.has(payload.generationId)) return err(appError('MESSAGE_REJECTED'));
      owners.set(payload.generationId, `${sender.tab?.id}:${sender.url}`);
      try {
        return await connection.generate(payload.generationId, payload.input);
      } finally {
        owners.delete(payload.generationId);
      }
    },
    AI_CANCEL: (payload, sender) => {
      if (owners.get(payload.generationId) !== `${sender.tab?.id}:${sender.url}`)
        return Promise.resolve(ok({ cancelled: false }));
      return connection.cancel(payload.generationId);
    },
    HOST_INFO: () => helper.info(),
    HOST_UPDATE_CHECK: () => helper.checkUpdate(),
    HOST_UPDATE: () => helper.update(),
    OPEN_OPTIONS: async () => {
      await options.openOptions();
      return ok({ opened: true });
    },
  };
}
