#!/usr/bin/env node
'use strict';

// Thin media-generation adapter over the existing, battle-tested meta.js
// session/attachment code. It uploads one image, requests a duration-bounded
// animation, waits for Meta's response, clicks its Download control, and
// requires an actual MP4/WebM artifact before succeeding.
const fs = require('fs');
const path = require('path');

function args(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) throw new Error(`unexpected argument ${key}`);
    if (key === '--self-test') { out.selfTest = true; continue; }
    if (key === '--keep-open-on-failure') { out.keepOpenOnFailure = true; continue; }
    if (i + 1 >= argv.length) throw new Error(`${key} requires a value`);
    out[key.slice(2)] = argv[++i];
  }
  return out;
}

function chromiumModule() {
  for (const candidate of [
    'playwright',
    'C:/Users/munis/projects/sat_question_runner/node_modules/playwright',
    'C:/Users/munis/projects/1600/node_modules/playwright',
  ]) {
    try { return require(candidate).chromium; } catch (_) {}
  }
  throw new Error('playwright module not found');
}

async function main() {
  const options = args(process.argv);
  const libDir = options['lib-dir'] || 'C:/Users/munis/projects/sat_question_runner/new_eng_qs/lib';
  const adapterPath = path.join(libDir, 'meta.js');
  if (!fs.existsSync(adapterPath)) throw new Error(`Meta adapter not found: ${adapterPath}`);
  const adapter = require(adapterPath);
  const chromium = chromiumModule();
  if (options.selfTest) {
    process.stdout.write('Meta video bridge dependencies: ok\n');
    return;
  }
  for (const name of ['image', 'prompt', 'out', 'duration', 'cookie']) {
    if (!options[name]) throw new Error(`--${name} is required`);
  }
  if (!fs.existsSync(options.image)) throw new Error(`image not found: ${options.image}`);
  if (!fs.existsSync(options.cookie)) throw new Error(`cookie file not found: ${options.cookie}`);
  const duration = Number(options.duration);
  if (!(duration >= 3 && duration <= 10)) throw new Error('--duration must be 3..10 seconds');
  const output = path.resolve(options.out);
  const downloads = fs.mkdtempSync(path.join(path.dirname(output), '.meta-video-'));
  const executablePath = options.browser === 'edge'
    ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
    : 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({
    headless: false, executablePath,
    devtools: Boolean(options.keepOpenOnFailure),
  });
  let context;
  let page;
  let failed = null;
  try {
    context = await browser.newContext({ acceptDownloads: true });
    page = await adapter.createSession(context, {
      cookies: options.cookie, downloads,
    });
    const prompt = [
      `Animate the attached image as one ${duration}-second video.`,
      options.prompt,
      'Preserve the people, objects, composition, period details, and all visible text.',
      'Use subtle natural motion only. Do not add, remove, replace, or morph historical content.',
      'Return a downloadable video, not instructions or a written description.',
    ].join(' ');
    let result = await adapter.send(page, prompt, downloads, 'apush_video', {
      attachments: [path.resolve(options.image)],
      timeoutMs: Number(options['timeout-ms'] || 1200000),
    });
    const results = [result];
    const refusal = /(?:wasn['’]t|was not|unable|couldn['’]t|could not)\s+(?:able\s+)?to generate (?:that|the) exact animation/i;
    const refusalRetries = Math.max(0, Math.min(3,
      Number(options['refusal-retries'] === undefined ? 1 : options['refusal-retries'])));
    for (let attempt = 1; attempt <= refusalRetries; attempt += 1) {
      const alreadyHasMedia = (result.downloadedFiles || []).some(file =>
        /\.(mp4|webm|mov)$/i.test(file) && fs.existsSync(file));
      const visibleVideos = await page.locator('video').count().catch(() => 0);
      if (alreadyHasMedia || visibleVideos > 0) break;
      const pageText = await page.locator('body').innerText().catch(() => '');
      if (!refusal.test(`${result.text || ''}\n${pageText}`)) break;
      const retryPrompt = [
        'Do your best.',
        `Create the closest safe ${duration}-second animation you can from the attached historical image and my previous request.`,
        'Keep the original composition and period details. Prefer subtle camera movement and natural environmental motion.',
        'Return a downloadable video without explaining limitations.',
      ].join(' ');
      process.stdout.write(`Meta declined the exact animation; retrying (${attempt}/${refusalRetries}) with a do-your-best request.\n`);
      result = await adapter.send(page, retryPrompt, downloads,
        `apush_video_retry_${attempt}`, {
          timeoutMs: Number(options['timeout-ms'] || 1200000),
        });
      results.push(result);
    }
    const candidates = results.flatMap(item => item.downloadedFiles || []);
    for (const name of fs.readdirSync(downloads)) candidates.push(path.join(downloads, name));
    let media = candidates.find(file => /\.(mp4|webm|mov)$/i.test(file) && fs.existsSync(file));

    // Generated media is not necessarily represented as an artifact card.
    // Try page-wide video download controls after meta.js has finished its
    // response extraction.
    if (!media) {
      const selectors = [
        'button[aria-label*="download video" i]',
        'button[aria-label*="download" i]',
        'a[download]',
        'button:has-text("Download")',
        '[role="button"]:has-text("Download")',
      ];
      for (const selector of selectors) {
        const controls = page.locator(selector);
        const count = await controls.count().catch(() => 0);
        for (let i = count - 1; i >= 0 && !media; i -= 1) {
          const control = controls.nth(i);
          if (!await control.isVisible().catch(() => false)) continue;
          const event = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
          await control.click({ force: true, timeout: 5000 }).catch(() => null);
          const download = await event;
          if (!download) continue;
          const target = path.join(downloads,
            download.suggestedFilename() || `meta-video-${Date.now()}.mp4`);
          await download.saveAs(target);
          if (fs.existsSync(target) && fs.statSync(target).size > 1000) media = target;
        }
        if (media) break;
      }
    }

    // Some Meta surfaces render the result as an inline blob-backed <video>
    // without a Download control. Fetch that blob inside the page context.
    if (!media) {
      const videos = page.locator('video');
      const count = await videos.count().catch(() => 0);
      for (let i = count - 1; i >= 0 && !media; i -= 1) {
        const video = videos.nth(i);
        const src = await video.evaluate(node => node.currentSrc || node.src || '').catch(() => '');
        if (!src) continue;
        try {
          const encoded = await page.evaluate(async url => {
            const response = await fetch(url);
            const bytes = new Uint8Array(await response.arrayBuffer());
            let binary = '';
            const chunk = 0x8000;
            for (let offset = 0; offset < bytes.length; offset += chunk) {
              binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
            }
            return btoa(binary);
          }, src);
          const target = path.join(downloads, `inline-meta-video-${Date.now()}.mp4`);
          fs.writeFileSync(target, Buffer.from(encoded, 'base64'));
          if (fs.statSync(target).size > 1000) media = target;
        } catch (_) {}
      }
    }
    if (!media) throw new Error(`Meta returned no downloadable video (files: ${candidates.join(', ') || 'none'})`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(media, output);
    if (fs.statSync(output).size < 1000) throw new Error('downloaded video is suspiciously small');
    process.stdout.write(`Meta video saved: ${output}\n`);
  } catch (error) {
    failed = error;
    if (page) {
      const debugDir = path.join(path.dirname(output), `meta-video-debug-${Date.now()}`);
      fs.mkdirSync(debugDir, { recursive: true });
      await page.screenshot({ path: path.join(debugDir, 'page.png'), fullPage: true }).catch(() => {});
      const html = await page.content().catch(() => '');
      if (html) fs.writeFileSync(path.join(debugDir, 'page.html'), html, 'utf8');
      const state = await page.evaluate(() => ({
        url: location.href,
        videos: Array.from(document.querySelectorAll('video')).map(v => ({
          src: v.currentSrc || v.src || '', duration: v.duration,
          readyState: v.readyState, outerHTML: v.outerHTML.slice(0, 2000),
        })),
        downloadControls: Array.from(document.querySelectorAll('button,a,[role="button"]'))
          .filter(el => /download|save/i.test(`${el.getAttribute('aria-label') || ''} ${el.textContent || ''}`))
          .map(el => ({ tag: el.tagName, aria: el.getAttribute('aria-label'),
                       text: (el.textContent || '').trim().slice(0, 300),
                       href: el.href || '' })),
      })).catch(() => ({}));
      fs.writeFileSync(path.join(debugDir, 'state.json'), JSON.stringify(state, null, 2));
      process.stderr.write(`\nMETA VIDEO DEBUG SAVED: ${debugDir}\n`);
      process.stderr.write(`Live/manual downloads directory: ${downloads}\n`);
      process.stderr.write(`Browser URL: ${page.url()}\n`);
    }
    if (options.keepOpenOnFailure) {
      process.stderr.write('\nMETA VIDEO FAILED — browser and DevTools are being kept open for inspection.\n');
      process.stderr.write('Inspect the generated video and its controls, then press Ctrl+C in this terminal to close the browser.\n');
      await new Promise(resolve => {
        process.once('SIGINT', resolve);
        process.once('SIGTERM', resolve);
      });
    }
  } finally {
    if (context) await context.close().catch(() => {});
    await browser.close().catch(() => {});
    if (!failed) fs.rmSync(downloads, { recursive: true, force: true });
  }
  if (failed) throw failed;
}

main().catch(error => {
  process.stderr.write(`ERROR: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
