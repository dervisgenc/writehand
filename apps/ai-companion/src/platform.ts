import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { posix, win32, type PlatformPath } from 'node:path';
import { promisify } from 'node:util';
import {
  HELPER_COMMAND,
  NATIVE_HOST_NAME,
  PRODUCT_NAME,
  type HostBrowser,
  type HostOperatingSystem,
} from '@writehand/contracts';

/**
 * Everything that differs between operating systems is described here: where the helper
 * and its data live, how each browser finds the host, the development launcher, how a URL
 * is opened, where Claude Code and Node.js are usually installed, the release archive and
 * how it is unpacked, and how a running program is replaced or removed. Other modules use these values and never check the operating
 * system themselves. Paths follow the target system's rules, so each system's description
 * can be tested on any computer.
 */

type Environment = Readonly<Record<string, string | undefined>>;

/** The Claude Code program recorded at installation; the host sets it from its configuration. */
export const CLAUDE_PATH_VARIABLE = 'WRITEHAND_CLAUDE_PATH';

/**
 * Per-user registry values (Windows): the keys that point a browser at the host manifest, and the
 * value that starts the Outlook add-in server at sign-in. Only this helper's own keys and values
 * are ever written or removed.
 */
export interface Registry {
  /** The key's default value, or null when the key does not exist. */
  read(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  /** A named value of a key, or null when it does not exist. */
  readValue(key: string, name: string): Promise<string | null>;
  setValue(key: string, name: string, value: string): Promise<void>;
  removeValue(key: string, name: string): Promise<void>;
}

/** The local Outlook add-in server's place in the system (`writehand outlook`); Windows only so far. */
export interface OutlookPlatform {
  /** The copy of the program (Node.js for a development install) that runs without a console window. */
  readonly windowlessProgramPath: string;
  /** The server's certificate, key and state, inside the private data folder. */
  readonly directory: string;
  /** The manifest the user adds in Outlook. */
  readonly manifestPath: string;
  /** The registry value that starts the server at sign-in. */
  readonly autostart: { readonly key: string; readonly name: string };
  /** Adds a certificate authority to the user's trusted roots; Windows asks the user to confirm. */
  trustAuthority(certificatePath: string): Command;
  /** Removes it again by its SHA-1 thumbprint; Windows asks again. */
  untrustAuthority(thumbprint: string): Command;
  /** Puts text on the clipboard: the manifest's path, for Outlook's file dialog. */
  copyToClipboard(text: string): Command;
}

/** A program started without a shell. */
export interface Command {
  readonly file: string;
  readonly args: readonly string[];
  /** The program's whole environment, when it must differ from this process's. */
  readonly env?: Readonly<Record<string, string>>;
}

export interface HostPlatform {
  /** Operating system and architecture as release archives name them. */
  readonly target: { readonly os: HostOperatingSystem; readonly arch: string };
  readonly path: PlatformPath;
  /** The installed program and the files next to it. */
  readonly installDirectory: string;
  /** The single-file program that browsers start. */
  readonly programPath: string;
  /** A development installation (`install --dev`) runs the bundled script with Node.js through a launcher. */
  readonly development: {
    readonly scriptPath: string;
    readonly launcherPath: string;
    launcher(node: string): string;
  };
  /** What the installation recorded about this computer; read when the host starts. */
  readonly configPath: string;
  /** Private storage (credentials, update check), kept on this computer only. */
  readonly dataDirectory: string;
  /** This system's file among the release files, e.g. writehand-darwin-arm64.tar.gz. */
  readonly releaseArchive: string;
  /** Unpacks a release archive with the system's own tar (Windows' bsdtar also reads zip). */
  extractArchive(archive: string, directory: string): Command;
  /** Where the browser reads the host manifest; on Windows a registry key points at the file. */
  registration(browser: HostBrowser): { readonly manifest: string; readonly registryKey: string | null };
  /** Opens a URL in the default browser. */
  urlOpener(url: string): Command;
  /** Possible Claude Code locations, in search order. */
  readonly claudeLocations: readonly string[];
  /** Possible Node.js locations on PATH; an npm-installed Claude Code runs on it. */
  readonly nodeLocations: readonly string[];
  /** Limits a newly created private directory to its owner where mode bits cannot (Windows ACL). */
  readonly restrictDirectory: ((directory: string) => Promise<void>) | null;
  readonly registry: Registry | null;
  /**
   * Windows cannot replace or delete a running program, but can rename it: a running
   * program is moved aside and the copy is removed when the helper next starts.
   */
  readonly movesRunningProgramAside: boolean;
  /**
   * Starts the removal of the installation folder once this process has exited (Windows); null
   * where it can be removed at once. The command returns after starting it and is awaited.
   */
  deferredRemoval(directory: string, pid: number): Command | null;
  readonly outlook: OutlookPlatform | null;
}

/** Absolute directories of a PATH value; relative entries would depend on the working directory. */
function searchPath(path: PlatformPath, value: string | undefined): string[] {
  return (value ?? '')
    .split(path.delimiter)
    .map((directory) => directory.replace(/^"(.*)"$/, '$1'))
    .filter((directory) => path.isAbsolute(directory));
}

const MANIFEST_DIRECTORIES: Record<'darwin' | 'linux', Record<HostBrowser, string>> = {
  darwin: {
    firefox: 'Library/Application Support/Mozilla/NativeMessagingHosts',
    chrome: 'Library/Application Support/Google/Chrome/NativeMessagingHosts',
    edge: 'Library/Application Support/Microsoft Edge/NativeMessagingHosts',
    brave: 'Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts',
  },
  linux: {
    firefox: '.mozilla/native-messaging-hosts',
    chrome: '.config/google-chrome/NativeMessagingHosts',
    edge: '.config/microsoft-edge/NativeMessagingHosts',
    brave: '.config/BraveSoftware/Brave-Browser/NativeMessagingHosts',
  },
};

function unixPlatform(os: 'darwin' | 'linux', arch: string, env: Environment, home: string): HostPlatform {
  const path = posix;
  const installDirectory = path.join(home, '.local', 'share', HELPER_COMMAND);
  const scriptPath = path.join(installDirectory, 'cli.mjs');
  const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
  return {
    target: { os, arch },
    path,
    installDirectory,
    programPath: path.join(installDirectory, HELPER_COMMAND),
    development: {
      scriptPath,
      launcherPath: path.join(installDirectory, HELPER_COMMAND),
      launcher: (node) => `#!/bin/sh\nexec ${quote(node)} ${quote(scriptPath)} "$@"\n`,
    },
    configPath: path.join(installDirectory, 'config.json'),
    dataDirectory: path.join(home, '.config', HELPER_COMMAND),
    releaseArchive: `${HELPER_COMMAND}-${os}-${arch}.tar.gz`,
    // macOS keeps tar in /usr/bin; Linux distributions differ, and the host's PATH has both.
    extractArchive: (archive, directory) => ({
      file: os === 'darwin' ? '/usr/bin/tar' : 'tar',
      args: ['-xzf', archive, '-C', directory],
    }),
    registration: (browser) => ({
      manifest: path.join(home, MANIFEST_DIRECTORIES[os][browser], `${NATIVE_HOST_NAME}.json`),
      registryKey: null,
    }),
    urlOpener: (url) => ({ file: os === 'darwin' ? '/usr/bin/open' : 'xdg-open', args: [url] }),
    claudeLocations: [
      env[CLAUDE_PATH_VARIABLE],
      ...searchPath(path, env.PATH).map((directory) => path.join(directory, 'claude')),
      path.join(home, '.local', 'bin', 'claude'),
      path.join(home, '.claude', 'local', 'claude'),
      '/opt/homebrew/bin/claude',
      '/usr/local/bin/claude',
    ].filter((location): location is string => !!location && path.isAbsolute(location)),
    nodeLocations: searchPath(path, env.PATH).map((directory) => path.join(directory, 'node')),
    restrictDirectory: null,
    registry: null,
    movesRunningProgramAside: false,
    deferredRemoval: () => null,
    outlook: null,
  };
}

/** Per-user registry locations (under HKCU\Software) that each browser reads. */
const REGISTRY_LOCATIONS: Record<HostBrowser, string> = {
  firefox: 'Mozilla',
  chrome: 'Google\\Chrome',
  edge: 'Microsoft\\Edge',
  // Brave is built with Chromium branding and reads Chromium's key before Chrome's.
  brave: 'Chromium',
};

/** A value inside double quotes in a batch file. `%` is doubled; quotes and line breaks cannot be expressed. */
function batchValue(value: string): string {
  if (/["\r\n]/.test(value)) throw new Error(`This path cannot be written to the launcher: ${value}`);
  return value.replaceAll('%', '%%');
}

const run = promisify(execFile);

/**
 * The environment for Windows PowerShell 5.1. Started from PowerShell 7, it would inherit a
 * PSModulePath that lists PowerShell 7's modules first and then fail to load its own (Get-Acl,
 * Remove-Item); without the variable it uses its default module path.
 */
export function windowsPowerShellEnvironment(
  env: Environment,
  additions: Readonly<Record<string, string>> = {},
): Record<string, string> {
  const inherited = Object.entries(env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[0].toUpperCase() !== 'PSMODULEPATH',
  );
  return { ...Object.fromEntries(inherited), ...additions };
}

/** The default value in `reg query <key> /ve` output: "    (Default)    REG_SZ    <value>". */
export function registryDefaultValue(output: string): string | null {
  // The "(Default)" label is localized; the type name is not.
  return /\sREG_SZ\s+(.+?)\s*$/m.exec(output)?.[1] ?? null;
}

/** The per-user key whose values Windows starts at sign-in. */
export const WINDOWS_RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
/** The helper's one value there. */
export const OUTLOOK_AUTOSTART_VALUE = `${PRODUCT_NAME} Outlook`;

function windowsPlatform(arch: string, env: Environment, home: string): HostPlatform {
  const path = win32;
  // Names are case-insensitive on Windows; a copied environment keeps spellings such as "Path".
  const variable = (name: string) => Object.entries(env).find(([key]) => key.toUpperCase() === name)?.[1];
  const location = (name: string) => {
    const value = variable(name);
    return value && path.isAbsolute(value) ? value : undefined;
  };
  // Not the roaming AppData: credentials and programs must stay on this computer.
  const localAppData = location('LOCALAPPDATA') ?? path.join(home, 'AppData', 'Local');
  const appData = location('APPDATA') ?? path.join(home, 'AppData', 'Roaming');
  // Windows' own tools by absolute path, so that nothing on PATH can stand in for them.
  const system32 = (tool: string) => path.join(location('SYSTEMROOT') ?? 'C:\\Windows', 'System32', tool);
  const installDirectory = path.join(localAppData, 'Programs', HELPER_COMMAND);
  const scriptPath = path.join(installDirectory, 'cli.mjs');
  const ownKey = (key: string) => {
    // Only this helper's own per-user keys are ever written or removed.
    if (!key.startsWith('HKCU\\Software\\') || !key.endsWith(`\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`))
      throw new Error(`Not a registry key of this helper: ${key}`);
    return key;
  };
  // Named values only in Windows' sign-in key, and only the helper's own one.
  const ownValue = (key: string, name: string) => {
    if (key !== WINDOWS_RUN_KEY || name !== OUTLOOK_AUTOSTART_VALUE)
      throw new Error(`Not a registry value of this helper: ${key}\\${name}`);
    return [key, '/v', name];
  };
  const hidden = { windowsHide: true };
  return {
    target: { os: 'windows', arch },
    path,
    installDirectory,
    programPath: path.join(installDirectory, `${HELPER_COMMAND}.exe`),
    development: {
      scriptPath,
      launcherPath: path.join(installDirectory, `${HELPER_COMMAND}.cmd`),
      launcher: (node) =>
        [
          '@echo off',
          // cmd.exe reads batch files in the console code page; UTF-8 keeps non-ASCII folder names intact.
          'chcp 65001 >nul',
          'setlocal DisableDelayedExpansion',
          `"${batchValue(node)}" "${batchValue(scriptPath)}" %*`,
          '',
        ].join('\r\n'),
    },
    configPath: path.join(installDirectory, 'config.json'),
    dataDirectory: path.join(localAppData, HELPER_COMMAND),
    // Windows on Arm runs the x64 program through its built-in emulation.
    releaseArchive: `${HELPER_COMMAND}-windows-x64.zip`,
    extractArchive: (archive, directory) => ({
      file: system32('tar.exe'),
      args: ['-xf', archive, '-C', directory],
    }),
    registration: (browser) => ({
      manifest: path.join(installDirectory, `${NATIVE_HOST_NAME}.${browser}.json`),
      registryKey: `HKCU\\Software\\${REGISTRY_LOCATIONS[browser]}\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`,
    }),
    // ShellExecute through rundll32 receives the URL as one argument: no shell, so "&" stays intact.
    urlOpener: (url) => ({ file: system32('rundll32.exe'), args: ['url.dll,FileProtocolHandler', url] }),
    claudeLocations: [
      location(CLAUDE_PATH_VARIABLE),
      // Only a program can be started without a shell; npm's claude.cmd is resolved to the program it starts.
      ...searchPath(path, variable('PATH')).flatMap((directory) => [
        path.join(directory, 'claude.exe'),
        path.join(directory, 'claude.cmd'),
      ]),
      // Anthropic's native installer, WinGet and npm's default prefix.
      path.join(home, '.local', 'bin', 'claude.exe'),
      path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'claude.exe'),
      path.join(appData, 'npm', 'claude.cmd'),
    ].filter((location): location is string => location !== undefined),
    nodeLocations: searchPath(path, variable('PATH')).map((directory) => path.join(directory, 'node.exe')),
    restrictDirectory: async (directory) => {
      const { stdout } = await run(system32('whoami.exe'), ['/user', '/fo', 'csv', '/nh'], hidden);
      const user = /"(S-1-[\d-]+)"/.exec(stdout)?.[1];
      if (user === undefined) throw new Error('The current Windows user could not be identified.');
      // Only this user and the operating system; nothing is inherited from the profile folder.
      await run(
        system32('icacls.exe'),
        [directory, '/inheritance:r', '/grant:r', `*${user}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F'],
        hidden,
      );
    },
    registry: {
      async read(key) {
        const output = await run(system32('reg.exe'), ['query', ownKey(key), '/ve'], hidden).then(
          ({ stdout }) => stdout,
          () => '',
        );
        return registryDefaultValue(output);
      },
      async set(key, value) {
        await run(
          system32('reg.exe'),
          ['add', ownKey(key), '/ve', '/t', 'REG_SZ', '/d', value, '/f'],
          hidden,
        );
      },
      async remove(key) {
        // `reg delete` fails for a missing key; a missing registration is already removed.
        const exists = await run(system32('reg.exe'), ['query', ownKey(key)], hidden).then(
          () => true,
          () => false,
        );
        if (exists) await run(system32('reg.exe'), ['delete', key, '/f'], hidden);
      },
      async readValue(key, name) {
        const output = await run(system32('reg.exe'), ['query', ...ownValue(key, name)], hidden).then(
          ({ stdout }) => stdout,
          () => '',
        );
        return registryDefaultValue(output);
      },
      async setValue(key, name, value) {
        await run(
          system32('reg.exe'),
          ['add', ...ownValue(key, name), '/t', 'REG_SZ', '/d', value, '/f'],
          hidden,
        );
      },
      async removeValue(key, name) {
        const exists = await run(system32('reg.exe'), ['query', ...ownValue(key, name)], hidden).then(
          () => true,
          () => false,
        );
        if (exists) await run(system32('reg.exe'), ['delete', key, '/v', name, '/f'], hidden);
      },
    },
    movesRunningProgramAside: true,
    outlook: {
      windowlessProgramPath: path.join(installDirectory, `${HELPER_COMMAND}-outlook.exe`),
      directory: path.join(localAppData, HELPER_COMMAND, 'outlook'),
      manifestPath: path.join(installDirectory, 'outlook-manifest.xml'),
      autostart: { key: WINDOWS_RUN_KEY, name: OUTLOOK_AUTOSTART_VALUE },
      // certutil adds to and removes from the current user's Root store; Windows shows its own
      // security prompt for each, which the user must confirm.
      trustAuthority: (certificatePath) => ({
        file: system32('certutil.exe'),
        args: ['-user', '-addstore', 'Root', certificatePath],
      }),
      untrustAuthority: (thumbprint) => ({
        file: system32('certutil.exe'),
        args: ['-user', '-delstore', 'Root', thumbprint],
      }),
      // clip.exe reads its input in the console code page; Set-Clipboard keeps any user name intact.
      copyToClipboard: (text) => ({
        file: system32('WindowsPowerShell\\v1.0\\powershell.exe'),
        args: ['-NoProfile', '-NonInteractive', '-Command', 'Set-Clipboard -Value $env:WRITEHAND_CLIPBOARD'],
        env: windowsPowerShellEnvironment(env, { WRITEHAND_CLIPBOARD: text }),
      }),
    },
    deferredRemoval: (directory, pid) => {
      const powershell = system32('WindowsPowerShell\\v1.0\\powershell.exe');
      // Waits for this program to exit, then removes the folder. A program that has just exited,
      // or a virus scanner checking it, can hold its file briefly.
      const removal = [
        'Wait-Process -Id $env:WRITEHAND_PID -ErrorAction SilentlyContinue',
        'for ($i = 0; $i -lt 20 -and (Test-Path -LiteralPath $env:WRITEHAND_REMOVE); $i++) { ' +
          'Remove-Item -LiteralPath $env:WRITEHAND_REMOVE -Recurse -Force -ErrorAction SilentlyContinue; ' +
          'Start-Sleep -Milliseconds 500 }',
      ].join('; ');
      return {
        file: powershell,
        // Node ends the processes it starts when it exits (a kill-on-close job object), but not
        // their children; its detached processes get no console, which PowerShell needs. So this
        // short-lived process starts the removal as its own hidden process and returns.
        args: [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Start-Process -WindowStyle Hidden -FilePath $env:WRITEHAND_POWERSHELL ' +
            "-ArgumentList '-NoProfile','-NonInteractive','-EncodedCommand',$env:WRITEHAND_REMOVAL",
        ],
        // Paths, the pid and the script travel in the environment, never parsed as a command line.
        env: windowsPowerShellEnvironment(env, {
          WRITEHAND_PID: String(pid),
          WRITEHAND_REMOVE: directory,
          WRITEHAND_POWERSHELL: powershell,
          WRITEHAND_REMOVAL: Buffer.from(removal, 'utf16le').toString('base64'),
        }),
      };
    },
  };
}

export function hostPlatform(
  os: NodeJS.Platform = process.platform,
  env: Environment = process.env,
  home: string = homedir(),
  arch: string = process.arch,
): HostPlatform {
  if (os === 'win32') return windowsPlatform(arch, env, home);
  // Other Unix-like systems follow the Linux (XDG) conventions.
  return unixPlatform(os === 'darwin' ? 'darwin' : 'linux', arch, env, home);
}
