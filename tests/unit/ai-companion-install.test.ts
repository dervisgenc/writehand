import { spawnSync } from 'node:child_process';
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FIREFOX_EXTENSION_ID } from '@writehand/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_HOST_CONFIG,
  hostEnvironment,
  parseHostConfig,
  serializeHostConfig,
} from '../../apps/ai-companion/src/host-config';
import { install, uninstall } from '../../apps/ai-companion/src/install';
import {
  allowedExtensions,
  parseCommand,
  planInstall,
  planUninstall,
  type InstallPlan,
} from '../../apps/ai-companion/src/install-plan';
import { hostPlatform } from '../../apps/ai-companion/src/platform';

const CHROMIUM_ID = 'abcdefghijklmnopabcdefghijklmnop';
const ids = { firefox: [FIREFOX_EXTENSION_ID], chromium: [CHROMIUM_ID] };
const config = {
  ...DEFAULT_HOST_CONFIG,
  claudePath: '/Users/ada/.local/bin/claude',
  claudeConfigDir: '/Users/ada/.claude-work',
  nodeDirectory: '/opt/node/bin',
};
const manifestOf = (plan: InstallPlan, path: string) =>
  JSON.parse(plan.files.find((file) => file.path === path)!.content) as Record<string, unknown>;

const WINDOWS_HOME = 'C:\\Users\\Ada';
const windowsEnv = {
  LOCALAPPDATA: 'C:\\Users\\Ada\\AppData\\Local',
  APPDATA: 'C:\\Users\\Ada\\AppData\\Roaming',
  SystemRoot: 'C:\\Windows',
  // A copied Windows environment keeps this spelling; entries may be quoted or relative.
  Path: 'C:\\Windows\\system32;"C:\\Program Files\\Tools";.\\bin;;C:\\Users\\Ada\\AppData\\Roaming\\npm',
};
const windows = () => hostPlatform('win32', windowsEnv, WINDOWS_HOME);

describe('Installation plan', () => {
  it('macOS: the program, its configuration and a manifest in every browser’s folder', () => {
    const platform = hostPlatform('darwin', {}, '/Users/ada', 'arm64');
    const plan = planInstall(platform, { extensionIds: ids, config, node: '' });
    const chrome = '/Users/ada/Library/Application Support/Google/Chrome/NativeMessagingHosts';
    expect(platform.target).toEqual({ os: 'darwin', arch: 'arm64' });
    expect(plan.directories).toContainEqual({ path: '/Users/ada/.local/share/writehand', mode: 0o700 });
    expect(plan.directories).toContainEqual({ path: chrome });
    expect(plan.program).toEqual({ path: '/Users/ada/.local/share/writehand/writehand', mode: 0o700 });
    expect(plan.files[0]).toEqual({
      path: '/Users/ada/.local/share/writehand/config.json',
      content: serializeHostConfig(config),
      mode: 0o600,
    });
    // The browser starts the program itself; there is no launcher script.
    expect(manifestOf(plan, `${chrome}/com.dervisgenc.writehand.json`)).toEqual({
      name: 'com.dervisgenc.writehand',
      description: 'Writehand helper app',
      path: '/Users/ada/.local/share/writehand/writehand',
      type: 'stdio',
      allowed_origins: [`chrome-extension://${CHROMIUM_ID}/`],
    });
    expect(plan.browsers).toEqual(['firefox', 'chrome', 'edge', 'brave']);
    expect(plan.registry).toEqual([]);
  });

  it.each([
    ['darwin', 'firefox', '/h/Library/Application Support/Mozilla/NativeMessagingHosts'],
    ['darwin', 'edge', '/h/Library/Application Support/Microsoft Edge/NativeMessagingHosts'],
    ['darwin', 'brave', '/h/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts'],
    ['linux', 'firefox', '/h/.mozilla/native-messaging-hosts'],
    ['linux', 'chrome', '/h/.config/google-chrome/NativeMessagingHosts'],
    ['linux', 'edge', '/h/.config/microsoft-edge/NativeMessagingHosts'],
    ['linux', 'brave', '/h/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts'],
  ] as const)('%s: %s reads its manifest from %s', (os, browser, directory) => {
    const platform = hostPlatform(os, {}, '/h');
    expect(platform.registration(browser)).toEqual({
      manifest: `${directory}/com.dervisgenc.writehand.json`,
      registryKey: null,
    });
    expect(platform.dataDirectory).toBe('/h/.config/writehand');
  });

  it('Windows keeps the program and data in the local (non-roaming) profile', () => {
    const platform = windows();
    expect(platform.target.os).toBe('windows');
    expect(platform.programPath).toBe('C:\\Users\\Ada\\AppData\\Local\\Programs\\writehand\\writehand.exe');
    expect(platform.configPath).toBe('C:\\Users\\Ada\\AppData\\Local\\Programs\\writehand\\config.json');
    expect(platform.dataDirectory).toBe('C:\\Users\\Ada\\AppData\\Local\\writehand');
    // Without the variable, the profile's default location is used.
    expect(hostPlatform('win32', {}, WINDOWS_HOME).dataDirectory).toBe(
      'C:\\Users\\Ada\\AppData\\Local\\writehand',
    );
  });

  it.each([
    ['chrome', 'Google\\Chrome'],
    ['edge', 'Microsoft\\Edge'],
    // Brave reads Chromium's key before Chrome's (checked with Brave 1.97 on Windows 11).
    ['brave', 'Chromium'],
    ['firefox', 'Mozilla'],
  ] as const)('Windows: %s finds the host through HKCU\\Software\\%s', (browser, location) => {
    expect(windows().registration(browser)).toEqual({
      manifest: `C:\\Users\\Ada\\AppData\\Local\\Programs\\writehand\\com.dervisgenc.writehand.${browser}.json`,
      registryKey: `HKCU\\Software\\${location}\\NativeMessagingHosts\\com.dervisgenc.writehand`,
    });
  });

  it('Windows registers per-browser manifests that start writehand.exe', () => {
    const platform = windows();
    const plan = planInstall(platform, { extensionIds: ids, config, node: '' });
    const manifest =
      'C:\\Users\\Ada\\AppData\\Local\\Programs\\writehand\\com.dervisgenc.writehand.chrome.json';
    expect(plan.registry).toContainEqual({
      key: 'HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.dervisgenc.writehand',
      value: manifest,
    });
    expect(plan.registry).toHaveLength(4);
    expect(manifestOf(plan, manifest)).toMatchObject({ path: platform.programPath, type: 'stdio' });
    // Manifests live in the install folder itself; no other folder is created.
    expect(plan.directories).toEqual([{ path: platform.installDirectory, mode: 0o700 }]);
  });

  it('a development install copies the script and starts it with Node.js through a launcher', () => {
    const development = { ...config, development: true };
    const unix = hostPlatform('linux', {}, "/home/it's");
    const plan = planInstall(unix, { extensionIds: ids, config: development, node: '/opt/node/bin/node' });
    expect(plan.program).toEqual({ path: "/home/it's/.local/share/writehand/cli.mjs", mode: 0o600 });
    expect(plan.files).toContainEqual({
      path: "/home/it's/.local/share/writehand/writehand",
      content: `#!/bin/sh\nexec '/opt/node/bin/node' '/home/it'\\''s/.local/share/writehand/cli.mjs' "$@"\n`,
      mode: 0o700,
    });

    const platform = hostPlatform(
      'win32',
      { ...windowsEnv, LOCALAPPDATA: 'C:\\Users\\Ada 100%' },
      WINDOWS_HOME,
    );
    const windowsPlan = planInstall(platform, {
      extensionIds: ids,
      config: development,
      node: 'C:\\Program Files\\nodejs\\node.exe',
    });
    expect(manifestOf(windowsPlan, platform.registration('edge').manifest)).toMatchObject({
      path: 'C:\\Users\\Ada 100%\\Programs\\writehand\\writehand.cmd',
    });
    expect(windowsPlan.files).toContainEqual({
      path: 'C:\\Users\\Ada 100%\\Programs\\writehand\\writehand.cmd',
      content: [
        '@echo off',
        'chcp 65001 >nul',
        'setlocal DisableDelayedExpansion',
        '"C:\\Program Files\\nodejs\\node.exe" "C:\\Users\\Ada 100%%\\Programs\\writehand\\cli.mjs" %*',
        '',
      ].join('\r\n'),
      mode: 0o700,
    });
    expect(() =>
      planInstall(platform, { extensionIds: ids, config: development, node: 'C:\\"quoted"\\node.exe' }),
    ).toThrow('cannot be written to the launcher');
  });

  it('registers Chromium browsers only once an extension ID is known', () => {
    const plan = planInstall(hostPlatform('linux', {}, '/h'), {
      extensionIds: { firefox: [FIREFOX_EXTENSION_ID], chromium: [] },
      config,
      node: '',
    });
    expect(plan.browsers).toEqual(['firefox']);
    expect(plan.skipped).toEqual(['chrome', 'edge', 'brave']);
    expect(
      manifestOf(plan, '/h/.mozilla/native-messaging-hosts/com.dervisgenc.writehand.json'),
    ).toMatchObject({
      allowed_extensions: [FIREFOX_EXTENSION_ID],
    });
  });

  it('allows the built-in IDs, the given ones and those registered before', () => {
    const other = 'ponmlkjihgfedcbaponmlkjihgfedcba';
    expect(allowedExtensions([], [])).toEqual({ firefox: [FIREFOX_EXTENSION_ID], chromium: [] });
    expect(
      allowedExtensions(
        [CHROMIUM_ID, 'dev@example.test'],
        [
          { path: '/p', allowed: [`chrome-extension://${other}/`, `chrome-extension://${CHROMIUM_ID}/`] },
          { path: '/p', allowed: [FIREFOX_EXTENSION_ID] },
        ],
      ),
    ).toEqual({ firefox: [FIREFOX_EXTENSION_ID, 'dev@example.test'], chromium: [CHROMIUM_ID, other] });
    expect(() => allowedExtensions(['not an id'], [])).toThrow('Not an extension ID');
    expect(() => allowedExtensions(['ABCDEFGHIJKLMNOPABCDEFGHIJKLMNOP'], [])).toThrow('Not an extension ID');
  });

  it('uninstalling removes every browser’s registration and the install folder', () => {
    expect(planUninstall(hostPlatform('linux', {}, '/h'))).toEqual({
      registryKeys: [],
      files: [
        '/h/.mozilla/native-messaging-hosts/com.dervisgenc.writehand.json',
        '/h/.config/google-chrome/NativeMessagingHosts/com.dervisgenc.writehand.json',
        '/h/.config/microsoft-edge/NativeMessagingHosts/com.dervisgenc.writehand.json',
        '/h/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.dervisgenc.writehand.json',
      ],
      directory: '/h/.local/share/writehand',
    });
    const plan = planUninstall(windows());
    expect(plan.registryKeys).toContain(
      'HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\com.dervisgenc.writehand',
    );
    expect(plan.directory).toBe('C:\\Users\\Ada\\AppData\\Local\\Programs\\writehand');
  });

  it('never writes registry keys other than its own per-user registration', async () => {
    const registry = windows().registry!;
    await expect(
      registry.set('HKLM\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.dervisgenc.writehand', 'x'),
    ).rejects.toThrow('Not a registry key of this helper');
    await expect(
      registry.remove('HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\other.host'),
    ).rejects.toThrow('Not a registry key of this helper');
  });

  it('writes only its own value in the sign-in key, for the Outlook add-in server', async () => {
    const registry = windows().registry!;
    const run = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
    await expect(registry.setValue(run, 'OneDrive', 'x')).rejects.toThrow(
      'Not a registry value of this helper',
    );
    await expect(registry.removeValue(run, 'OneDrive')).rejects.toThrow(
      'Not a registry value of this helper',
    );
    await expect(
      registry.setValue(
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce',
        'Writehand Outlook',
        'x',
      ),
    ).rejects.toThrow('Not a registry value of this helper');
    expect(windows().outlook).toEqual({
      windowlessProgramPath: 'C:\\Users\\Ada\\AppData\\Local\\Programs\\writehand\\writehand-outlook.exe',
      directory: 'C:\\Users\\Ada\\AppData\\Local\\writehand\\outlook',
      manifestPath: 'C:\\Users\\Ada\\AppData\\Local\\Programs\\writehand\\outlook-manifest.xml',
      autostart: { key: run, name: 'Writehand Outlook' },
      trustAuthority: expect.any(Function),
      untrustAuthority: expect.any(Function),
    });
    expect(windows().outlook!.trustAuthority('C:\\ca.crt')).toEqual({
      file: 'C:\\Windows\\System32\\certutil.exe',
      args: ['-user', '-addstore', 'Root', 'C:\\ca.crt'],
    });
    expect(windows().outlook!.untrustAuthority('AB12')).toEqual({
      file: 'C:\\Windows\\System32\\certutil.exe',
      args: ['-user', '-delstore', 'Root', 'AB12'],
    });
    expect(hostPlatform('linux', {}, '/home/ada').outlook).toBe(null);
  });
});

describe('Command line', () => {
  it('runs as the native host with the arguments browsers pass', () => {
    expect(parseCommand(['chrome-extension://abc/', '--parent-window=0'], false)).toEqual({ kind: 'host' });
    expect(parseCommand(['/h/.mozilla/x.json', FIREFOX_EXTENSION_ID], false)).toEqual({ kind: 'host' });
    expect(parseCommand([], false)).toEqual({ kind: 'host' });
  });

  it('in a terminal shows help instead of waiting for browser messages', () => {
    expect(parseCommand([], true)).toEqual({ kind: 'help' });
    expect(() => parseCommand(['instal'], true)).toThrow('Unknown command: instal');
  });

  it('reads the commands and their options', () => {
    expect(
      parseCommand(['install', `--extension-id=${CHROMIUM_ID}`, '--dev', '--extension-id=x@y'], true),
    ).toEqual({ kind: 'install', extensionIds: [CHROMIUM_ID, 'x@y'], development: true });
    expect(parseCommand(['uninstall', '--delete-data'], true)).toEqual({
      kind: 'uninstall',
      deleteData: true,
    });
    expect(parseCommand(['status'], false)).toEqual({ kind: 'status' });
    expect(parseCommand(['update', '--check'], true)).toEqual({ kind: 'update', checkOnly: true });
    expect(parseCommand(['update'], true)).toEqual({ kind: 'update', checkOnly: false });
    expect(parseCommand(['--version'], true)).toEqual({ kind: 'version' });
    expect(() => parseCommand(['uninstall', '--dev'], true)).toThrow('Unknown option for uninstall: --dev');
    expect(() => parseCommand(['status', `--extension-id=${CHROMIUM_ID}`], true)).toThrow('Unknown option');
  });
});

describe('Recorded configuration', () => {
  it('falls back to defaults for a missing or damaged file and ignores unknown fields', () => {
    expect(parseHostConfig(null)).toEqual(DEFAULT_HOST_CONFIG);
    expect(parseHostConfig('{')).toEqual(DEFAULT_HOST_CONFIG);
    expect(parseHostConfig('{"claudePath": 3}')).toEqual(DEFAULT_HOST_CONFIG);
    expect(parseHostConfig('{"development": true, "fromNewerVersion": 1}')).toEqual({
      ...DEFAULT_HOST_CONFIG,
      development: true,
    });
    expect(parseHostConfig(serializeHostConfig(config))).toEqual(config);
  });

  it('gives the host the Claude Code location, configuration, Node.js folder and user name', () => {
    expect(hostEnvironment({ PATH: '/usr/bin:/bin' }, config, { user: 'ada', delimiter: ':' })).toEqual({
      WRITEHAND_CLAUDE_PATH: '/Users/ada/.local/bin/claude',
      CLAUDE_CONFIG_DIR: '/Users/ada/.claude-work',
      PATH: '/opt/node/bin:/usr/bin:/bin',
      USER: 'ada',
    });
    // A user name the browser passed is kept; nothing recorded means nothing added.
    expect(hostEnvironment({ USER: 'ada' }, DEFAULT_HOST_CONFIG, { user: 'other', delimiter: ':' })).toEqual(
      {},
    );
  });
});

describe('Operating system integration', () => {
  it('opens the sign-in page without a shell, keeping "&" in the URL', () => {
    const url = 'https://auth.openai.com/oauth/authorize?a=1&b=2&redirect_uri=http%3A%2F%2F127.0.0.1%3A1%2F';
    expect(windows().urlOpener(url)).toEqual({
      file: 'C:\\Windows\\System32\\rundll32.exe',
      args: ['url.dll,FileProtocolHandler', url],
    });
    expect(hostPlatform('darwin', {}, '/h').urlOpener(url)).toEqual({ file: '/usr/bin/open', args: [url] });
    expect(hostPlatform('linux', {}, '/h').urlOpener(url)).toEqual({ file: 'xdg-open', args: [url] });
  });

  it('looks for Claude Code and Node.js where each system installs them', () => {
    expect(windows().claudeLocations).toEqual([
      'C:\\Windows\\system32\\claude.exe',
      'C:\\Windows\\system32\\claude.cmd',
      'C:\\Program Files\\Tools\\claude.exe',
      'C:\\Program Files\\Tools\\claude.cmd',
      'C:\\Users\\Ada\\AppData\\Roaming\\npm\\claude.exe',
      'C:\\Users\\Ada\\AppData\\Roaming\\npm\\claude.cmd',
      'C:\\Users\\Ada\\.local\\bin\\claude.exe',
      'C:\\Users\\Ada\\AppData\\Local\\Microsoft\\WinGet\\Links\\claude.exe',
      'C:\\Users\\Ada\\AppData\\Roaming\\npm\\claude.cmd',
    ]);
    expect(windows().nodeLocations).toContain('C:\\Program Files\\Tools\\node.exe');
    expect(
      hostPlatform('win32', { ...windowsEnv, WRITEHAND_CLAUDE_PATH: 'D:\\claude.exe' }, WINDOWS_HOME)
        .claudeLocations[0],
    ).toBe('D:\\claude.exe');
    const mac = hostPlatform(
      'darwin',
      { WRITEHAND_CLAUDE_PATH: '/x/claude', PATH: 'bin:/usr/local/bin' },
      '/Users/ada',
    );
    expect(mac.claudeLocations).toEqual([
      '/x/claude',
      '/usr/local/bin/claude',
      '/Users/ada/.local/bin/claude',
      '/Users/ada/.claude/local/claude',
      '/opt/homebrew/bin/claude',
      '/usr/local/bin/claude',
    ]);
    expect(mac.nodeLocations).toEqual(['/usr/local/bin/node']);
  });

  it('Windows removes a running program after it exits; the folder is passed as data, not as a command', () => {
    // Started from PowerShell 7, Windows PowerShell must not inherit its module path.
    const fromPwsh = hostPlatform(
      'win32',
      { ...windowsEnv, PSModulePath: 'C:\\pwsh\\Modules' },
      WINDOWS_HOME,
    );
    const removal = fromPwsh.deferredRemoval('C:\\Users\\A & B\\writehand', 42);
    expect(removal).toMatchObject({
      file: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      env: { WRITEHAND_PID: '42', WRITEHAND_REMOVE: 'C:\\Users\\A & B\\writehand' },
    });
    expect(removal!.args.join(' ')).not.toContain('A & B');
    expect(removal!.env).toMatchObject({ LOCALAPPDATA: windowsEnv.LOCALAPPDATA });
    expect(Object.keys(removal!.env!).map((key) => key.toUpperCase())).not.toContain('PSMODULEPATH');
    // The removal itself runs as a separate hidden process, from a script passed as data.
    expect(removal!.args.join(' ')).toContain('Start-Process -WindowStyle Hidden');
    const script = Buffer.from(removal!.env!.WRITEHAND_REMOVAL!, 'base64').toString('utf16le');
    expect(script).toContain('Wait-Process -Id $env:WRITEHAND_PID');
    expect(script).toContain('Remove-Item -LiteralPath $env:WRITEHAND_REMOVE -Recurse -Force');
    expect(hostPlatform('linux', {}, '/h').deferredRemoval('/h/x', 42)).toBe(null);
  });
});

/** A stand-in script that reports the arguments the launcher gave it. */
const REPORTING_SCRIPT = 'process.stdout.write(JSON.stringify(process.argv.slice(2)));\n';

describe('On this computer', () => {
  const temporary: string[] = [];
  afterEach(async () => {
    vi.restoreAllMocks();
    for (const directory of temporary.splice(0)) await rm(directory, { recursive: true, force: true });
  });
  const exists = (path: string) =>
    access(path).then(
      () => true,
      () => false,
    );
  const writePlan = async (plan: InstallPlan, script: string) => {
    for (const directory of plan.directories) await mkdir(directory.path, { recursive: true });
    await writeFile(plan.program.path, script);
    for (const file of plan.files) {
      await writeFile(file.path, file.content);
      await chmod(file.path, file.mode);
    }
  };

  it.runIf(process.platform === 'win32')(
    'the development launcher starts the way Chrome and Firefox start it, from a folder with non-ASCII characters, spaces, & and %',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'writehand-launcher-'));
      temporary.push(root);
      const platform = hostPlatform(
        'win32',
        { ...process.env, LOCALAPPDATA: join(root, 'Derviş & 100% Ünal') },
        root,
      );
      const plan = planInstall(platform, {
        extensionIds: ids,
        config: { ...DEFAULT_HOST_CONFIG, development: true },
        node: process.execPath,
      });
      await writePlan(plan, REPORTING_SCRIPT);
      const launcher = platform.development.launcherPath;
      const origin = `chrome-extension://${CHROMIUM_ID}/`;
      const manifest = platform.registration('firefox').manifest;
      const commandLines = [
        // Chrome: %ComSpec% /d /s /c ""<host path>" <origin> --parent-window=0" (< and > pipes omitted).
        `/d /s /c ""${launcher}" ${origin} --parent-window=0"`,
        // Firefox quotes arguments that contain whitespace and runs cmd.exe /s/c "<arguments>".
        `/s/c ""${launcher}" "${manifest}" ${FIREFOX_EXTENSION_ID}"`,
      ];
      const results = commandLines.map((line) =>
        spawnSync(process.env.ComSpec ?? 'cmd.exe', [line], {
          windowsVerbatimArguments: true,
          windowsHide: true,
          encoding: 'utf8',
        }),
      );
      expect(results.map((result) => JSON.parse(result.stdout))).toEqual([
        [origin, '--parent-window=0'],
        [manifest, FIREFOX_EXTENSION_ID],
      ]);
    },
  );

  it.skipIf(process.platform === 'win32')(
    'the development launcher starts the script with the browser’s arguments',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'writehand-launcher-'));
      temporary.push(root);
      const platform = hostPlatform(process.platform, {}, join(root, "Ada's home"));
      const plan = planInstall(platform, {
        extensionIds: ids,
        config: { ...DEFAULT_HOST_CONFIG, development: true },
        node: process.execPath,
      });
      await writePlan(plan, REPORTING_SCRIPT);
      const result = spawnSync(platform.development.launcherPath, ['origin', 'two words'], {
        encoding: 'utf8',
        env: { PATH: '/usr/bin:/bin' },
      });
      expect(JSON.parse(result.stdout)).toEqual(['origin', 'two words']);
    },
  );

  it.skipIf(process.platform === 'win32')(
    'installs, keeps the extensions it allowed when installed again, and uninstalls completely',
    async () => {
      vi.spyOn(process.stdout, 'write').mockReturnValue(true);
      const root = await mkdtemp(join(tmpdir(), 'writehand-install-'));
      temporary.push(root);
      const script = join(root, 'cli.mjs');
      await writeFile(script, REPORTING_SCRIPT);
      const platform = hostPlatform(process.platform, { PATH: '' }, join(root, 'home'));
      const source = { script, node: process.execPath };
      await install(platform, { extensionIds: [CHROMIUM_ID], development: true, source, addin: new Map() });
      await install(platform, { extensionIds: [], development: true, source, addin: new Map() });

      const chrome = JSON.parse(await readFile(platform.registration('chrome').manifest, 'utf8'));
      expect(chrome).toMatchObject({
        path: platform.development.launcherPath,
        allowed_origins: [`chrome-extension://${CHROMIUM_ID}/`],
      });
      expect(parseHostConfig(await readFile(platform.configPath, 'utf8')).development).toBe(true);
      await expect(
        install(platform, { extensionIds: [], development: false, source, addin: new Map() }),
      ).rejects.toThrow('--dev');

      await uninstall(platform, { deleteData: false, runningProgram: null });
      expect(await exists(platform.installDirectory)).toBe(false);
      for (const browser of ['firefox', 'chrome', 'edge', 'brave'] as const)
        expect(await exists(platform.registration(browser).manifest)).toBe(false);
    },
  );
});
