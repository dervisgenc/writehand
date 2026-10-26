// Promo video: the extension's real UI is used in the demo mailbox with real mouse and
// keyboard events. Frames are taken one by one from Chrome's screencast (CDP) and ffmpeg
// turns them into a 1920×1080, 30 fps H.264 MP4. The cursor, captions and the title and
// end cards are drawn over the page; there is no audio.
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { BACKDROP, FONT } from './frames.mjs';
import { iconDataUri } from './icons.mjs';
import { launch, startServer, WORK_DIR } from './harness.mjs';
import { editor, openMailbox, toolbar } from './scenes.mjs';
import { COSTS, LAUNCH_THREAD, REPLY, RESPONSES, REVISE, TRANSLATE } from './story.mjs';

const VIEWPORT = { width: 1440, height: 810 };
const OUTPUT = { width: 1920, height: 1080, fps: 30 };
const FRAMES_DIR = resolve(WORK_DIR, 'video-frames');

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Overlay drawn on the page (runs in the page): a cursor that follows the mouse, a click
 * ripple, a caption at the top and full-screen cards. It is appended after `<body>` so it
 * stays above the extension's UI too, and it does not receive mouse events.
 */
function installOverlay({ icon, backdrop, font }) {
  const overlay = document.createElement('div');
  overlay.id = 'demo-overlay';
  overlay.innerHTML = `<style>
    #demo-overlay, #demo-overlay * { box-sizing: border-box; pointer-events: none; }
    #demo-overlay { position: fixed; inset: 0; z-index: 2147483647; font-family: ${font}; }
    .demo-cursor { position: absolute; left: 0; top: 0; width: 26px; height: 30px; transform: translate(-100px, -100px);
      filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.35)); }
    .demo-ripple { position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
      background: rgb(15 108 189 / 0.32); animation: demo-ripple 450ms ease-out forwards; }
    @keyframes demo-ripple { from { transform: scale(0.3); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
    .demo-caption { position: absolute; left: 50%; top: 18px; display: flex; align-items: center; gap: 12px;
      padding: 12px 24px 12px 14px; border-radius: 999px; background: rgb(17 20 34 / 0.9); color: #fff;
      font-size: 22px; font-weight: 600; box-shadow: 0 8px 28px rgb(0 0 0 / 0.3);
      transform: translate(-50%, -12px); opacity: 0; transition: opacity 350ms, transform 350ms; white-space: nowrap; }
    .demo-caption.is-visible { transform: translate(-50%, 0); opacity: 1; }
    .demo-caption img { width: 30px; height: 30px; }
    .demo-card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 18px; background: ${backdrop}; color: #fff; text-align: center; opacity: 0; transition: opacity 700ms; }
    .demo-card.is-visible { opacity: 1; }
    .demo-card.is-visible ~ .demo-cursor { opacity: 0; transition: opacity 300ms; }
    .demo-card .lockup { display: flex; align-items: center; gap: 26px; font-size: 92px; font-weight: 700; letter-spacing: -0.02em; }
    .demo-card .lockup img { width: 132px; height: 132px; border-radius: 22%; filter: drop-shadow(0 10px 26px rgb(8 20 60 / 0.4)); }
    .demo-card h1 { margin: 10px 0 0; font-size: 40px; font-weight: 700; }
    .demo-card p { margin: 0; font-size: 26px; opacity: 0.92; }
    .demo-card .url { margin-top: 18px; padding: 10px 22px; border-radius: 999px; background: rgb(255 255 255 / 0.16);
      box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.3); font-size: 24px; font-weight: 600; }
  </style>
  <div class="demo-card"></div>
  <div class="demo-caption"><img src="${icon}" alt=""><span></span></div>
  <svg class="demo-cursor" viewBox="0 0 26 30"><path d="M3 2v22l6-5.6 4 9 4-1.7-4-8.9h8.2z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const cursor = overlay.querySelector('.demo-cursor');
  const caption = overlay.querySelector('.demo-caption');
  const card = overlay.querySelector('.demo-card');
  // Listens in the capture phase so events in the extension's UI move the cursor too.
  window.addEventListener(
    'mousemove',
    (event) => (cursor.style.transform = `translate(${event.clientX - 3}px, ${event.clientY - 2}px)`),
    true,
  );
  window.addEventListener(
    'mousedown',
    (event) => {
      const ripple = document.createElement('div');
      ripple.className = 'demo-ripple';
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      overlay.insertBefore(ripple, cursor);
      setTimeout(() => ripple.remove(), 500);
    },
    true,
  );
  window.demoOverlay = {
    caption(text) {
      caption.classList.toggle('is-visible', text !== null);
      if (text !== null) caption.querySelector('span').textContent = text;
    },
    card(html) {
      if (html !== null) card.innerHTML = html;
      card.classList.toggle('is-visible', html !== null);
    },
  };
  document.addEventListener('DOMContentLoaded', () => document.documentElement.append(overlay));
}

/** Writes the screencast frames to disk in order; durations come from the frame timestamps. */
async function startRecording(page) {
  await rm(FRAMES_DIR, { recursive: true, force: true });
  await mkdir(FRAMES_DIR, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  const writes = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = `${String(frames.length).padStart(6, '0')}.jpg`;
    frames.push({ file, time: metadata.timestamp });
    writes.push(writeFile(resolve(FRAMES_DIR, file), Buffer.from(data, 'base64')));
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined);
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: OUTPUT.width,
    maxHeight: OUTPUT.height,
    everyNthFrame: 1,
  });
  return async function stop() {
    const end = Date.now() / 1000;
    await cdp.send('Page.stopScreencast');
    await Promise.all(writes);
    return { frames, end };
  };
}

/** Turns the frames into an ffmpeg concat list and encodes it at a constant frame rate. */
async function encode({ frames, end }, output) {
  const lines = ['ffconcat version 1.0'];
  frames.forEach((frame, index) => {
    const next = frames[index + 1]?.time ?? end;
    lines.push(`file '${frame.file}'`, `duration ${Math.max(next - frame.time, 0.001).toFixed(4)}`);
  });
  // The concat format applies the last frame's duration only if that frame is listed once more.
  lines.push(`file '${frames.at(-1).file}'`);
  const list = resolve(FRAMES_DIR, 'frames.ffconcat');
  await writeFile(list, `${lines.join('\n')}\n`);
  await mkdir(resolve(output, '..'), { recursive: true });
  execFileSync(
    process.env.FFMPEG ?? 'ffmpeg',
    [
      ...['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list],
      ...['-vf', `fps=${OUTPUT.fps},scale=${OUTPUT.width}:${OUTPUT.height}:flags=lanczos,format=yuv420p`],
      ...['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', '-an', output],
    ],
    { stdio: 'inherit' },
  );
}

/** Director: moves the cursor smoothly to the target, clicks, types and changes captions. */
function director(page) {
  let pointer = { x: VIEWPORT.width * 0.62, y: VIEWPORT.height * 0.55 };

  async function moveToPoint(target, duration = 650) {
    const from = pointer;
    const steps = Math.max(8, Math.round(duration / 16));
    for (let step = 1; step <= steps; step += 1) {
      const t = easeInOut(step / steps);
      await page.mouse.move(from.x + (target.x - from.x) * t, from.y + (target.y - from.y) * t);
      await sleep(12);
    }
    pointer = target;
  }

  async function center(locator) {
    const box = await locator.boundingBox();
    if (box === null) throw new Error(`Not visible: ${locator}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  return {
    pause: sleep,
    moveTo: async (locator, duration) => moveToPoint(await center(locator), duration),
    async click(locator, { duration } = {}) {
      await locator.waitFor();
      await moveToPoint(await center(locator), duration);
      await sleep(140);
      await page.mouse.down();
      await sleep(80);
      await page.mouse.up();
      await sleep(260);
    },
    async type(text, delay = 38) {
      await page.keyboard.type(text, { delay });
    },
    /** Selects the first line of the draft by dragging the mouse from start to end. */
    async selectFirstLine() {
      const { start, end } = await editor(page).evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element.querySelector('.elementToProof'));
        const rects = [...range.getClientRects()];
        const first = rects[0];
        const last = rects.at(-1);
        return {
          start: { x: first.left + 1, y: first.top + first.height / 2 },
          end: { x: last.right - 1, y: last.top + last.height / 2 },
        };
      });
      await moveToPoint(start);
      await page.mouse.down();
      await moveToPoint(end, 900);
      await page.mouse.up();
      await sleep(300);
    },
    caption: (text) => page.evaluate((value) => window.demoOverlay.caption(value), text),
    card: (html) => page.evaluate((value) => window.demoOverlay.card(value), html),
  };
}

const titleCard = (icon) => `
  <div class="lockup"><img src="${icon}" alt=""><span>Writehand</span></div>
  <p>AI email writing for Outlook on the web</p>`;

const endCard = (icon) => `
  <div class="lockup"><img src="${icon}" alt=""><span>Writehand</span></div>
  <h1>Write better emails in Outlook on the web</h1>
  <p>API key · ChatGPT plan · Claude Code &nbsp;|&nbsp; Free and open source</p>
  <div class="url">github.com/dervisgenc/writehand</div>`;

/** The video's flow. Each part opens with a caption; it clicks and types like a user. */
async function play(page, act) {
  const card = (name) => page.getByRole('dialog', { name });
  const ribbonNewMail = page.locator('.ribbon__new');
  const recipients = page.locator('[aria-label="To"][contenteditable]');
  // First line of the draft: the caret goes where the text is written, not into the signature or quote.
  const firstLine = () => editor(page).locator('.elementToProof').first();

  await act.pause(2200);
  await act.card(null);
  await act.pause(900);

  // 1. Reply
  await act.caption('Open an email and start a reply');
  await act.click(page.locator(`[data-conversation="${LAUNCH_THREAD}"]`));
  await act.pause(1300);
  await act.click(page.locator('.pill-btn[aria-label="Reply"]'));
  await act.click(firstLine(), { duration: 400 });
  await act.pause(500);
  await act.caption('Say what you want in a few words');
  await act.click(toolbar(page).getByRole('button', { name: 'Write reply' }));
  await act.pause(300);
  await act.type(REPLY.instruction);
  await act.pause(300);
  await act.click(card('Reply draft').getByRole('button', { name: 'Write', exact: true }));
  await card('Reply draft').getByRole('button', { name: 'Apply to draft' }).waitFor();
  await act.caption('Review the draft, then apply it');
  await act.pause(1800);
  await act.click(card('Reply draft').getByRole('button', { name: 'Apply to draft' }), { duration: 800 });
  await act.pause(2000);

  // 2. Revise
  await act.caption('Polish a rough draft');
  await act.click(ribbonNewMail, { duration: 900 });
  await act.click(recipients);
  await act.type(REVISE.to[0].name, 30);
  await act.click(page.getByLabel('Subject'), { duration: 300 });
  await act.type(REVISE.subject, 30);
  await act.click(firstLine(), { duration: 400 });
  await act.type(REVISE.draft, 14);
  await act.pause(500);
  await act.selectFirstLine();
  await act.click(toolbar(page).getByRole('button', { name: 'Revise' }));
  await card('Suggested revision').getByRole('button', { name: 'Apply to draft' }).waitFor();
  await act.pause(1800);
  await act.click(card('Suggested revision').getByRole('button', { name: 'Apply to draft' }), {
    duration: 800,
  });
  await act.pause(1400);
  await act.click(card('Suggested revision').getByRole('button', { name: 'Close' }), { duration: 500 });

  // 3. Translate
  await act.caption('Translate into any language');
  await act.click(toolbar(page).getByRole('button', { name: 'Choose translation language' }));
  await act.pause(500);
  await act.click(page.getByRole('menuitemradio', { name: TRANSLATE.languageName }), { duration: 500 });
  await card('Translation').getByRole('button', { name: 'Apply to draft' }).waitFor();
  await act.pause(1600);
  await act.click(card('Translation').getByRole('button', { name: 'Apply to draft' }), { duration: 700 });
  await act.pause(1600);

  // 4. Table and chart
  await act.caption('Turn numbers into a table and a chart');
  await act.click(ribbonNewMail, { duration: 900 });
  await act.click(recipients);
  await act.type(COSTS.to[0].name, 24);
  await act.click(page.getByLabel('Subject'), { duration: 300 });
  await act.type(COSTS.subject, 18);
  await act.click(firstLine(), { duration: 400 });
  await act.click(toolbar(page).getByRole('button', { name: 'Write', exact: true }));
  await act.pause(300);
  await act.type(COSTS.instruction, 18);
  await act.click(card('Email draft').getByRole('button', { name: 'Write', exact: true }));
  await card('Email draft').getByRole('button', { name: 'Apply to draft' }).waitFor();
  await act.pause(1100);
  await act.click(card('Email draft').getByRole('button', { name: 'Make a table' }));
  await card('Email draft').getByText('In-store displays').waitFor();
  await act.pause(1200);
  await act.click(card('Email draft').getByRole('button', { name: 'Add a chart' }));
  await card('Email draft').getByText('Rollout costs', { exact: true }).waitFor();
  await act.pause(800);
  // Scroll the preview slowly until the chart is visible.
  await card('Email draft')
    .locator('.ew-rich-preview__paper')
    .evaluate((paper) => paper.scrollTo({ top: paper.scrollHeight, behavior: 'smooth' }));
  await act.pause(2000);
  await act.click(card('Email draft').getByRole('button', { name: 'Apply to draft' }), { duration: 800 });
  await act.pause(1200);
  await act.caption('No email is sent. The final check is yours.');
  await act.moveTo(page.locator('.compose__send'), 1200);
  await act.pause(2600);

  await act.caption(null);
  await act.card(endCard(await iconDataUri()));
  await act.pause(4000);
}

export async function recordVideo(output) {
  const server = await startServer();
  const { context } = await launch({
    viewport: VIEWPORT,
    scale: OUTPUT.width / VIEWPORT.width,
    responses: RESPONSES,
    delayMs: 1100,
  });
  try {
    const page = await context.newPage();
    const icon = await iconDataUri();
    await page.addInitScript(installOverlay, { icon, backdrop: BACKDROP, font: FONT });
    await openMailbox(page, server.origin);
    await page.evaluate((html) => window.demoOverlay.card(html), titleCard(icon));
    await page.waitForTimeout(800);
    const stop = await startRecording(page);
    await play(page, director(page));
    await encode(await stop(), output);
  } finally {
    await context.close();
    await server.close();
  }
}
