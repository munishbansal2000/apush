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
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function atomicWrite(file, text) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(temp, text, {encoding: 'utf8', flush: true});
    fs.renameSync(temp, file);
  } catch (error) {
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
    throw error;
  }
}

async function main() {
  const promptFile = value('prompt-file');
  const followupPromptFile = value('followup-prompt-file');
  const out = value('out');
  if (!promptFile || !out) throw new Error('usage: meta-ui-runner.cjs --prompt-file FILE --out FILE [--followup-prompt-file FILE] [--attachment FILE]');
  const outStem = out.replace(/\.json$/i, '');
  const libDir = value('lib-dir', process.env.APUSH_LLM_LIB_DIR || 'C:\\Users\\munis\\projects\\sat_question_runner\\new_eng_qs\\lib');
  const cookie = value('cookie', process.env.META_COOKIE_FILE || 'C:\\Users\\munis\\projects\\sat_question_runner\\new_eng_qs\\config\\meta_cookies\\ramsham21.json');
  const metaFile = path.join(libDir, 'meta.js');
  if (!fs.existsSync(metaFile)) throw new Error(`Meta UI adapter missing: ${metaFile}`);
  if (!fs.existsSync(cookie)) throw new Error(`Meta UI cookie missing: ${cookie}`);
  const meta = require(metaFile);
  let playwright;
  for (const candidate of [path.resolve(libDir, '..', 'node_modules', 'playwright'), 'C:\\Users\\munis\\projects\\1600\\node_modules\\playwright']) {
    try { playwright = require(candidate); break; } catch {}
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
    const prompt = fs.readFileSync(promptFile, 'utf8');
    const followupPrompt = followupPromptFile ? fs.readFileSync(followupPromptFile, 'utf8') : null;
    const attachments = values('attachment');
    for (const attachment of attachments) if (!fs.existsSync(attachment)) throw new Error(`Meta attachment missing: ${attachment}`);
    if (attachments.length) console.log(`[meta-ui] attachments: ${attachments.map(file => path.basename(file)).join(', ')}`);
    const attempts = Math.max(1, Number(value('attempts', process.env.META_ATTEMPTS || '3')) || 3);
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      let page;
      try {
        // A failed upload/composer interaction can leave the page in a dirty
        // state. Each retry gets a fresh chat page in the authenticated context.
        page = await meta.createSession(context, {cookies: cookie, downloads: debugDir});
        const response = await meta.send(page, prompt, debugDir, `${path.basename(out, '.json')}-draft-attempt-${attempt}`, {
          attachments, timeoutMs: Number(value('timeout-sec', '1200')) * 1000,
        });
        atomicWrite(`${outStem}.draft.raw.md`, `${response.text}\n`);
        atomicWrite(`${outStem}.draft.raw.attempt-${attempt}.md`, `${response.text}\n`);
        let parsed;
        try {
          parsed = extractJson(response.text);
          atomicWrite(`${outStem}.draft.json`, `${JSON.stringify(parsed, null, 2)}\n`);
        } catch (error) {
          if (!followupPrompt) throw error;
          // The second same-chat turn is specifically allowed to repair and
          // reformat a malformed draft. Preserve the raw draft and continue.
          console.warn(`[meta-ui] draft is not valid JSON; passing it to the same-chat reviewer: ${error.message}`);
        }
        if (followupPrompt) {
          console.log('[meta-ui] draft received; starting same-chat director audit');
          const reviewed = await meta.send(page, followupPrompt, debugDir, `${path.basename(out, '.json')}-review-attempt-${attempt}`, {
            attachments: [], timeoutMs: Number(value('timeout-sec', '1200')) * 1000,
          });
          atomicWrite(`${outStem}.review.raw.md`, `${reviewed.text}\n`);
          atomicWrite(`${outStem}.review.raw.attempt-${attempt}.md`, `${reviewed.text}\n`);
          parsed = extractJson(reviewed.text);
        }
        atomicWrite(out, `${JSON.stringify(parsed, null, 2)}\n`);
        if (attempt > 1) console.log(`[meta-ui] valid JSON received on attempt ${attempt}/${attempts}`);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        console.error(`[meta-ui] attempt ${attempt}/${attempts} failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        if (page) await page.close().catch(() => {});
      }
      if (attempt < attempts) await sleep(Math.min(2000 * attempt, 5000));
    }
    if (lastError) throw lastError;
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error.stack || error.message); process.exit(1); });
