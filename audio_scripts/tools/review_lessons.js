#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VERSION = 'apush-meta-ui-script-review-v1';
const AUDIO_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(AUDIO_ROOT, '..');
const DEFAULT_LIB_DIR = process.env.APUSH_LLM_LIB_DIR ||
  'C:\\Users\\munis\\projects\\sat_question_runner\\new_eng_qs\\lib';
const DEFAULT_COOKIE = process.env.META_COOKIE_FILE ||
  'C:\\Users\\munis\\projects\\sat_question_runner\\new_eng_qs\\config\\meta_cookies\\ramsham21.json';

const REVIEW_CONTRACT = `You are an independent senior AP United States History audio-script editor.
Review the attached lesson script, not the reference packet. Do not rewrite the whole script.
Inspect every substantive claim and repeated writing pattern. Confident prose is not proof.

Audit these categories:
1. grammar: grammar, spelling, punctuation, malformed sentences, unclear antecedents, awkward speech;
2. ai_slop: canned hooks, synthetic enthusiasm, repetitive contrast formulas, forced triplets,
   choppy fragments, fake quotations, repetitive cadence, over-signposting, recap bloat, and prose
   that sounds generated rather than spoken by a skilled human teacher;
3. fact: names, dates, chronology, geography, laws, court cases, elections, causation, quotation
   accuracy, APUSH period alignment, and meaningful omissions that make a claim misleading;
4. exaggeration: absolutes, inflated novelty or importance, monocausal history, presentism, false
   certainty, and rhetoric stronger than the evidence supports.

Use the attached local review context, but do not treat it as an infallible answer key. Never invent
a citation. If a fact needs outside verification, classify it as verify rather than declaring it false.
Quote the exact shortest relevant passage from the lesson.

Return JSON only, without Markdown fences, using exactly this top-level shape:
{
  "verdict": "pass|revise|block",
  "summary": "brief overall assessment",
  "scores": {"grammar": 0, "ai_slop": 0, "factual_accuracy": 0, "exaggeration_control": 0},
  "findings": [{
    "category": "grammar|ai_slop|fact|exaggeration|completeness",
    "severity": "blocker|major|minor|info|verify",
    "quote": "exact lesson excerpt",
    "problem": "specific explanation",
    "suggested_fix": "localized correction or editorial direction",
    "confidence": 0.0
  }]
}
Scores are integers from 0 (unacceptable) to 5 (excellent). An empty findings array is allowed only
when the lesson genuinely passes.`;

function usage() {
  return `Usage:
  node audio_scripts/tools/review_lessons.js --unit 3 --pattern "*lesson*.md"
  node audio_scripts/tools/review_lessons.js --unit 3 --pattern "*script*.md" --limit 1
  node audio_scripts/tools/review_lessons.js --file audio_scripts/unit3/example.md

Options:
  --unit N                 Select audio_scripts/unitN (repeatable)
  --all-units              Select every unit<number> directory
  --pattern GLOB           Filename glob; default: *lesson*.md (repeatable)
  --file PATH              Explicit Markdown file (repeatable)
  --lib-dir PATH           Directory containing the existing meta.js adapter
  --meta-cookie PATH       Meta AI browser cookie file
  --browser NAME           Playwright channel: chrome or msedge (default: chrome)
  --output-dir PATH        Default: audio_scripts/_reviews
  --timeout-sec N          Meta response timeout (default: 1200)
  --limit N                Review at most N selected files
  --force                  Ignore cached responses
  --headless               Launch Meta headless (headed is safer)
  --keep-browser-on-error  Pause with a failed Meta page open for inspection
  --skip-gates             Skip apush-script-gates.py
  --dry-run                Print selection without opening Meta
  --help                    Show this help`;
}

function parseArgs(argv) {
  const out = {
    units: [], patterns: [], files: [], libDir: DEFAULT_LIB_DIR,
    metaCookie: DEFAULT_COOKIE, browser: 'chrome',
    outputDir: path.join(AUDIO_ROOT, '_reviews'), timeoutSec: 1200,
    limit: null, force: false, headless: false, keepBrowserOnError: false,
    runGates: true, dryRun: false, allUnits: false, help: false,
  };
  const take = (i, flag) => {
    if (i + 1 >= argv.length) throw new Error(`${flag} requires a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--unit') out.units.push(Number(take(i++, arg)));
    else if (arg === '--pattern') out.patterns.push(take(i++, arg));
    else if (arg === '--file') out.files.push(take(i++, arg));
    else if (arg === '--lib-dir') out.libDir = path.resolve(take(i++, arg));
    else if (arg === '--meta-cookie') out.metaCookie = path.resolve(take(i++, arg));
    else if (arg === '--browser') {
      const browser = take(i++, arg);
      out.browser = browser === 'edge' ? 'msedge' : browser;
    }
    else if (arg === '--output-dir') out.outputDir = path.resolve(take(i++, arg));
    else if (arg === '--timeout-sec') out.timeoutSec = Number(take(i++, arg));
    else if (arg === '--limit') out.limit = Number(take(i++, arg));
    else if (arg === '--force') out.force = true;
    else if (arg === '--headless') out.headless = true;
    else if (arg === '--keep-browser-on-error') out.keepBrowserOnError = true;
    else if (arg === '--skip-gates') out.runGates = false;
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--all-units') out.allUnits = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!out.patterns.length) out.patterns = ['*lesson*.md'];
  if (out.units.some(x => !Number.isInteger(x) || x < 1 || x > 99)) throw new Error('--unit must be an integer from 1 to 99');
  if (!['chrome', 'msedge'].includes(out.browser)) throw new Error('--browser must be chrome, edge, or msedge');
  if (!Number.isFinite(out.timeoutSec) || out.timeoutSec < 10) throw new Error('--timeout-sec must be at least 10');
  if (out.limit !== null && (!Number.isInteger(out.limit) || out.limit < 1)) throw new Error('--limit must be a positive integer');
  return out;
}

function globRegex(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

function selectFiles(options) {
  const selected = new Set();
  for (const value of options.files) {
    const file = path.resolve(value);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`input file not found: ${file}`);
    if (!/\.md$/i.test(file)) throw new Error(`input is not Markdown: ${file}`);
    selected.add(file);
  }
  let units = [...options.units];
  if (options.allUnits) {
    units = fs.readdirSync(AUDIO_ROOT, { withFileTypes: true })
      .filter(x => x.isDirectory() && /^unit\d+$/i.test(x.name))
      .map(x => Number(x.name.match(/\d+/)[0]));
  }
  const patterns = options.patterns.map(globRegex);
  for (const unit of [...new Set(units)].sort((a, b) => a - b)) {
    const dir = path.join(AUDIO_ROOT, `unit${unit}`);
    if (!fs.existsSync(dir)) throw new Error(`unit directory not found: ${dir}`);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && patterns.some(rx => rx.test(entry.name))) selected.add(path.join(dir, entry.name));
    }
  }
  let files = [...selected].sort((a, b) => a.localeCompare(b));
  if (options.limit !== null) files = files.slice(0, options.limit);
  return files;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, value, 'utf8');
  fs.renameSync(temp, file);
}

function atomicJson(file, value) {
  atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}

function validateReview(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('review must be a JSON object');
  if (!['pass', 'revise', 'block'].includes(value.verdict)) throw new Error('review.verdict must be pass, revise, or block');
  if (typeof value.summary !== 'string' || !value.summary.trim()) throw new Error('review.summary must be non-empty');
  if (!value.scores || typeof value.scores !== 'object') throw new Error('review.scores must be an object');
  for (const key of ['grammar', 'ai_slop', 'factual_accuracy', 'exaggeration_control']) {
    if (!Number.isInteger(value.scores[key]) || value.scores[key] < 0 || value.scores[key] > 5) {
      throw new Error(`review.scores.${key} must be an integer from 0 to 5`);
    }
  }
  if (!Array.isArray(value.findings)) throw new Error('review.findings must be an array');
  const categories = new Set(['grammar', 'ai_slop', 'fact', 'exaggeration', 'completeness']);
  const severities = new Set(['blocker', 'major', 'minor', 'info', 'verify']);
  value.findings.forEach((finding, index) => {
    if (!finding || typeof finding !== 'object') throw new Error(`finding ${index} must be an object`);
    if (!categories.has(finding.category)) throw new Error(`finding ${index} has invalid category`);
    if (!severities.has(finding.severity)) throw new Error(`finding ${index} has invalid severity`);
    for (const key of ['quote', 'problem', 'suggested_fix']) {
      if (typeof finding[key] !== 'string') throw new Error(`finding ${index}.${key} must be a string`);
    }
    if (typeof finding.confidence !== 'number' || finding.confidence < 0 || finding.confidence > 1) {
      throw new Error(`finding ${index}.confidence must be from 0 to 1`);
    }
  });
  return value;
}

function extractJson(text) {
  const raw = String(text || '').trim();
  const candidates = [raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')];
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) candidates.push(raw.slice(first, last + 1));
  let error = null;
  for (const candidate of candidates) {
    try { return validateReview(JSON.parse(candidate)); } catch (value) { error = value; }
  }
  throw new Error(`Meta returned invalid review JSON: ${error ? error.message : 'no JSON object'}`);
}

function extractRuntimeMinutes(content) {
  const patterns = [
    /=\s*(\d+(?:\.\d+)?)\s*min(?:ute)?s?\b/i,
    /\b(\d+(?:\.\d+)?)\s*min(?:ute)?s?\s+experienced\b/i,
    /\bruntime\s*[:=]\s*(\d+(?:\.\d+)?)\s*min/i,
  ];
  for (const pattern of patterns) {
    const match = String(content).match(pattern);
    if (match && Number(match[1]) > 0) return Number(match[1]);
  }
  return null;
}

function gateReport(file, content) {
  const gate = path.join(AUDIO_ROOT, 'apush-script-gates.py');
  if (!fs.existsSync(gate)) return { status: 'not_found', output: '' };
  const minutes = extractRuntimeMinutes(content);
  if (minutes === null) {
    return { status: 'skipped_runtime_unknown', output: 'No numeric experienced-runtime declaration was found; deterministic pacing gates were not run.' };
  }
  const result = spawnSync(process.env.PYTHON || 'python', [gate, file, '--minutes', String(minutes)],
    { cwd: AUDIO_ROOT, encoding: 'utf8', timeout: 120000 });
  if (result.error) return { status: 'error', output: result.error.message };
  return { status: result.status === 0 ? 'pass' : 'fail', exit_code: result.status,
    runtime_minutes: minutes,
    output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim() };
}

function words(value) {
  return new Set((String(value).toLowerCase().match(/[a-z][a-z'-]{3,}/g) || [])
    .filter(word => !new Set(['that', 'this', 'with', 'from', 'have', 'were', 'what', 'when', 'they', 'their', 'about']).has(word)));
}

function referencePacket(file, content, gates) {
  const guidelinePath = path.join(AUDIO_ROOT, 'apush-final-guidelines.md');
  const registryPath = path.join(AUDIO_ROOT, 'apush-fact-registry.yaml');
  const guidelines = fs.existsSync(guidelinePath) ? fs.readFileSync(guidelinePath, 'utf8') : '';
  const registry = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';
  const unitMatch = file.match(/[\\/]unit(\d+)[\\/]/i);
  const unit = unitMatch ? unitMatch[1] : null;
  const query = words(content);
  const entries = registry.split(/\r?\n(?=- id:\s)/).filter(x => /^- id:/m.test(x));
  const ranked = entries.map(entry => {
    const entryWords = words(entry);
    let score = 0;
    for (const word of query) if (entryWords.has(word)) score++;
    if (unit && new RegExp(`^- id:\\s*F-U${unit}-`, 'm').test(entry)) score += 25;
    return { entry, score };
  }).filter(x => x.score > 2).sort((a, b) => b.score - a.score);
  const selected = [];
  let used = 0;
  for (const item of ranked) {
    if (selected.length >= 35 || used + item.entry.length > 50000) break;
    selected.push(item.entry.trim());
    used += item.entry.length;
  }
  return `# Local review context (not the lesson)\n\n` +
    `## Deterministic gate output\n\n\`\`\`text\n${gates.output || gates.status}\n\`\`\`\n\n` +
    `## Editorial guidelines\n\n${guidelines}\n\n` +
    `## Relevant fact-registry entries (${selected.length})\n\n${selected.join('\n\n')}\n`;
}

function metaPrompt(file, gates) {
  return `${REVIEW_CONTRACT}\n\nThe lesson to review is the attachment named ${path.basename(file)}. ` +
    `The attachment named review-context.md contains supporting local rules and selected facts; ` +
    `do not review it as lesson prose. The deterministic gate status is ${gates.status}.`;
}

function reportMarkdown(source, hash, gates, review) {
  const lines = [`# Meta UI review: ${path.basename(source)}`, '', `- Source: \`${source}\``,
    `- SHA-256: \`${hash}\``, `- Deterministic gates: **${gates.status}**`,
    `- Verdict: **${review.verdict}**`, '', review.summary, '',
    `Scores — grammar ${review.scores.grammar}/5; AI-slop ${review.scores.ai_slop}/5; ` +
    `facts ${review.scores.factual_accuracy}/5; exaggeration control ${review.scores.exaggeration_control}/5.`, ''];
  if (!review.findings.length) lines.push('_No findings._', '');
  review.findings.forEach((finding, index) => {
    lines.push(`## ${index + 1}. ${finding.severity.toUpperCase()} · ${finding.category}`, '',
      `> ${finding.quote || '(no quote)'}`, '', finding.problem, '',
      `Suggested fix: ${finding.suggested_fix}`, '', `Confidence: ${finding.confidence}`, '');
  });
  return `${lines.join('\n')}\n`;
}

function sharedMeta(options) {
  const file = path.join(options.libDir, 'meta.js');
  if (!fs.existsSync(file)) throw new Error(`shared Meta UI library not found: ${file}`);
  return require(file);
}

function playwrightModule(options) {
  const candidates = [path.resolve(options.libDir, '..', 'node_modules', 'playwright'),
    'C:\\Users\\munis\\projects\\1600\\node_modules\\playwright'];
  for (const candidate of candidates) {
    try { return require(candidate); } catch (_) {}
  }
  throw new Error(`Playwright not found; checked: ${candidates.join(', ')}`);
}

async function pauseForInspection() {
  if (!process.stdin.isTTY) return;
  process.stdin.resume();
  await new Promise(resolve => {
    process.stdout.write('Meta failed. Inspect the browser, then press Enter to close it... ');
    process.stdin.once('data', resolve);
  });
  process.stdin.pause();
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) { console.log(usage()); return 0; }
  const files = selectFiles(options);
  if (!files.length) throw new Error(`no files matched ${options.patterns.join(', ')}; current files generally use --pattern "*script*.md"`);
  console.log(`[select] ${files.length} lesson file(s)`);
  files.forEach(file => console.log(`  ${path.relative(REPO_ROOT, file)}`));
  if (options.dryRun) return 0;
  if (!fs.existsSync(options.metaCookie)) throw new Error(`Meta cookie file not found: ${options.metaCookie}`);

  const meta = sharedMeta(options);
  const { chromium } = playwrightModule(options);
  const browser = await chromium.launch({ channel: options.browser, headless: options.headless,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
  const run = { version: VERSION, started_at: new Date().toISOString(), files: [], errors: 0 };
  try {
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const content = fs.readFileSync(file, 'utf8');
      const gates = options.runGates ? gateReport(file, content) : { status: 'skipped', output: '' };
      const hash = sha256(`${VERSION}\0${content}\0${JSON.stringify(gates)}`);
      const relative = path.relative(AUDIO_ROOT, file);
      const output = path.join(options.outputDir, path.dirname(relative),
        path.basename(file, path.extname(file)), hash.slice(0, 12));
      fs.mkdirSync(output, { recursive: true });
      atomicJson(path.join(output, 'gates.json'), gates);
      const contextFile = path.join(output, 'review-context.md');
      atomicWrite(contextFile, referencePacket(file, content, gates));
      const cache = path.join(output, 'meta.json');
      console.log(`[${index + 1}/${files.length}] ${relative} (gates=${gates.status})`);
      let result;
      if (!options.force && fs.existsSync(cache)) {
        const review = validateReview(JSON.parse(fs.readFileSync(cache, 'utf8')));
        result = { review, cached: true };
        console.log(`  [meta] cached ${review.verdict}, ${review.findings.length} finding(s)`);
      } else {
        let page = null;
        try {
          page = await meta.createSession(context, { cookies: options.metaCookie, downloads: output });
          const response = await meta.send(page, metaPrompt(file, gates), output,
            `review-${path.basename(file, '.md')}`,
            { attachments: [file, contextFile], timeoutMs: options.timeoutSec * 1000 });
          atomicWrite(path.join(output, 'meta.raw.md'), `${response.text}\n`);
          const review = extractJson(response.text);
          atomicJson(cache, review);
          result = { review, model_mode: response.modelMode };
          console.log(`  [meta] ${review.verdict}, ${review.findings.length} finding(s)`);
        } catch (error) {
          result = { error: error.message };
          run.errors++;
          atomicJson(path.join(output, 'meta.error.json'), { error: error.message, stack: error.stack,
            page_url: page ? page.url() : null });
          console.error(`  [meta] ERROR: ${error.message}`);
          if (options.keepBrowserOnError && page) await pauseForInspection();
        } finally {
          if (page) await page.close().catch(() => {});
        }
      }
      if (result.review) {
        atomicWrite(path.join(output, 'report.md'), reportMarkdown(relative, sha256(content), gates, result.review));
      }
      atomicJson(path.join(output, 'result.json'), { version: VERSION, source_file: relative,
        source_sha256: sha256(content), deterministic_gates: gates, meta: result });
      run.files.push({ source_file: relative, output_dir: path.relative(REPO_ROOT, output),
        status: result.error ? 'error' : result.review.verdict });
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  run.completed_at = new Date().toISOString();
  fs.mkdirSync(options.outputDir, { recursive: true });
  atomicJson(path.join(options.outputDir, 'latest-run.json'), run);
  console.log(`[done] ${run.files.length} file(s), ${run.errors} error(s); ${options.outputDir}`);
  return run.errors ? 2 : 0;
}

if (require.main === module) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { REVIEW_CONTRACT, extractJson, extractRuntimeMinutes, globRegex, parseArgs, referencePacket,
  reportMarkdown, selectFiles, validateReview };
