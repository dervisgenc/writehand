import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:https';
import { join } from 'node:path';
import { userInfo } from 'node:os';
import {
  OUTLOOK_ADDIN_ORIGIN,
  OUTLOOK_ADDIN_PORT,
  OUTLOOK_BRIDGE,
  OUTLOOK_BRIDGE_REQUESTS,
  PRODUCT_NAME,
} from '@writehand/contracts';
import { z } from 'zod';

import { preparePrivateDirectory } from './credential-store';
import { createHelperService, createHostDispatcher } from './host-dispatch';
import { serializeHostConfig, type HostConfig } from './host-config';
import { createLocalCertificates } from './local-certificate';
import { contentTypeOf, startOutlookServer, TASKPANE_PATH, type AddinFile } from './outlook-server';
import type { Command, HostPlatform, OutlookPlatform } from './platform';
import { HOST_VERSION } from './version';
import { writeWindowlessCopy } from './windowless-program';

/**
 * `writehand outlook enable | disable | status | serve`: the helper app serves the Outlook add-in
 * on this computer, so the add-in reaches the helper app's ChatGPT and Claude plans on its own
 * origin (see docs/OUTLOOK_ADDIN.md). Windows only so far.
 */

/** The add-in's files the program carries (`writehand:addin-files`), by published path. */
export function addinFiles(entries: readonly (readonly [string, string])[]): ReadonlyMap<string, AddinFile> {
  return new Map(
    entries.map(([path, base64]) => [
      path,
      { type: contentTypeOf(path), body: Buffer.from(base64, 'base64') },
    ]),
  );
}

export interface OutlookContext {
  readonly platform: HostPlatform;
  readonly config: HostConfig;
  readonly files: ReadonlyMap<string, AddinFile>;
}

export interface OutlookIo {
  /** Runs a system tool in the foreground and returns its exit code. */
  run(command: Command): Promise<number>;
  /** Starts a program that keeps running after this one exits. */
  start(command: Command): void;
  print(text: string): void;
  now(): Date;
  /** How long to wait for the server to start or stop, in seconds. */
  readonly patience: number;
}

export const systemIo: OutlookIo = {
  run: (command) =>
    new Promise((resolve) => {
      const child = spawn(command.file, [...command.args], {
        env: command.env ?? process.env,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.once('error', () => resolve(-1));
      child.once('exit', (code) => resolve(code ?? -1));
    }),
  start: (command) => {
    // Detached: not ended with this process, and on Windows outside Node's own job object.
    spawn(command.file, [...command.args], {
      env: command.env ?? process.env,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref();
  },
  print: (text) => process.stdout.write(`${text}\n`),
  now: () => new Date(),
  patience: 20,
};

/** Outlook on the web's add-in dialog, where a user adds the manifest to their mailbox. */
export const OUTLOOK_SIDELOAD_URL = 'https://aka.ms/olksideload';

const FILES = {
  authority: 'authority.crt',
  certificate: 'server.crt',
  key: 'server.key',
  state: 'server.json',
  bridgeToken: 'bridge.token',
  pageKey: 'page.key',
} as const;

/**
 * The token the server writes into the pane's page. It is kept across restarts, so a pane that
 * stays open while the server is updated or restarted keeps working; `disable` deletes it.
 */
export async function bridgeToken(directory: string): Promise<string> {
  return (await storedSecret(directory, FILES.bridgeToken)).value;
}

/**
 * The key in the pane's address (`taskpane.html?key=…`). Only this user's manifest carries it: the
 * file in their own program folder and the copy in their mailbox. The server writes the bridge
 * token only into a page requested with it, so another Windows account on this computer, which can
 * reach the port but not the manifest, cannot obtain the token. It is kept across certificate
 * renewals and updates, because changing it means adding the add-in to Outlook again.
 */
export async function pageKey(directory: string): Promise<{ value: string; created: boolean }> {
  return storedSecret(directory, FILES.pageKey);
}

/** 32 random bytes in a file of the server's private folder, created when missing or unusable. */
async function storedSecret(directory: string, name: string): Promise<{ value: string; created: boolean }> {
  const path = join(directory, name);
  const stored = (await readFile(path, 'utf8').catch(() => '')).trim();
  if (/^[A-Za-z0-9_-]{43}$/.test(stored)) return { value: stored, created: false };
  const value = randomBytes(32).toString('base64url');
  await writeFile(path, value, { mode: 0o600 });
  return { value, created: true };
}

/** The add-in's manifest with the page key in every address of the task pane. */
export function personalManifest(manifest: Buffer, key: string): Buffer {
  const pane = `${OUTLOOK_ADDIN_ORIGIN}/${TASKPANE_PATH}`;
  const parameter = `${OUTLOOK_BRIDGE.pageKeyParameter}=${key}`;
  const escaped = pane.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const xml = manifest
    .toString('utf8')
    // `pane"` gets `?key=…`; `pane?command=…"` gets `?key=…&amp;command=…` (the manifest is XML).
    .replace(new RegExp(`${escaped}(\\?[^"]*)?"`, 'g'), (_match, query: string | undefined) =>
      query ? `${pane}?${parameter}&amp;${query.slice(1)}"` : `${pane}?${parameter}"`,
    );
  return Buffer.from(xml);
}

const stateSchema = z.object({
  pid: z.number().int(),
  version: z.string(),
  controlToken: z.string().min(32),
  startedAt: z.string(),
});
export type ServerState = z.infer<typeof stateSchema>;

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

function outlookOf(platform: HostPlatform): OutlookPlatform {
  if (platform.outlook === null || platform.registry === null) {
    throw new Error(`The Outlook add-in server is available on Windows only so far.`);
  }
  return platform.outlook;
}

const fileIn = (context: OutlookContext, name: string) =>
  context.platform.path.join(outlookOf(context.platform).directory, name);

/**
 * How the server is started at sign-in and after an update: the windowless copy of the program,
 * or of Node.js with the installed script for a development install.
 */
export function serveCommand(context: OutlookContext): Command {
  const { platform, config } = context;
  const program = outlookOf(platform).windowlessProgramPath;
  return config.development
    ? { file: program, args: [platform.development.scriptPath, 'outlook', 'serve'] }
    : { file: program, args: ['outlook', 'serve'] };
}

/** One command line for the registry: every part quoted (Windows paths have no quotes). */
export function commandLine(command: Command): string {
  return [command.file, ...command.args].map((part) => `"${part}"`).join(' ');
}

// ---- Talking to a running server --------------------------------------------------------------

async function readState(context: OutlookContext): Promise<ServerState | null> {
  try {
    return stateSchema.parse(JSON.parse(await readFile(fileIn(context, FILES.state), 'utf8')));
  } catch {
    return null;
  }
}

async function control(
  context: OutlookContext,
  method: 'GET' | 'POST',
  path: string,
): Promise<{ status: number; body: string } | null> {
  const state = await readState(context);
  const authority = await readFile(fileIn(context, FILES.authority), 'utf8').catch(() => null);
  if (state === null || authority === null) return null;
  return new Promise((resolve) => {
    const call = request(
      {
        host: '127.0.0.1',
        port: OUTLOOK_ADDIN_PORT,
        servername: 'localhost',
        method,
        path,
        // Only the server with the certificate this helper made gets the token.
        ca: authority,
        headers: { host: `localhost:${OUTLOOK_ADDIN_PORT}`, 'x-writehand-control': state.controlToken },
        timeout: 3_000,
      },
      (response) => {
        let body = '';
        response.on('data', (chunk: Buffer) => (body += chunk.toString()));
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
      },
    );
    call.on('timeout', () => call.destroy());
    call.on('error', () => resolve(null));
    call.end();
  });
}

/** The running server's version and process, or null when none of this helper's answers. */
export async function serverStatus(
  context: OutlookContext,
): Promise<{ version: string; pid: number } | null> {
  const answer = await control(context, 'GET', '/control/status');
  if (answer?.status !== 200) return null;
  try {
    return z.object({ version: z.string(), pid: z.number() }).parse(JSON.parse(answer.body));
  } catch {
    return null;
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor<T>(check: () => Promise<T | null>, seconds: number): Promise<T | null> {
  for (let attempt = 0; attempt < seconds * 4; attempt++) {
    const value = await check();
    if (value !== null) return value;
    await pause(250);
  }
  return null;
}

async function stopServer(context: OutlookContext, io: OutlookIo): Promise<void> {
  if ((await control(context, 'POST', '/control/stop'))?.status !== 204) return;
  await waitFor(async () => ((await serverStatus(context)) === null ? true : null), io.patience);
}

/** Starts the installed server, or hands a running one over to it, and waits until it answers. */
async function startServer(context: OutlookContext, io: OutlookIo): Promise<boolean> {
  const handedOver = (await control(context, 'POST', '/control/restart'))?.status === 204;
  if (!handedOver) io.start(serveCommand(context));
  const running = await waitFor(async () => {
    const status = await serverStatus(context);
    return status?.version === HOST_VERSION ? status : null;
  }, io.patience);
  return running !== null;
}

// ---- Commands ---------------------------------------------------------------------------------

async function saveConfig(context: OutlookContext, config: HostConfig): Promise<void> {
  await writeFile(context.platform.configPath, serializeHostConfig(config));
}

/** The windowless program and the sign-in value, for the program installed now. */
async function installServerProgram(context: OutlookContext): Promise<void> {
  const { platform, config } = context;
  const outlook = outlookOf(platform);
  const runtime = config.development ? process.execPath : platform.programPath;
  await writeWindowlessCopy(runtime, outlook.windowlessProgramPath);
  await platform.registry!.setValue(
    outlook.autostart.key,
    outlook.autostart.name,
    commandLine(serveCommand(context)),
  );
}

function label(): string {
  try {
    return userInfo().username;
  } catch {
    return 'this user';
  }
}

export async function enableOutlook(context: OutlookContext, io: OutlookIo): Promise<void> {
  const { platform } = context;
  const outlook = outlookOf(platform);
  const manifest = context.files.get('manifest.xml');
  if (manifest === undefined || !context.files.has('taskpane.html')) {
    throw new Error(
      'This build of the helper app does not contain the Outlook add-in (run pnpm addin:build, then build it again).',
    );
  }
  const installed = context.config.development ? platform.development.scriptPath : platform.programPath;
  if (!(await exists(installed))) {
    throw new Error(
      `The helper app is not installed (${installed}). Install it first, then run this command again.`,
    );
  }

  await preparePrivateDirectory(platform.dataDirectory, platform.restrictDirectory, {
    restrictExisting: true,
  });
  await mkdir(outlook.directory, { recursive: true });
  const certificates = createLocalCertificates({ now: io.now(), label: label() });
  const pending = fileIn(context, 'authority.pending.crt');
  await writeFile(pending, certificates.authorityPem);
  io.print(
    [
      'Outlook loads add-ins only over HTTPS, so Windows now asks you to trust a certificate',
      `"Writehand local Outlook add-in (${label()})". It is valid only for this computer's local`,
      'addresses (localhost), and its private key has already been discarded. Select Yes.',
    ].join('\n'),
  );
  if ((await io.run(outlook.trustAuthority(pending))) !== 0) {
    await rm(pending, { force: true });
    throw new Error(
      'The certificate was not added, so Outlook could not load the add-in. Nothing was changed.',
    );
  }

  // The running server keeps the old certificate until it is replaced.
  await stopServer(context, io);
  await writeFile(fileIn(context, FILES.key), certificates.serverKeyPem, { mode: 0o600 });
  await writeFile(fileIn(context, FILES.certificate), certificates.serverPem);
  await rename(pending, fileIn(context, FILES.authority));
  const previous = context.config.outlook?.authorityThumbprint ?? null;
  const config: HostConfig = {
    ...context.config,
    outlook: {
      authorityThumbprint: certificates.authorityThumbprint,
      notAfter: certificates.notAfter.toISOString(),
    },
  };
  await saveConfig(context, config);
  const current = { ...context, config };
  if (previous !== null && previous !== certificates.authorityThumbprint) {
    io.print('Windows asks once more, to remove the previous Writehand certificate. Select Yes.');
    if ((await io.run(outlook.untrustAuthority(previous))) !== 0) {
      io.print(
        'The previous certificate stays among your trusted certificates (certmgr.msc lists it); it is valid only for localhost.',
      );
    }
  }

  await installServerProgram(current);
  const key = await pageKey(outlook.directory);
  await writeFile(outlook.manifestPath, personalManifest(manifest.body, key.value));
  const running = await startServer(current, io);
  io.print(
    running
      ? `The ${PRODUCT_NAME} Outlook add-in runs on ${OUTLOOK_ADDIN_ORIGIN} and starts when you sign in to Windows.`
      : `The server did not answer yet. Run "writehand outlook status" in a moment; it also starts when you sign in to Windows.`,
  );
  // The first time, the last step comes to the user: the add-in dialog opens with the path ready.
  // Renewing the certificate leaves the add-in in Outlook as it is.
  const first = previous === null;
  const copied = first && (await io.run(outlook.copyToClipboard(outlook.manifestPath))) === 0;
  if (first) io.start(platform.urlOpener(OUTLOOK_SIDELOAD_URL));
  io.print(
    [
      '',
      first
        ? `Last step, once: add the add-in to your mailbox. Your browser opens ${OUTLOOK_SIDELOAD_URL} (sign in if asked).`
        : `If ${PRODUCT_NAME} is not in Outlook yet, add it once at ${OUTLOOK_SIDELOAD_URL}.`,
      'Choose My add-ins → Custom Addins → Add a custom add-in → Add from File and select this file' +
        (copied ? ' (its path is on the clipboard: paste it into the file name box):' : ':'),
      `  ${outlook.manifestPath}`,
      `Then restart Outlook; ${PRODUCT_NAME} is under Apps on an email and on a draft.`,
      `The certificate is valid until ${certificates.notAfter.toISOString().slice(0, 10)}; run writehand outlook enable again before then.`,
    ].join('\n'),
  );
}

/**
 * `install --outlook`: turns the server on as `outlook enable` does. When it is on already,
 * `install` has just restarted it with the new program, so Windows is not asked again.
 */
export async function installOutlook(context: OutlookContext, io: OutlookIo): Promise<void> {
  if (context.config.outlook === null) {
    await enableOutlook(context, io);
    return;
  }
  io.print(
    `The ${PRODUCT_NAME} Outlook add-in server is on already (writehand outlook status). Its manifest: ${outlookOf(context.platform).manifestPath}`,
  );
}

export async function disableOutlook(context: OutlookContext, io: OutlookIo): Promise<void> {
  const { platform } = context;
  const outlook = outlookOf(platform);
  await stopServer(context, io);
  await platform.registry!.removeValue(outlook.autostart.key, outlook.autostart.name);
  await rm(outlook.windowlessProgramPath, { force: true }).catch(() => undefined);
  const thumbprint = context.config.outlook?.authorityThumbprint ?? null;
  if (thumbprint !== null) {
    io.print('Windows asks you to confirm removing the Writehand certificate. Select Yes.');
    if ((await io.run(outlook.untrustAuthority(thumbprint))) !== 0) {
      io.print(
        'The certificate stays among your trusted certificates (certmgr.msc lists it); it is valid only for localhost.',
      );
    }
  }
  await rm(outlook.directory, { recursive: true, force: true });
  await rm(outlook.manifestPath, { force: true });
  if (context.config.outlook !== null) await saveConfig(context, { ...context.config, outlook: null });
  io.print(
    `The Outlook add-in server is off. Remove ${PRODUCT_NAME} from Outlook as well: ${OUTLOOK_SIDELOAD_URL} → My add-ins.`,
  );
}

export async function outlookStatus(context: OutlookContext, io: OutlookIo): Promise<void> {
  const outlook = context.config.outlook;
  if (outlook === null) {
    io.print('The Outlook add-in server is off (writehand outlook enable turns it on).');
    return;
  }
  const running = await serverStatus(context);
  const expired = new Date(outlook.notAfter).getTime() <= io.now().getTime();
  io.print(
    [
      running === null
        ? `The Outlook add-in server is on but does not answer on ${OUTLOOK_ADDIN_ORIGIN}. Sign out and in again, or run writehand outlook enable.`
        : `The Outlook add-in server ${running.version} runs on ${OUTLOOK_ADDIN_ORIGIN}.`,
      `Certificate: ${expired ? 'expired' : 'valid until'} ${outlook.notAfter.slice(0, 10)}${expired ? '; run writehand outlook enable' : ''}.`,
      `Manifest: ${outlookOf(context.platform).manifestPath}`,
    ].join('\n'),
  );
}

/**
 * After `install` (and so after every update): the server runs the program just installed. The
 * running server starts it itself, so it keeps running even when a browser ran the update.
 */
export async function refreshOutlook(context: OutlookContext, io: OutlookIo): Promise<void> {
  if (context.config.outlook === null || context.platform.outlook === null) return;
  await installServerProgram(context);
  const manifest = context.files.get('manifest.xml');
  if (manifest !== undefined) {
    const key = await pageKey(context.platform.outlook.directory);
    await writeFile(context.platform.outlook.manifestPath, personalManifest(manifest.body, key.value));
    // A server turned on before the page key existed: the add-in in Outlook has the old address,
    // whose pane gets no token, so the plans are not available there until it is added again.
    if (key.created)
      io.print(
        `The ${PRODUCT_NAME} add-in in Outlook must be added again for the ChatGPT and Claude plans: remove it at ${OUTLOOK_SIDELOAD_URL} → My add-ins, then add this file: ${context.platform.outlook.manifestPath}`,
      );
  }
  if (!(await startServer(context, io)))
    io.print('The Outlook add-in server did not restart; it starts when you sign in to Windows.');
}

/** `writehand outlook serve`: the server process. It never writes to a console (it has none). */
export async function serveOutlook(context: OutlookContext, io: OutlookIo): Promise<void> {
  outlookOf(context.platform);
  const [cert, key] = await Promise.all([
    readFile(fileIn(context, FILES.certificate), 'utf8'),
    readFile(fileIn(context, FILES.key), 'utf8'),
  ]).catch(() => [null, null]);
  if (
    cert === null ||
    key === null ||
    context.config.outlook === null ||
    !context.files.has('taskpane.html')
  ) {
    process.exitCode = 1;
    return;
  }
  const dispatcher = createHostDispatcher({
    platform: context.platform,
    config: context.config,
    service: createHelperService(context.platform),
    allowed: OUTLOOK_BRIDGE_REQUESTS,
  });
  const state: ServerState = {
    pid: process.pid,
    version: HOST_VERSION,
    controlToken: randomBytes(32).toString('base64url'),
    startedAt: io.now().toISOString(),
  };
  const statePath = fileIn(context, FILES.state);
  let server: Awaited<ReturnType<typeof startOutlookServer>> = 'in-use';
  const close = async () => {
    if (server !== 'in-use') {
      server.close();
      server.closeAllConnections();
    }
    dispatcher.dispose();
    const recorded = await readState(context);
    if (recorded?.pid === process.pid) await rm(statePath, { force: true });
  };
  const options = {
    port: OUTLOOK_ADDIN_PORT,
    files: context.files,
    dispatch: (raw: unknown) => dispatcher.dispatch(raw),
    token: await bridgeToken(outlookOf(context.platform).directory),
    pageKey: (await pageKey(outlookOf(context.platform).directory)).value,
    controlToken: state.controlToken,
    cert,
    key,
    status: () => ({ version: state.version, pid: state.pid, startedAt: state.startedAt }),
    onStop: () => void close().then(() => process.exit(0)),
    onRestart: () =>
      void close().then(() => {
        io.start(serveCommand(context));
        process.exit(0);
      }),
  };
  // A server handing over may still hold the port for a moment.
  for (let attempt = 0; attempt < 40 && server === 'in-use'; attempt++) {
    server = await startOutlookServer(options);
    if (server === 'in-use') await pause(250);
  }
  if (server === 'in-use') {
    dispatcher.dispose();
    return;
  }
  await writeFile(statePath, `${JSON.stringify(state)}\n`, { mode: 0o600 });
  process.on('SIGTERM', options.onStop);
  process.on('SIGINT', options.onStop);
}
