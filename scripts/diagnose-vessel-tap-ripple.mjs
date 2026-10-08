#!/usr/bin/env node
/**
 * Red-capable check: tap ripples require the Skia Canvas to pass touches through
 * to the Pressable (Canvas otherwise steals hits — especially on Android with
 * @shopify/react-native-skia < 2.4.16).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = path.join(root, 'src/components/water-liquid-vessel.tsx');
const src = fs.readFileSync(srcPath, 'utf8');

const issues = [];

const canvasTags = [...src.matchAll(/<Canvas\b([^>]*)>/g)].map((m) => m[1]);
if (!canvasTags.length) issues.push('NO_CANVAS');
for (const attrs of canvasTags) {
  if (!/pointerEvents\s*=\s*["']none["']/.test(attrs)) {
    issues.push('CANVAS_CAPTURES_TOUCHES');
  }
}

const hasNoneWrapper =
  /pointerEvents\s*=\s*["']none["'][\s\S]{0,160}<Canvas\b/.test(src);
if (!hasNoneWrapper) issues.push('NO_NONE_WRAPPER_AROUND_CANVAS');

if (!/onPressIn\s*=\s*\{handlePressIn\}/.test(src)) issues.push('NO_PRESS_HANDLER');
if (!/tapAge/.test(src) || !/tapOrigin/.test(src)) issues.push('NO_TAP_UNIFORMS');

if (issues.length) {
  console.log(`RED ${issues.join(',')}`);
  process.exit(1);
}

console.log('GREEN ok');
