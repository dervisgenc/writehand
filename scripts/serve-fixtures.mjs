// Serves the synthetic Outlook and Gmail sample pages on the loopback interface only.
// The extension's test build accepts http://127.0.0.1/mail/* (Outlook) and
// http://127.0.0.1/gmail/* (Gmail) as supported origins; the regular package's manifest
// includes neither. The Outlook add-in's production build is served under /addin/.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve } from 'node:path';

const port = Number(process.env.FIXTURE_PORT ?? 4517);
const fixtures = resolve(import.meta.dirname, '../tests/fixtures');
const addin = resolve(import.meta.dirname, '../apps/outlook-addin/dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
};

/** A file of the add-in's build, or null outside it. */
async function addinFile(path) {
  const file = resolve(addin, `.${path.slice('/addin'.length)}`);
  if (relative(addin, file).startsWith('..')) return null;
  try {
    return { body: await readFile(file), type: TYPES[extname(file)] ?? 'application/octet-stream' };
  } catch {
    return null;
  }
}
// Each site's page sits under the local path its content script runs on in test builds.
const pages = {
  '/mail/inbox': { file: 'outlook/conversation-inline-reply.html', title: 'Outlook sample page' },
  '/gmail/mail/u/0/': { file: 'gmail/conversation-inline-reply.html', title: 'Gmail sample page' },
  '/gmail/mail/u/0/list': { file: 'gmail/reply-from-list.html', title: 'Gmail sample page' },
};

const server = createServer(async (request, response) => {
  const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  if (path.startsWith('/addin/')) {
    const file = await addinFile(path);
    if (file === null) response.writeHead(404).end('not found');
    else response.writeHead(200, { 'content-type': file.type }).end(file.body);
    return;
  }
  const page = pages[path];
  if (page === undefined) {
    response.writeHead(404).end('not found');
    return;
  }
  const body = await readFile(resolve(fixtures, page.file), 'utf8');
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(
    `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${page.title}</title></head><body>${body}</body></html>`,
  );
});

server.listen(port, '127.0.0.1', () => {
  console.log(`fixture server: http://127.0.0.1:${port}/mail/inbox`);
});
