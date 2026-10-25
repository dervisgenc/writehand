import { isSea } from 'node:sea';
import { AiFailure } from '@writehand/ai-openai';
import addinFileEntries from 'writehand:addin-files';

import { runHost } from './host';
import { configuredPlatform, install, removeLeftovers, status, uninstall } from './install';
import { parseCommand, USAGE } from './install-plan';
import {
  addinFiles,
  disableOutlook,
  enableOutlook,
  outlookStatus,
  serveOutlook,
  systemIo,
  type OutlookContext,
} from './outlook';
import { hostPlatform } from './platform';
import { createUpdater, UPDATE_FAILURES } from './update';
import { HOST_VERSION } from './version';

/**
 * The helper app's single entry point. Browsers start it as their native messaging host;
 * in a terminal it installs, removes or describes itself. The release build is one program
 * (Node.js single executable application); a development build is this script run by Node.js.
 */
async function main(): Promise<void> {
  const command = parseCommand(process.argv.slice(2), process.stdin.isTTY === true);
  const addin = addinFiles(addinFileEntries);
  switch (command.kind) {
    case 'host': {
      const { platform, config } = await configuredPlatform();
      void removeLeftovers(platform);
      runHost(platform, config);
      return;
    }
    case 'install':
      await install(hostPlatform(), {
        extensionIds: command.extensionIds,
        development: command.development,
        source: isSea()
          ? { program: process.execPath }
          : { script: process.argv[1] ?? '', node: process.execPath },
        addin,
      });
      return;
    case 'uninstall':
      await uninstall(hostPlatform(), {
        deleteData: command.deleteData,
        runningProgram: isSea() ? process.execPath : null,
      });
      return;
    case 'status': {
      const { platform, config } = await configuredPlatform();
      await status(platform, config);
      return;
    }
    case 'update': {
      const updater = createUpdater(await configuredPlatform());
      if (command.checkOnly) {
        process.stdout.write(`${updater.describe(await updater.check(true))}\n`);
        return;
      }
      const { version } = await updater.update('inherit');
      if (version === HOST_VERSION) process.stdout.write(`${updater.describe(await updater.check())}\n`);
      return;
    }
    case 'outlook': {
      const { platform, config } = await configuredPlatform();
      const context: OutlookContext = { platform, config, files: addin };
      if (command.action === 'serve') {
        void removeLeftovers(platform);
        await serveOutlook(context, systemIo);
      } else if (command.action === 'enable') await enableOutlook(context, systemIo);
      else if (command.action === 'disable') await disableOutlook(context, systemIo);
      else await outlookStatus(context, systemIo);
      return;
    }
    case 'version':
      process.stdout.write(`${HOST_VERSION}\n`);
      return;
    case 'help':
      process.stdout.write(USAGE);
      return;
  }
}

main().catch((error: unknown) => {
  // Never on stdout: in host mode stdout carries only framed protocol messages.
  const message =
    error instanceof AiFailure
      ? (UPDATE_FAILURES[error.code] ?? error.code)
      : error instanceof Error
        ? error.message
        : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
