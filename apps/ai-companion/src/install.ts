import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access, chmod, copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { createClaudeCodeProvider, findClaudeBinary } from '@writehand/ai-claude-code';
import { createOpenAiOAuth } from '@writehand/ai-openai';
import { HOST_BROWSERS, PRODUCT_NAME } from '@writehand/contracts';

import { createCredentialStore } from './credential-store';
import { DEFAULT_HOST_CONFIG, hostEnvironment, parseHostConfig, type HostConfig } from './host-config';
import { allowedExtensions, commandPath, planInstall, planUninstall } from './install-plan';
import { hostPlatform, type HostPlatform } from './platform';
import { disableOutlook, installOutlook, refreshOutlook, systemIo } from './outlook';
import type { AddinFile } from './outlook-server';
import { readRegistration, registeredBrowsers } from './registrations';
import { HOST_VERSION } from './version';

/** The commands' thin layer: plans come from install-plan.ts, this applies them to the computer. */

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );
const firstExisting = async (paths: readonly string[]) => {
  for (const path of paths) if (await exists(path)) return path;
  return null;
};
const print = (text: string) => process.stdout.write(`${text}\n`);

export async function readHostConfig(platform: HostPlatform): Promise<HostConfig> {
  return parseHostConfig(await readFile(platform.configPath, 'utf8').catch(() => null));
}

/**
 * The platform as the host sees it: the environment the installation recorded is applied
 * first, so Claude Code is found and runs with the installing terminal's account.
 */
export async function configuredPlatform(): Promise<{ platform: HostPlatform; config: HostConfig }> {
  const config = await readHostConfig(hostPlatform());
  let user: string | undefined;
  try {
    user = userInfo().username;
  } catch {
    user = undefined;
  }
  Object.assign(
    process.env,
    hostEnvironment(process.env, config, { user, delimiter: hostPlatform().path.delimiter }),
  );
  return { platform: hostPlatform(), config };
}

/** Programs moved aside while running (Windows) are removed once they no longer run. */
export async function removeLeftovers(platform: HostPlatform): Promise<void> {
  const names = await readdir(platform.installDirectory).catch(() => []);
  for (const name of names.filter((item) => item.endsWith('.old')))
    await rm(platform.path.join(platform.installDirectory, name), { force: true }).catch(() => undefined);
}

/** Copies the running program into place without ever leaving a partly written file there. */
async function placeProgram(platform: HostPlatform, source: string, target: string, mode: number) {
  // Running the installed copy itself (e.g. `install` again from the install folder).
  if (platform.path.relative(source, target) === '') return;
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await copyFile(source, temporary);
    await chmod(temporary, mode);
    if (platform.movesRunningProgramAside)
      await rename(target, `${target}.${randomUUID()}.old`).catch((error: unknown) => {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function install(
  platform: HostPlatform,
  options: {
    readonly extensionIds: readonly string[];
    readonly development: boolean;
    /** The running program: the single-file build, or the bundled script run by Node.js. */
    readonly source: { readonly program: string } | { readonly script: string; readonly node: string };
    /** The Outlook add-in's files this program carries. */
    readonly addin: ReadonlyMap<string, AddinFile>;
    /** Also turns on the Outlook add-in server (`install --outlook`). */
    readonly outlook: boolean;
  },
): Promise<void> {
  if (options.outlook && platform.outlook === null)
    throw new Error('The Outlook add-in server is available on Windows only so far.');
  const node = 'node' in options.source ? options.source.node : null;
  if (options.development !== (node !== null))
    throw new Error(
      options.development
        ? '--dev installs the Node.js build of a source checkout: run it with node dist/cli.mjs.'
        : 'This is the Node.js build of a source checkout; install it with --dev (pnpm ai:install).',
    );
  const registered = await Promise.all(HOST_BROWSERS.map((browser) => readRegistration(platform, browser)));
  // pnpm puts the workspace's node_modules/.bin first in PATH; those are not user installations.
  const claude = await findClaudeBinary(
    platform.claudeLocations.filter((location) => !location.split(/[\\/]/).includes('node_modules')),
  );
  const nodeFound = node ?? (await firstExisting(platform.nodeLocations));
  const previous = await readHostConfig(platform);
  const config: HostConfig = {
    ...DEFAULT_HOST_CONFIG,
    // `writehand outlook enable` stays on across updates.
    outlook: previous.outlook,
    development: options.development,
    claudePath: claude.ok && claude.value.args.length === 0 ? claude.value.file : null,
    claudeConfigDir: process.env.CLAUDE_CONFIG_DIR || null,
    nodeDirectory: nodeFound === null ? null : platform.path.dirname(nodeFound),
  };
  const plan = planInstall(platform, {
    extensionIds: allowedExtensions(
      options.extensionIds,
      registered.filter((manifest) => manifest !== null),
    ),
    config,
    node: node ?? '',
  });

  for (const directory of plan.directories)
    await mkdir(directory.path, { recursive: true, mode: directory.mode });
  await placeProgram(
    platform,
    'program' in options.source ? options.source.program : options.source.script,
    plan.program.path,
    plan.program.mode,
  );
  for (const file of plan.files) {
    await writeFile(file.path, file.content, { mode: file.mode });
    await chmod(file.path, file.mode);
  }
  for (const entry of plan.registry) await platform.registry?.set(entry.key, entry.value);
  await removeLeftovers(platform);
  // The Outlook add-in server, if it is on, now runs this version.
  await refreshOutlook({ platform, config, files: options.addin }, systemIo);

  const claudeState =
    config.claudePath ??
    (!claude.ok && claude.error.code === 'AI_CLAUDE_UNSUPPORTED_INSTALL'
      ? 'only a claude.cmd script was found, which cannot be started safely (install Claude Code with the native installer)'
      : 'not found (install it and run this command again to use it)');
  print(
    [
      `${PRODUCT_NAME} helper ${HOST_VERSION}${options.development ? ' (development)' : ''} installed: ${commandPath(platform, options.development)}`,
      `Registered with: ${plan.browsers.join(', ')}`,
      ...(plan.skipped.length > 0
        ? [
            `Not registered with ${plan.skipped.join(', ')}: no extension ID is known yet (use --extension-id=ID).`,
          ]
        : []),
      `Claude Code: ${claudeState}${config.claudeConfigDir ? ` · configuration: ${config.claudeConfigDir}` : ''}`,
      'Reload the extension or restart the browser, then open its settings.',
    ].join('\n'),
  );
  if (options.outlook) {
    print('');
    await installOutlook({ platform, config, files: options.addin }, systemIo).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `The helper app is installed, but the Outlook add-in server is not on. ${reason} Run the same command again to retry.`,
      );
    });
  }
}

/** Signs out of every ChatGPT account (revoking its session where possible) and deletes the credentials. */
async function deleteData(platform: HostPlatform): Promise<void> {
  if (!(await exists(platform.dataDirectory))) return;
  const state = await createCredentialStore(platform.dataDirectory, {
    restrictDirectory: platform.restrictDirectory,
  })
    .read()
    .catch(() => null);
  const oauth = createOpenAiOAuth();
  let unconfirmed = 0;
  for (const account of state?.accounts ?? []) {
    const refresh = account.credentials?.refreshToken;
    if (refresh && !(await oauth.revoke(account.clientId, refresh).catch(() => false))) unconfirmed++;
  }
  await rm(platform.dataDirectory, { recursive: true, force: true });
  print(
    `Credentials deleted from ${platform.dataDirectory}.` +
      (unconfirmed > 0
        ? ` ${unconfirmed} ChatGPT session(s) could not be revoked; remove access in ChatGPT → Settings → Security and login.`
        : ''),
  );
}

export async function uninstall(
  platform: HostPlatform,
  options: { readonly deleteData: boolean; readonly runningProgram: string | null },
): Promise<void> {
  const config = await readHostConfig(platform);
  // Stops the Outlook add-in server and removes its certificate before the program goes.
  if (config.outlook !== null && platform.outlook !== null)
    await disableOutlook({ platform, config, files: new Map() }, systemIo);
  const plan = planUninstall(platform);
  for (const key of plan.registryKeys) await platform.registry?.remove(key);
  for (const file of plan.files) await rm(file, { force: true });
  if (options.deleteData) await deleteData(platform);
  const inside = options.runningProgram && platform.path.relative(plan.directory, options.runningProgram);
  const running = !!inside && !inside.startsWith('..') && !platform.path.isAbsolute(inside);
  const removal = running ? platform.deferredRemoval(plan.directory, process.pid) : null;
  if (removal === null) await rm(plan.directory, { recursive: true, force: true });
  else
    await new Promise<void>((resolve) => {
      const child = spawn(removal.file, [...removal.args], {
        env: removal.env ?? process.env,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.once('error', () => resolve());
      child.once('exit', () => resolve());
    });
  const dataKept = !options.deleteData && (await exists(platform.dataDirectory));
  print(
    `${PRODUCT_NAME} helper removed from ${plan.directory} and from all browsers.` +
      (dataKept ? ` Credentials remain in ${platform.dataDirectory} (use --delete-data).` : ''),
  );
}

/** Version, registrations and Claude Code readiness; never account details or tokens. */
export async function status(platform: HostPlatform, config: HostConfig): Promise<void> {
  const program = commandPath(platform, config.development);
  const installed = await exists(program);
  const browsers = installed ? await registeredBrowsers(platform, program) : [];
  const claude = await createClaudeCodeProvider({
    env: process.env,
    findBinary: () => findClaudeBinary(platform.claudeLocations),
  })
    .status()
    .catch(() => null);
  const claudeState =
    claude === null
      ? 'could not be checked'
      : !claude.installed
        ? 'not found'
        : !claude.loggedIn
          ? 'installed, not signed in (run claude, then /login)'
          : `ready${claude.subscription ? '' : ' (signed in with an API key, billed to that account)'}`;
  print(
    [
      `${PRODUCT_NAME} helper ${HOST_VERSION} (${platform.target.os}-${platform.target.arch})${config.development ? ', development' : ''}`,
      `Program: ${installed ? program : `not installed (${program})`}`,
      `Browsers: ${browsers.length > 0 ? browsers.join(', ') : 'none'}`,
      `Claude Code: ${claudeState}`,
      ...(platform.outlook === null
        ? []
        : [`Outlook add-in: ${config.outlook === null ? 'off' : 'on (writehand outlook status)'}`]),
    ].join('\n'),
  );
}
