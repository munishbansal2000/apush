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
  const libDir = process.env.APUSH_LLM_LIB_DIR || value('lib-dir');
  const cookie = process.env.META_COOKIE_FILE || value('cookie');
  if (!libDir) throw new Error('Meta UI adapter dir missing: set meta.libDir in data/pipeline.json or APUSH_LLM_LIB_DIR');
  if (!cookie) throw new Error('Meta UI cookie missing: set meta.cookieFile in data/pipeline.json or META_COOKIE_FILE');
  const metaFile = path.join(libDir, 'meta.js');
  if (!fs.existsSync(metaFile)) throw new Error(`Meta UI adapter missing: ${metaFile}`);
  if (!fs.existsSync(cookie)) throw new Error(`Meta UI cookie missing: ${cookie}`);
  const meta = require(metaFile);
  let playwright;
  for (const candidate of [path.resolve(libDir, '..', 'node_modules', 'playwright'), ...values('playwright-dir')]) {
    try { playwright = require(candidate); break; } catch {}
  }
  if (!playwright) throw new Error('Playwright not found beside the Meta UI adapter or in meta.playwrightDirs (data/pipeline.json)');
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
        // A review patch is applied onto <out>.draft.json: never leave one from an earlier attempt or run.
        fs.rmSync(`${outStem}.draft.json`, {force: true});
        const response = await meta.send(page, prompt, debugDir, `${path.basename(out, '.json')}-draft-attempt-${attempt}`, {
          attachments, timeoutMs: Number(value('timeout-sec', '1200')) * 1000,
        });
        atomicWrite(`${outStem}.draft.raw.md`, `${response.text}\n`);
        atomicWrite(`${outStem}.draft.raw.attempt-${attempt}.md`, `${response.text}\n`);
        let parsed;
        let effectiveFollowup = followupPrompt;
        try {
          parsed = extractJson(response.text);
          atomicWrite(`${outStem}.draft.json`, `${JSON.stringify(parsed, null, 2)}\n`);
        } catch (error) {
          // A response can be marked complete by Meta even when generation hit
          // its output ceiling and stopped before closing the JSON. Repair it in
          // the same chat, where the model still has the full prompt and draft,
          // instead of immediately repeating the expensive request from scratch.
          // This replaces any review follow-up: a review may answer with a patch, and a patch needs a parsed draft.
          effectiveFollowup = `Your previous response is not valid JSON (${error.message}). Repair that exact response in this same chat; do not redo the research or planning. Return the COMPLETE corrected JSON object again. Preserve all required content, but make it compact: omit whitespace, redundant entries, optional empty arrays, and optional empty objects. Return JSON only, with every property name double-quoted and every array and object closed. Do not explain the repair.`;
          console.warn(`[meta-ui] draft is not valid JSON; requesting a compact same-chat repair: ${error.message}`);
        }
        if (effectiveFollowup) {
          console.log(`[meta-ui] draft received; starting same-chat ${parsed && followupPrompt ? 'director audit' : 'JSON repair'}`);
          const reviewed = await meta.send(page, effectiveFollowup, debugDir, `${path.basename(out, '.json')}-review-attempt-${attempt}`, {
            attachments: [], timeoutMs: Number(value('timeout-sec', '1200')) * 1000,
          });
          atomicWrite(`${outStem}.review.raw.md`, `${reviewed.text}\n`);
          atomicWrite(`${outStem}.review.raw.attempt-${attempt}.md`, `${reviewed.text}\n`);
          let candidateText = reviewed.text;
          const sameChatRepairs = Math.max(0, Number(value('same-chat-repairs', process.env.META_SAME_CHAT_REPAIRS || '2')) || 0);
          for (let repair = 0; ; repair++) {
            try {
              parsed = extractJson(candidateText);
              break;
            } catch (error) {
              if (repair >= sameChatRepairs) throw error;
              const repairNumber = repair + 1;
              console.warn(`[meta-ui] same-chat response is still invalid JSON; repair ${repairNumber}/${sameChatRepairs}: ${error.message}`);
              const repairPrompt = `The response you just returned is still not valid JSON: ${error.message}\n\nFix ONLY its JSON syntax in this same chat. Do not repeat the research or reasoning. Return the complete compact JSON object from the opening { through the closing }. No markdown, commentary, citations, or text outside the object. Verify every property name uses double quotes and every array/object is closed before sending.`;
              const repaired = await meta.send(page, repairPrompt, debugDir, `${path.basename(out, '.json')}-json-repair-${repairNumber}-attempt-${attempt}`, {
                attachments: [], timeoutMs: Number(value('timeout-sec', '1200')) * 1000,
              });
              candidateText = repaired.text;
              atomicWrite(`${outStem}.json-repair-${repairNumber}.raw.md`, `${candidateText}\n`);
              atomicWrite(`${outStem}.json-repair-${repairNumber}.raw.attempt-${attempt}.md`, `${candidateText}\n`);
            }
          }
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
