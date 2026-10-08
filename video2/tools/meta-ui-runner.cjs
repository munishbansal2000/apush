#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function value(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
function values(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) if (process.argv[i] === `--${name}`) out.push(process.argv[++i]);
  return out;
}
function extractJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const source = (fenced ? fenced[1] : text).trim();
  const a = source.indexOf('{');
  const b = source.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error(`Meta UI returned no JSON object: ${source.slice(0, 300)}`);
  return JSON.parse(source.slice(a, b + 1));
}

async function main() {
  const promptFile = value('prompt-file');
  const out = value('out');
  if (!promptFile || !out) throw new Error('usage: meta-ui-runner.cjs --prompt-file FILE --out FILE [--attachment FILE]');
  const libDir = value('lib-dir', process.env.APUSH_LLM_LIB_DIR || 'C:\\Users\\munis\\projects\\sat_question_runner\\new_eng_qs\\lib');
  const cookie = value('cookie', process.env.META_COOKIE_FILE || 'C:\\Users\\munis\\projects\\sat_question_runner\\new_eng_qs\\config\\meta_cookies\\ramsham21.json');
  const metaFile = path.join(libDir, 'meta.js');
  if (!fs.existsSync(metaFile)) throw new Error(`Meta UI adapter missing: ${metaFile}`);
  if (!fs.existsSync(cookie)) throw new Error(`Meta UI cookie missing: ${cookie}`);
  const meta = require(metaFile);
  let playwright;
  for (const candidate of [path.resolve(libDir, '..', 'node_modules', 'playwright'), 'C:\\Users\\munis\\projects\\1600\\node_modules\\playwright']) {
    try { playwright = require(candidate); break; } catch (_) {}
  }
  if (!playwright) throw new Error('Playwright not found beside Meta UI adapter or in C:\\Users\\munis\\projects\\1600');
  const debugDir = path.join(path.dirname(out), 'meta-debug');
  fs.mkdirSync(debugDir, {recursive: true});
  const browser = await playwright.chromium.launch({
    channel: value('browser', process.env.META_BROWSER || 'chrome'),
    headless: process.env.META_HEADLESS === '1',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({viewport: {width: 1400, height: 950}, acceptDownloads: true});
  await context.addInitScript(() => Object.defineProperty(navigator, 'webdriver', {get: () => undefined}));
  try {
    const page = await meta.createSession(context, {cookies: cookie, downloads: debugDir});
    const response = await meta.send(page, fs.readFileSync(promptFile, 'utf8'), debugDir, path.basename(out, '.json'), {
      attachments: values('attachment'), timeoutMs: Number(value('timeout-sec', '1200')) * 1000,
    });
    fs.writeFileSync(`${out}.raw.md`, `${response.text}\n`);
    const parsed = extractJson(response.text);
    fs.mkdirSync(path.dirname(out), {recursive: true});
    fs.writeFileSync(out, `${JSON.stringify(parsed, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error.stack || error.message); process.exit(1); });
