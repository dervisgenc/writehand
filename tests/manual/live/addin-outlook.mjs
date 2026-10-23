// Starts the new Outlook for Windows (olk.exe) for working on the Outlook add-in.
// Usage: pnpm addin:outlook [--devtools] [--debug-port=9229] [--restart]
//   --devtools      opens Edge DevTools with Outlook, where the task pane can be inspected
//                   (Microsoft's documented way: olk.exe --devtools)
//   --debug-port=N  exposes Outlook's webviews on 127.0.0.1:N (Chrome DevTools protocol) for
//                   automated checks of the task pane. While Outlook runs this way, any program
//                   on this computer can read the mailbox through that port: close Outlook when
//                   you are done and start it normally again.
//   --restart       closes a running new Outlook first; the options apply only to a fresh start
// The new Outlook loads the add-in installed for the mailbox (sideloaded from
// apps/outlook-addin/dist-local/manifest.xml; see docs/OUTLOOK_ADDIN.md).
import { execFileSync, spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

if (process.platform !== 'win32') {
  console.error('The new Outlook runs only on Windows.');
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    devtools: { type: 'boolean', default: false },
    'debug-port': { type: 'string' },
    restart: { type: 'boolean', default: false },
  },
});

const system32 = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32');
// The app execution alias of the new Outlook (an MSIX package). It is a reparse point that
// `stat` cannot follow, so its folder is listed instead.
const aliases = join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WindowsApps');
const olk = join(aliases, 'olk.exe');
if (!readdirSync(aliases).includes('olk.exe')) {
  console.error(`The new Outlook was not found (${olk}). Install it from the Microsoft Store.`);
  process.exit(1);
}

const running = () =>
  execFileSync(join(system32, 'tasklist.exe'), ['/FI', 'IMAGENAME eq olk.exe', '/NH'], {
    encoding: 'utf8',
  }).includes('olk.exe');

if (running()) {
  if (!values.restart) {
    console.error('The new Outlook is running. Close it, or run again with --restart.');
    process.exit(1);
  }
  // A normal close (no /F): Outlook saves open drafts as it does when the user closes it.
  execFileSync(join(system32, 'taskkill.exe'), ['/IM', 'olk.exe'], { stdio: 'ignore' });
  for (let attempt = 0; attempt < 30 && running(); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (running()) {
    console.error('The new Outlook did not close. Close it yourself and run again.');
    process.exit(1);
  }
}

const port = values['debug-port'];
if (port !== undefined && !/^\d{4,5}$/.test(port)) {
  console.error('--debug-port takes a port number, for example --debug-port=9229.');
  process.exit(1);
}
const env = { ...process.env };
if (port !== undefined) {
  env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`;
}
const child = spawn(olk, values.devtools ? ['--devtools'] : [], { detached: true, stdio: 'ignore', env });
child.unref();

console.log(`The new Outlook started${values.devtools ? ' with DevTools' : ''}.`);
if (port !== undefined) {
  console.log(`Webviews: http://127.0.0.1:${port}/json/list. Close Outlook when you are done.`);
}
