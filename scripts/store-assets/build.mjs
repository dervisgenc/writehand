// Generates the store assets: icons, captioned screenshots, promo tiles and the promo
// video. The extension's demo build runs in the demo mailbox with a fake helper app;
// nothing connects to a real account or to an AI.
//
// Usage: pnpm store:assets [icons] [addin-icons] [screenshots] [promo] [video] [--scene=01-reply]
// Without a step, everything is generated. Output goes under store/. The video needs
// ffmpeg (libx264) on PATH; if it lives elsewhere, point the FFMPEG environment variable to it.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { chromium } from '@playwright/test';

import {
  browserViewport,
  marqueeTile,
  screenshotFrame,
  SIZES,
  smallPromoTile,
  socialPreview,
  videoThumbnail,
} from './frames.mjs';
import { ADDIN_OUTPUTS, iconDataUri, renderIcons } from './icons.mjs';
import { launch, ROOT, startServer, STORE_DIR, WORK_DIR } from './harness.mjs';
import { openScene, SCENES } from './scenes.mjs';
import { RESPONSES } from './story.mjs';
import { recordVideo } from './video.mjs';

const STEPS = ['icons', 'addin-icons', 'screenshots', 'promo', 'video'];
const RAW_DIR = resolve(WORK_DIR, 'raw');
const SCREENSHOT_DIR = resolve(STORE_DIR, 'screenshots/en');
const PROMO_DIR = resolve(STORE_DIR, 'promo');

/** Crop shown in the promo images: the reply draft in the reading pane and the result card (CSS pixels). */
const PROMO_SHOT = { scene: '01-reply', crop: { x: 404, y: 100, width: 876, height: 675 } };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { scene: { type: 'string', multiple: true } },
});
const steps = positionals.length === 0 ? STEPS : positionals;
for (const step of steps) {
  if (!STEPS.includes(step)) throw new Error(`Unknown step "${step}". Steps: ${STEPS.join(', ')}`);
}

const pngDataUri = async (path) => `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
const short = (path) => path.slice(ROOT.length + 1);

/** Renders an HTML template to a PNG at its exact pixel size. */
async function renderHtml(browser, html, size, path) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path });
  await page.close();
  console.log(`✓ ${short(path)}`);
}

function buildDemoExtension() {
  // The demo build uses the real AI connection and supports the local mailbox address.
  const extension = resolve(ROOT, 'apps/browser-extension');
  execFileSync(
    resolve(extension, 'node_modules/.bin/wxt'),
    ['build', '-b', 'chrome', '--mv3', '--mode', 'demo'],
    {
      cwd: extension,
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  );
}

/** Each scene plays in a fresh browser, so emails opened by the previous scene stay out of the context. */
async function captureScenes(scenes) {
  await mkdir(RAW_DIR, { recursive: true });
  const server = await startServer();
  try {
    for (const scene of scenes) {
      const viewport = browserViewport(scene.width);
      const { context, extensionId } = await launch({ viewport, responses: RESPONSES, delayMs: 300 });
      try {
        const page = await context.newPage();
        await openScene(page, scene, { origin: server.origin, extensionId });
        try {
          await scene.run(page);
        } catch (error) {
          // The moment the scene got stuck is kept for debugging.
          await page.screenshot({ path: resolve(RAW_DIR, `${scene.name}-failed.png`) });
          throw error;
        }
        await page.screenshot({ path: resolve(RAW_DIR, `${scene.name}.png`) });
      } finally {
        await context.close();
      }
    }
  } finally {
    await server.close();
  }
}

async function frameScreenshots(browser, scenes) {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  for (const scene of scenes) {
    const image = await pngDataUri(resolve(RAW_DIR, `${scene.name}.png`));
    await renderHtml(
      browser,
      screenshotFrame({ ...scene.caption, image }),
      SIZES.screenshot,
      resolve(SCREENSHOT_DIR, `${scene.name}.png`),
    );
  }
}

async function renderPromo(browser) {
  await mkdir(PROMO_DIR, { recursive: true });
  const icon = await iconDataUri();
  const shot = {
    icon,
    image: await pngDataUri(resolve(RAW_DIR, `${PROMO_SHOT.scene}.png`)),
    crop: PROMO_SHOT.crop,
  };
  await renderHtml(
    browser,
    smallPromoTile({ icon }),
    SIZES.smallPromo,
    resolve(PROMO_DIR, 'small-promo-440x280.png'),
  );
  await renderHtml(browser, marqueeTile(shot), SIZES.marquee, resolve(PROMO_DIR, 'marquee-1400x560.png'));
  await renderHtml(
    browser,
    socialPreview(shot),
    SIZES.social,
    resolve(PROMO_DIR, 'social-preview-1280x640.png'),
  );
  await renderHtml(
    browser,
    videoThumbnail(shot),
    SIZES.videoThumbnail,
    resolve(PROMO_DIR, 'video-thumbnail-1280x720.png'),
  );
}

const scenes =
  values.scene === undefined ? SCENES : SCENES.filter((scene) => values.scene.includes(scene.name));
const browser = await chromium.launch();
try {
  if (steps.includes('icons')) {
    for (const path of await renderIcons(browser)) console.log(`✓ ${short(path)}`);
  } else if (steps.includes('addin-icons')) {
    for (const path of await renderIcons(browser, ADDIN_OUTPUTS)) console.log(`✓ ${short(path)}`);
  }
  if (steps.some((step) => step !== 'icons' && step !== 'addin-icons')) buildDemoExtension();
  if (steps.includes('screenshots') || steps.includes('promo')) {
    const needed = steps.includes('screenshots')
      ? scenes
      : SCENES.filter((scene) => scene.name === PROMO_SHOT.scene);
    await captureScenes(needed);
  }
  if (steps.includes('screenshots')) await frameScreenshots(browser, scenes);
  if (steps.includes('promo')) await renderPromo(browser);
  if (steps.includes('video')) {
    const output = resolve(STORE_DIR, 'video/writehand-demo-en.mp4');
    await recordVideo(output);
    console.log(`✓ ${short(output)}`);
  }
} finally {
  await browser.close();
}
