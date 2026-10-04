#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

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
  const html = process.argv[2];
  const screenshot = process.argv[3];
  if (!html || !fs.existsSync(html)) throw new Error('usage: check_render.js HTML [SCREENSHOT]');
  const executablePath = fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
    ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
    : undefined;
  const browser = await chromiumModule().launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', request => failedRequests.push(`${request.url()}: ${request.failure()?.errorText || 'failed'}`));
    await page.goto(pathToFileURL(path.resolve(html)).href, { waitUntil: 'load', timeout: 120000 });
    const imageCount = await page.locator('img').count();
    for (let i = 0; i < imageCount; i += 1) {
      await page.locator('img').nth(i).scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    const dom = await page.evaluate(() => ({
      cards: document.querySelectorAll('article').length,
      images: [...document.images].map(img => ({ src: img.getAttribute('src'), width: img.naturalWidth, height: img.naturalHeight, complete: img.complete })),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      emptyPrompts: [...document.querySelectorAll('article h2')].filter(x => !x.textContent.trim()).length,
    }));
    if (screenshot) await page.screenshot({ path: path.resolve(screenshot), fullPage: false });
    const brokenImages = dom.images.filter(x => !x.complete || !x.width || !x.height);
    const { images, ...summary } = dom;
    process.stdout.write(JSON.stringify({ ok: !brokenImages.length && !dom.horizontalOverflow && !dom.emptyPrompts && !failedRequests.length && !consoleErrors.length, ...summary, imageCount: images.length, brokenImages, failedRequests, consoleErrors }));
  } finally {
    await browser.close();
  }
}

main().catch(error => { process.stderr.write(`ERROR: ${error.stack || error.message}\n`); process.exit(1); });
