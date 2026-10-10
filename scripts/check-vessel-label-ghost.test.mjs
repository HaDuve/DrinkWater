/**
 * Public contract for the vessel ghost screenshot checker.
 * Run: node scripts/check-vessel-label-ghost.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = join(__dirname, 'check-vessel-label-ghost.py');
const fixtures = join(__dirname, 'fixtures');

function runChecker(imagePath) {
  return spawnSync('python3', [script, imagePath], { encoding: 'utf8' });
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

// Minimal PNG (1x1 black) via zlib-free hand-rolled IHDR+IDAT is painful;
// use Pillow through python one-liner to write a blank RGB image.
function writeBlankPng(path) {
  const r = spawnSync(
    'python3',
    ['-c', `from PIL import Image; Image.new("RGB",(400,800),(0,0,0)).save(${JSON.stringify(path)})`],
    { encoding: 'utf8' },
  );
  assert(r.status === 0, `could not write blank png: ${r.stderr}`);
}

const dir = mkdtempSync(join(tmpdir(), 'vessel-ghost-'));
const blank = join(dir, 'blank.png');
try {
  writeBlankPng(blank);

  const blankResult = runChecker(blank);
  assert(
    blankResult.status === 1,
    `blank screenshot must exit 1 (got ${blankResult.status}): ${blankResult.stdout}${blankResult.stderr}`,
  );
  assert(
    /FAIL/i.test(blankResult.stdout + blankResult.stderr),
    `blank screenshot must print FAIL, got: ${blankResult.stdout}${blankResult.stderr}`,
  );

  const bug = runChecker(join(fixtures, 'vessel-label-ghost-bug.png'));
  assert(bug.status === 1, `bug fixture must exit 1 (got ${bug.status}): ${bug.stdout}`);

  const clean = runChecker(join(fixtures, 'vessel-label-ghost-clean.png'));
  assert(clean.status === 0, `clean fixture must exit 0 (got ${clean.status}): ${clean.stdout}${clean.stderr}`);

  console.log('OK check-vessel-label-ghost contract');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
