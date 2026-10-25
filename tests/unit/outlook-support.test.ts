import { X509Certificate } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_HOST_CONFIG,
  parseHostConfig,
  type HostConfig,
} from '../../apps/ai-companion/src/host-config';
import {
  addinFiles,
  bridgeToken,
  commandLine,
  disableOutlook,
  enableOutlook,
  outlookStatus,
  refreshOutlook,
  serveCommand,
  type OutlookContext,
  type OutlookIo,
} from '../../apps/ai-companion/src/outlook';
import {
  hostPlatform,
  OUTLOOK_AUTOSTART_VALUE,
  WINDOWS_RUN_KEY,
  type HostPlatform,
  type Registry,
} from '../../apps/ai-companion/src/platform';
import {
  markWindowless,
  subsystemOffset,
  writeWindowlessCopy,
} from '../../apps/ai-companion/src/windowless-program';

/** The first bytes of a 64-bit Windows console program: MZ header, PE signature, optional header. */
function fakeProgram(subsystem = 3): Buffer {
  const image = Buffer.alloc(1024);
  image.write('MZ', 0, 'latin1');
  image.writeUInt32LE(0x80, 0x3c);
  image.write('PE\0\0', 0x80, 'latin1');
  image.writeUInt16LE(0x20b, 0x80 + 24);
  image.writeUInt16LE(subsystem, 0x80 + 24 + 68);
  image.write('rest of the program', 600, 'latin1');
  return image;
}

const temporary: string[] = [];
afterEach(async () => {
  for (const directory of temporary.splice(0)) await rm(directory, { recursive: true, force: true });
});

async function setup(changes: Partial<HostConfig> = {}) {
  const home = await mkdtemp(join(tmpdir(), 'writehand-outlook-'));
  temporary.push(home);
  // The paths of this computer's file system; the Windows parts (registry, certutil) are fakes.
  const base = hostPlatform(
    process.platform === 'win32' ? 'win32' : 'linux',
    { LOCALAPPDATA: join(home, 'Local') },
    home,
  );
  const values = new Map<string, string>();
  const registry: Registry = {
    read: async () => null,
    set: async () => undefined,
    remove: async () => undefined,
    readValue: async (key, name) => values.get(`${key}\\${name}`) ?? null,
    setValue: async (key, name, value) => void values.set(`${key}\\${name}`, value),
    removeValue: async (key, name) => void values.delete(`${key}\\${name}`),
  };
  const platform: HostPlatform = {
    ...base,
    restrictDirectory: null,
    registry,
    outlook: {
      windowlessProgramPath: join(base.installDirectory, 'writehand-outlook.exe'),
      directory: join(base.dataDirectory, 'outlook'),
      manifestPath: join(base.installDirectory, 'outlook-manifest.xml'),
      autostart: { key: WINDOWS_RUN_KEY, name: OUTLOOK_AUTOSTART_VALUE },
      trustAuthority: (path) => ({ file: 'certutil', args: ['-addstore', path] }),
      untrustAuthority: (thumbprint) => ({ file: 'certutil', args: ['-delstore', thumbprint] }),
    },
  };
  await mkdir(base.installDirectory, { recursive: true });
  await writeFile(base.programPath, fakeProgram());
  const io = {
    run: vi.fn<OutlookIo['run']>(async () => 0),
    start: vi.fn<OutlookIo['start']>(),
    print: vi.fn<OutlookIo['print']>(),
    now: () => new Date('2026-10-25T12:00:00Z'),
    patience: 0.25,
  };
  const files = addinFiles([
    ['taskpane.html', Buffer.from('<html>pane</html>').toString('base64')],
    ['manifest.xml', Buffer.from('<OfficeApp>manifest</OfficeApp>').toString('base64')],
  ]);
  const context: OutlookContext = { platform, config: { ...DEFAULT_HOST_CONFIG, ...changes }, files };
  const saved = async () => parseHostConfig(await readFile(platform.configPath, 'utf8').catch(() => null));
  return { home, platform, io, context, values, saved, outlook: platform.outlook! };
}

const printed = (io: { print: ReturnType<typeof vi.fn> }) =>
  io.print.mock.calls.map(([text]) => text).join('\n');

describe('the windowless program copy', () => {
  it('sets the GUI subsystem in place of the console subsystem and changes nothing else', async () => {
    const image = fakeProgram();
    const before = Buffer.from(image);
    markWindowless(image);
    expect(image.readUInt16LE(subsystemOffset(image))).toBe(2);
    const changed = [...image.keys()].filter((index) => image[index] !== before[index]);
    expect(changed).toEqual([subsystemOffset(image)]);
  });

  it('refuses files that are not Windows programs', () => {
    expect(() => markWindowless(Buffer.from('#!/bin/sh\n'.padEnd(256, ' ')))).toThrow(
      'Not a Windows program',
    );
    const image = fakeProgram();
    image.write('XX', 0x80, 'latin1');
    expect(() => markWindowless(image)).toThrow('Not a Windows program');
  });

  it('writes the copy next to the program and replaces an earlier one', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'writehand-windowless-'));
    temporary.push(directory);
    const source = join(directory, 'writehand.exe');
    const target = join(directory, 'writehand-outlook.exe');
    await writeFile(source, fakeProgram());
    await writeFile(target, 'old copy');
    await writeWindowlessCopy(source, target);
    const copy = await readFile(target);
    expect(copy.readUInt16LE(subsystemOffset(copy))).toBe(2);
    expect(copy.subarray(600, 619).toString('latin1')).toBe('rest of the program');
    expect((await readFile(source)).readUInt16LE(subsystemOffset(copy))).toBe(3);
  });
});

describe('writehand outlook', () => {
  it('starts the server from the windowless copy, with the installed script for a development install', async () => {
    const { context, outlook, platform } = await setup();
    expect(serveCommand(context)).toEqual({
      file: outlook.windowlessProgramPath,
      args: ['outlook', 'serve'],
    });
    const development = { ...context, config: { ...context.config, development: true } };
    expect(serveCommand(development).args).toEqual([platform.development.scriptPath, 'outlook', 'serve']);
    expect(commandLine({ file: 'C:\\Program Files\\w.exe', args: ['outlook', 'serve'] })).toBe(
      '"C:\\Program Files\\w.exe" "outlook" "serve"',
    );
  });

  it('enable: Windows trusts the authority, then the files, sign-in value, manifest and server follow', async () => {
    const { context, io, outlook, values, saved } = await setup();
    await enableOutlook(context, io);

    // The user confirms Windows' prompt for exactly the authority this helper made.
    const trusted = io.run.mock.calls[0]![0];
    expect(trusted.file).toBe('certutil');
    expect(trusted.args[0]).toBe('-addstore');
    const authority = new X509Certificate(await readFile(join(outlook.directory, 'authority.crt')));
    const server = new X509Certificate(await readFile(join(outlook.directory, 'server.crt')));
    expect(server.verify(authority.publicKey)).toBe(true);
    expect(server.checkHost('localhost')).toBe('localhost');
    expect(await readFile(join(outlook.directory, 'server.key'), 'utf8')).toMatch(/BEGIN PRIVATE KEY/);
    if (process.platform !== 'win32')
      expect((await stat(join(outlook.directory, 'server.key'))).mode & 0o777).toBe(0o600);

    const config = await saved();
    expect(config.outlook).toEqual({
      authorityThumbprint: authority.fingerprint.replaceAll(':', ''),
      notAfter: '2029-01-27T12:00:00.000Z',
    });
    const copy = await readFile(outlook.windowlessProgramPath);
    expect(copy.readUInt16LE(subsystemOffset(copy))).toBe(2);
    expect(values.get(`${WINDOWS_RUN_KEY}\\${OUTLOOK_AUTOSTART_VALUE}`)).toBe(
      `"${outlook.windowlessProgramPath}" "outlook" "serve"`,
    );
    expect(await readFile(outlook.manifestPath, 'utf8')).toBe('<OfficeApp>manifest</OfficeApp>');
    expect(io.start).toHaveBeenCalledWith({
      file: outlook.windowlessProgramPath,
      args: ['outlook', 'serve'],
    });
    expect(printed(io)).toContain('https://aka.ms/olksideload');
    expect(printed(io)).toContain(outlook.manifestPath);
  });

  it('enable: when the user declines the prompt, nothing else changes', async () => {
    const { context, io, outlook, values, saved } = await setup();
    io.run.mockResolvedValue(1);
    await expect(enableOutlook(context, io)).rejects.toThrow('The certificate was not added');
    expect((await saved()).outlook).toBe(null);
    expect(values.size).toBe(0);
    await expect(readFile(join(outlook.directory, 'authority.pending.crt'))).rejects.toThrow();
    await expect(readFile(outlook.windowlessProgramPath)).rejects.toThrow();
    expect(io.start).not.toHaveBeenCalled();
  });

  it('enable again: a new authority replaces the previous one, which Windows is asked to remove', async () => {
    const { context, io } = await setup({
      outlook: { authorityThumbprint: 'A'.repeat(40), notAfter: '2026-11-01T00:00:00.000Z' },
    });
    await enableOutlook(context, io);
    const commands = io.run.mock.calls.map(([command]) => command.args.join(' '));
    expect(commands[0]).toMatch(/^-addstore /);
    expect(commands[1]).toBe(`-delstore ${'A'.repeat(40)}`);
  });

  it('enable needs the add-in inside the program and an installed helper app', async () => {
    const { context, io, platform } = await setup();
    await expect(enableOutlook({ ...context, files: new Map() }, io)).rejects.toThrow(
      'does not contain the Outlook add-in',
    );
    await rm(platform.programPath);
    await expect(enableOutlook(context, io)).rejects.toThrow('The helper app is not installed');
    expect(io.run).not.toHaveBeenCalled();
  });

  it('disable: the server, the sign-in value, the copy, the authority and the files go', async () => {
    const { context, io, outlook, values, saved } = await setup();
    await enableOutlook(context, io);
    const thumbprint = (await saved()).outlook!.authorityThumbprint;
    io.run.mockClear();

    await disableOutlook({ ...context, config: await saved() }, io);
    expect(io.run.mock.calls.map(([command]) => command.args)).toEqual([['-delstore', thumbprint]]);
    expect(values.size).toBe(0);
    await expect(readFile(outlook.windowlessProgramPath)).rejects.toThrow();
    await expect(readFile(outlook.manifestPath)).rejects.toThrow();
    await expect(stat(outlook.directory)).rejects.toThrow();
    expect((await saved()).outlook).toBe(null);
  });

  it('refresh after an install: nothing while off; the new program and a restart while on', async () => {
    const { context, io, outlook, values, saved } = await setup();
    await refreshOutlook(context, io);
    expect(io.start).not.toHaveBeenCalled();
    expect(values.size).toBe(0);

    await enableOutlook(context, io);
    io.start.mockClear();
    await writeFile(context.platform.programPath, fakeProgram());
    await refreshOutlook({ ...context, config: await saved() }, io);
    expect(io.start).toHaveBeenCalledWith(serveCommand(context));
    expect(values.get(`${WINDOWS_RUN_KEY}\\${OUTLOOK_AUTOSTART_VALUE}`)).toContain(
      outlook.windowlessProgramPath,
    );
  });

  it('status tells whether the server is on, answers, and until when its certificate is valid', async () => {
    const { context, io } = await setup();
    await outlookStatus(context, io);
    expect(printed(io)).toContain('is off');
    io.print.mockClear();
    await outlookStatus(
      {
        ...context,
        config: {
          ...context.config,
          outlook: { authorityThumbprint: 'B'.repeat(40), notAfter: '2026-01-01T00:00:00.000Z' },
        },
      },
      io,
    );
    expect(printed(io)).toContain('does not answer');
    expect(printed(io)).toContain('Certificate: expired 2026-01-01');
  });

  it('is available on Windows only', async () => {
    const { context, io } = await setup();
    const platform = { ...context.platform, outlook: null };
    await expect(enableOutlook({ ...context, platform }, io)).rejects.toThrow('Windows only');
  });
});

describe("the pane's bridge token", () => {
  it('is created once and kept across server restarts, and replaced only when it is unusable', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'writehand-token-'));
    temporary.push(directory);
    const first = await bridgeToken(directory);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await bridgeToken(directory)).toBe(first);
    if (process.platform !== 'win32')
      expect((await stat(join(directory, 'bridge.token'))).mode & 0o777).toBe(0o600);
    await writeFile(join(directory, 'bridge.token'), 'short');
    const replaced = await bridgeToken(directory);
    expect(replaced).not.toBe(first);
    expect(replaced).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
