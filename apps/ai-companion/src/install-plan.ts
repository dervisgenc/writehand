import {
  CHROMIUM_EXTENSION_IDS,
  FIREFOX_EXTENSION_ID,
  HELPER_COMMAND,
  HOST_BROWSERS,
  NATIVE_HOST_NAME,
  OUTLOOK_ADDIN_PORT,
  PRODUCT_NAME,
  type HostBrowser,
} from '@writehand/contracts';

import { serializeHostConfig, type HostConfig } from './host-config';
import type { HostPlatform } from './platform';
import type { HostManifest } from './registrations';

export type CliCommand =
  | { readonly kind: 'host' }
  | { readonly kind: 'help' }
  | { readonly kind: 'version' }
  | {
      readonly kind: 'install';
      readonly extensionIds: readonly string[];
      readonly development: boolean;
      /** Also turns on the Outlook add-in server (`outlook enable`) unless it is on already. */
      readonly outlook: boolean;
    }
  | { readonly kind: 'uninstall'; readonly deleteData: boolean }
  | { readonly kind: 'status' }
  | { readonly kind: 'update'; readonly checkOnly: boolean }
  | { readonly kind: 'outlook'; readonly action: OutlookAction };

export const OUTLOOK_ACTIONS = ['enable', 'disable', 'status', 'serve'] as const;
export type OutlookAction = (typeof OUTLOOK_ACTIONS)[number];

export const USAGE = `Usage: ${HELPER_COMMAND} <command>

Commands:
  install [--extension-id=ID]... [--dev] [--outlook]
      Install the helper app for this user and register it with Firefox, Chrome, Edge
      and Brave. --extension-id allows another extension, e.g. an unpacked development
      build. --dev installs the Node.js build of a source checkout. --outlook (Windows)
      also turns on the Outlook add-in server, as outlook enable does.
  uninstall [--delete-data]
      Remove the browser registrations and the program. --delete-data also signs out
      of ChatGPT and deletes credentials and API keys from this computer.
  status
      Show the version, the browser registrations and whether Claude Code is ready.
  update [--check]
      Install the latest release if it is newer, after verifying its signature and
      checksum. --check only reports whether a newer release exists.
  outlook enable | disable | status
      Windows: serve the Outlook add-in on this computer (https://localhost:${OUTLOOK_ADDIN_PORT}) so
      the new and classic Outlook can use the ChatGPT and Claude plans. enable asks Windows to
      trust a certificate valid only for this computer's local addresses, starts the server now
      and at sign-in, and writes the manifest to add in Outlook. disable removes all of it.
      (outlook serve is the server itself, which Windows starts at sign-in.)
  version
      Print the version.

Browsers start the program without a command; it then serves the ${PRODUCT_NAME} extension.
`;

const COMMANDS = new Set([
  'install',
  'outlook',
  'uninstall',
  'status',
  'update',
  'version',
  '--version',
  'help',
  '--help',
  '-h',
]);

/**
 * Reads the command line. Browsers start the host with their own arguments (an extension
 * origin or a manifest path and extension ID), which are never commands. A terminal gets help
 * instead of a host that would wait for browser messages.
 */
export function parseCommand(argv: readonly string[], interactive: boolean): CliCommand {
  const [name, ...args] = argv;
  if (name === undefined || !COMMANDS.has(name)) {
    if (!interactive) return { kind: 'host' };
    if (name === undefined) return { kind: 'help' };
    throw new Error(`Unknown command: ${name}\n\n${USAGE}`);
  }
  const isExtensionId = (arg: string) => arg.startsWith('--extension-id=');
  const accept = (options: readonly string[], extensionIds = false) => {
    const unknown = args.find((arg) => !options.includes(arg) && !(extensionIds && isExtensionId(arg)));
    if (unknown !== undefined) throw new Error(`Unknown option for ${name}: ${unknown}\n\n${USAGE}`);
  };
  switch (name) {
    case 'install':
      accept(['--dev', '--outlook'], true);
      return {
        kind: 'install',
        extensionIds: args.filter(isExtensionId).map((arg) => arg.slice('--extension-id='.length)),
        development: args.includes('--dev'),
        outlook: args.includes('--outlook'),
      };
    case 'uninstall':
      accept(['--delete-data']);
      return { kind: 'uninstall', deleteData: args.includes('--delete-data') };
    case 'status':
      accept([]);
      return { kind: 'status' };
    case 'update':
      accept(['--check']);
      return { kind: 'update', checkOnly: args.includes('--check') };
    case 'outlook': {
      const [action, ...rest] = args;
      if (!OUTLOOK_ACTIONS.includes(action as OutlookAction) || rest.length > 0)
        throw new Error(`Usage: ${HELPER_COMMAND} outlook enable | disable | status

${USAGE}`);
      return { kind: 'outlook', action: action as OutlookAction };
    }
    case 'version':
    case '--version':
      accept([]);
      return { kind: 'version' };
    default:
      return { kind: 'help' };
  }
}

const CHROMIUM_ID = /^[a-p]{32}$/;
const FIREFOX_ID = /^([\w.+-]+@[\w.-]+|\{[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}\})$/i;
const CHROMIUM_ORIGIN = /^chrome-extension:\/\/([a-p]{32})\/$/;

export interface ExtensionIds {
  readonly firefox: readonly string[];
  readonly chromium: readonly string[];
}

/**
 * The extensions allowed to start the helper: the store IDs built into it, IDs given on the
 * command line and IDs of the existing registrations, so that installing again (or updating)
 * never disconnects an extension that worked before. `uninstall` clears them.
 */
export function allowedExtensions(
  given: readonly string[],
  registered: readonly HostManifest[],
): ExtensionIds {
  for (const id of given)
    if (!CHROMIUM_ID.test(id) && !FIREFOX_ID.test(id)) throw new Error(`Not an extension ID: ${id}`);
  const previous = registered.flatMap((manifest) =>
    manifest.allowed.map((entry) => CHROMIUM_ORIGIN.exec(entry)?.[1] ?? entry),
  );
  const all = [...given, ...previous];
  const unique = (ids: readonly string[]) => [...new Set(ids)];
  return {
    firefox: unique([
      FIREFOX_EXTENSION_ID,
      ...all.filter((id) => !CHROMIUM_ID.test(id) && FIREFOX_ID.test(id)),
    ]),
    chromium: unique([...CHROMIUM_EXTENSION_IDS, ...all.filter((id) => CHROMIUM_ID.test(id))]),
  };
}

/** The file a browser registration starts: the program, or the development launcher. */
export function commandPath(platform: HostPlatform, development: boolean): string {
  return development ? platform.development.launcherPath : platform.programPath;
}

export interface InstallPlan {
  /** Directories to create; the mode is ignored on Windows. */
  readonly directories: readonly { readonly path: string; readonly mode?: number }[];
  /** Where the running program (or the development script) is copied. */
  readonly program: { readonly path: string; readonly mode: number };
  readonly files: readonly { readonly path: string; readonly content: string; readonly mode: number }[];
  /** Per-user registry keys whose default value points at the manifest (Windows). */
  readonly registry: readonly { readonly key: string; readonly value: string }[];
  readonly browsers: readonly HostBrowser[];
  /** Chromium browsers stay unregistered until an extension ID is known (store IDs or --extension-id). */
  readonly skipped: readonly HostBrowser[];
}

/** What installing writes. Applying it is left to the caller. */
export function planInstall(
  platform: HostPlatform,
  options: {
    readonly extensionIds: ExtensionIds;
    /** Records the computer's settings; `development` also selects the Node.js launcher. */
    readonly config: HostConfig;
    /** Development only: the Node.js executable that runs the script. */
    readonly node: string;
  },
): InstallPlan {
  const { development } = options.config;
  const command = commandPath(platform, development);
  const browsers = HOST_BROWSERS.filter(
    (browser) => browser === 'firefox' || options.extensionIds.chromium.length > 0,
  );
  const manifests = browsers.map((browser) => {
    const { manifest, registryKey } = platform.registration(browser);
    const content = {
      name: NATIVE_HOST_NAME,
      description: `${PRODUCT_NAME} helper app`,
      path: command,
      type: 'stdio',
      ...(browser === 'firefox'
        ? { allowed_extensions: options.extensionIds.firefox }
        : { allowed_origins: options.extensionIds.chromium.map((id) => `chrome-extension://${id}/`) }),
    };
    return { manifest, registryKey, content: `${JSON.stringify(content, null, 2)}\n` };
  });
  return {
    directories: [
      { path: platform.installDirectory, mode: 0o700 },
      ...[...new Set(manifests.map(({ manifest }) => platform.path.dirname(manifest)))]
        .filter((directory) => directory !== platform.installDirectory)
        .map((path) => ({ path })),
    ],
    program: development
      ? { path: platform.development.scriptPath, mode: 0o600 }
      : { path: platform.programPath, mode: 0o700 },
    files: [
      { path: platform.configPath, content: serializeHostConfig(options.config), mode: 0o600 },
      ...(development
        ? [{ path: command, content: platform.development.launcher(options.node), mode: 0o700 }]
        : []),
      ...manifests.map(({ manifest, content }) => ({ path: manifest, content, mode: 0o600 })),
    ],
    registry: manifests.flatMap(({ manifest, registryKey }) =>
      registryKey === null ? [] : [{ key: registryKey, value: manifest }],
    ),
    browsers,
    skipped: HOST_BROWSERS.filter((browser) => !browsers.includes(browser)),
  };
}

/** Removing the helper: every browser's registration, then the installation folder. */
export interface UninstallPlan {
  readonly registryKeys: readonly string[];
  readonly files: readonly string[];
  readonly directory: string;
}

export function planUninstall(platform: HostPlatform): UninstallPlan {
  const registrations = HOST_BROWSERS.map((browser) => platform.registration(browser));
  // Browsers stop finding the host before its manifests and program are removed.
  return {
    registryKeys: registrations.flatMap(({ registryKey }) => (registryKey === null ? [] : [registryKey])),
    files: registrations.map(({ manifest }) => manifest),
    directory: platform.installDirectory,
  };
}
