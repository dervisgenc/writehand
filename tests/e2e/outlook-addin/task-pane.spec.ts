import { resolve } from 'node:path';

import { expect, test, type Page, type Route } from '@playwright/test';
import { build } from 'vite';

import { WEB_RECEIVED_MESSAGE, WEB_REPLY_DRAFT } from '../../fixtures/outlook-addin/bodies';
import type { FakeOfficeOptions } from '../../support/office/fake-office';

/**
 * The Outlook add-in's production build in Chromium, with the in-memory Office.js in place of
 * Microsoft's and a stubbed Groq. It checks the task pane's flows end to end; it does not show
 * that they work in a real Outlook.
 */
const PANE = 'http://127.0.0.1:4517/addin/taskpane.html';
const OFFICE_JS = 'https://officeapis.public.onecdn.static.microsoft/1/office.js';
const KEY = 'gsk_e2e-test-key-0123456789';

let fakeOfficeScript: string | null = null;

/** Bundles the unit tests' fake Office.js into one script, once. */
async function fakeOffice(): Promise<string> {
  if (fakeOfficeScript !== null) return fakeOfficeScript;
  const output = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      lib: {
        entry: resolve(import.meta.dirname, 'fake-office-global.ts'),
        formats: ['iife'],
        name: 'FakeOffice',
      },
    },
  });
  const [result] = Array.isArray(output) ? output : [output];
  const chunk =
    result && 'output' in result ? result.output.find((item) => item.type === 'chunk') : undefined;
  if (chunk === undefined || chunk.type !== 'chunk') throw new Error('The fake Office.js was not built.');
  fakeOfficeScript = chunk.code;
  return fakeOfficeScript;
}

interface Groq {
  readonly requests: { url: string; authorization: string | null }[];
  /** Texts the next generations return, in order. */
  readonly answers: string[];
}

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

async function stubGroq(page: Page): Promise<Groq> {
  const groq: Groq = { requests: [], answers: [] };
  await page.route('https://api.groq.com/**', async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET, POST' } });
      return;
    }
    groq.requests.push({ url: request.url(), authorization: request.headers()['authorization'] ?? null });
    if (request.url().endsWith('/models')) {
      await route.fulfill({ headers: cors, json: { data: [{ id: 'openai/gpt-oss-120b', active: true }] } });
      return;
    }
    const answer = groq.answers.shift() ?? 'Done.';
    const events = [
      { choices: [{ delta: { content: answer } }] },
      { choices: [{ delta: {}, finish_reason: 'stop' }] },
    ];
    await route.fulfill({
      headers: { ...cors, 'content-type': 'text/event-stream' },
      body: `${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')}data: [DONE]\n\n`,
    });
  });
  return groq;
}

/** Opens the pane with the given item open in the fake Outlook; every other request is recorded. */
async function openPane(page: Page, options: FakeOfficeOptions) {
  const hosts = new Set<string>();
  page.on('request', (request) => hosts.add(new URL(request.url()).host));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript((value) => {
    (window as unknown as { __fakeOfficeOptions: unknown }).__fakeOfficeOptions = value;
  }, options);
  const script = await fakeOffice();
  await page.route(OFFICE_JS, (route) => route.fulfill({ contentType: 'text/javascript', body: script }));
  const groq = await stubGroq(page);
  await page.setViewportSize({ width: 380, height: 900 });
  await page.goto(PANE);
  return { groq, hosts, errors };
}

async function connectKey(page: Page) {
  await page.getByLabel('Groq API key').fill(KEY);
  await page.getByRole('button', { name: 'Connect key' }).click();
  await expect(page.getByText('Groq key saved, encrypted in this Outlook app.')).toBeVisible();
}

test('first run: connect a key, revise the sample, then reply to the open email in a new reply draft', async ({
  page,
}) => {
  const { groq, hosts, errors } = await openPane(page, {
    item: { mode: 'read', bodyHtml: WEB_RECEIVED_MESSAGE, conversationId: 'conversation-1' },
  });
  await expect(page.getByRole('heading', { name: 'Welcome to Writehand' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start' })).toBeDisabled();

  await connectKey(page);
  // The add-in offers only the API key method.
  await expect(page.getByRole('radiogroup', { name: 'Connection method' })).toHaveCount(0);
  groq.answers.push('Hi Sam, thanks for your message.');
  await page.getByRole('button', { name: 'Revise the sample' }).click();
  await expect(page.getByText('Hi Sam, thanks for your message.')).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();

  // Read mode: the panel drafts a reply with the open email as context.
  await expect(page.getByRole('region', { name: 'Writing assistant' })).toBeVisible();
  await expect(page.getByText('Using Groq API key')).toBeVisible();
  await page.getByLabel('Reply instruction').fill('Thank Ayşe and confirm Thursday');
  groq.answers.push('Thank you, Ayşe. Thursday at 14:00 works for me.');
  await page.getByRole('button', { name: 'Draft reply', exact: true }).last().click();
  await expect(page.getByRole('textbox', { name: 'Result', exact: true })).toHaveValue(
    'Thank you, Ayşe. Thursday at 14:00 works for me.',
  );

  await page.getByRole('button', { name: 'Open a reply with this text' }).click();
  await expect(page.getByText('Text placed in the draft.', { exact: false })).toBeVisible();
  const replies = await page.evaluate(
    () => (window as unknown as { __fakeOffice: { openedReplies: string[] } }).__fakeOffice.openedReplies,
  );
  expect(replies).toEqual(['<div>Thank you, Ayşe. Thursday at 14:00 works for me.</div>']);

  // Only the page's own origin, Office.js and the chosen provider were contacted, with the key.
  expect([...hosts].sort()).toEqual([
    '127.0.0.1:4517',
    'api.groq.com',
    'officeapis.public.onecdn.static.microsoft',
  ]);
  expect(new Set(groq.requests.map((request) => request.authorization))).toEqual(new Set([`Bearer ${KEY}`]));
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(stored).toContain('secrets');
  expect(stored).not.toContain('gsk_e2e-test-key');
  expect(errors).toEqual([]);
});

test('compose: revises the selected words of a reply draft and writes them back once', async ({ page }) => {
  const { groq, errors } = await openPane(page, {
    item: {
      mode: 'compose',
      bodyHtml: WEB_REPLY_DRAFT,
      composeType: 'reply',
      conversationId: 'conversation-1',
    },
  });
  await connectKey(page);
  await page.evaluate(() =>
    (window as unknown as { __fakeOffice: { select: (phrase: string) => void } }).__fakeOffice.select(
      'perşembe günü',
    ),
  );
  await page.getByRole('button', { name: 'Start' }).click();

  await expect(page.getByRole('textbox', { name: 'Text' })).toHaveValue('perşembe günü');
  groq.answers.push('cuma sabahı');
  await page.getByRole('button', { name: 'Revise', exact: true }).last().click();
  await expect(page.getByRole('textbox', { name: 'Result', exact: true })).toHaveValue('cuma sabahı');
  await expect(page.getByText('Selected text', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Apply to draft' }).click();
  await expect(page.getByText('Text placed in the draft.', { exact: false })).toBeVisible();
  const body = await page.evaluate(() =>
    (window as unknown as { __fakeOffice: { bodyText: () => string } }).__fakeOffice.bodyText(),
  );
  expect(body).toContain('Toplantı cuma sabahı olsun mu?');
  expect(body).toContain('Merhaba Deniz, perşembe 14:00 uygun mu?');
  const calls = await page.evaluate(
    () => (window as unknown as { __fakeOffice: { calls: string[] } }).__fakeOffice.calls,
  );
  expect(calls.filter((call) => call === 'body.setSelectedDataAsync')).toHaveLength(1);
  expect(calls).not.toContain('body.setAsync');
  expect(errors).toEqual([]);
});

test('opened outside Outlook, the pane says where it runs and reads nothing', async ({ page }) => {
  await page.route(OFFICE_JS, (route) => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.goto(PANE);
  await expect(page.getByText('Writehand runs inside Outlook.', { exact: false })).toBeVisible();
});
