#!/usr/bin/env node
/**
 * Capture App Store screenshots on an iOS simulator at Apple-accepted pixel sizes.
 *
 * Usage:
 *   npm run screenshots              # 6.5" slot (1284×2778) — default
 *   npm run screenshots:6.9          # 6.9" slot (1320×2868)
 *   npm run screenshots:build          # build/install on target simulator, then capture
 *
 * Flags:
 *   --display 6.5 | 6.9   Target App Store Connect display class (default: 6.5)
 *   --build               Build/install app on simulator before capture
 *
 * Output: store-screenshots/{en,de}/*.png
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

/** @type {Record<'6.5' | '6.9', { devices: string[]; width: number; height: number; label: string }>} */
const DISPLAY_PRESETS = {
  '6.5': {
    // Native 1284×2778 on 12/13 Pro Max; falls back to 16/17 Pro Max + resize.
    devices: [
      'iPhone 13 Pro Max',
      'iPhone 12 Pro Max',
      'iPhone 11 Pro Max',
      'iPhone 16 Pro Max',
      'iPhone 17 Pro Max',
    ],
    width: 1284,
    height: 2778,
    label: '6.5" Display (1284×2778)',
  },
  '6.9': {
    devices: ['iPhone 16 Pro Max', 'iPhone 17 Pro Max'],
    width: 1320,
    height: 2868,
    label: '6.9" Display (1320×2868)',
  },
};

function parseDisplayArg() {
  const index = process.argv.indexOf('--display');
  const raw = index >= 0 ? process.argv[index + 1] : '6.5';
  if (raw !== '6.5' && raw !== '6.9') {
    console.error('Invalid --display value. Use 6.5 or 6.9.');
    process.exit(1);
  }
  return raw;
}

const display = parseDisplayArg();
const preset = DISPLAY_PRESETS[display];
/** @type {string} */
let DEVICE = preset.devices[0];
const SCHEME = 'drinkwater';
const BUNDLE_ID = 'de.drinkwaterreminder.app';
const OUTPUT_ROOT = 'store-screenshots';
const RENDER_WAIT_MS = 3000;
const LAUNCH_WAIT_MS = 2000;

const LOCALES = ['en', 'de'];
const SCREENS = [
  { file: '01-home', path: '/?screenshot=1' },
  { file: '02-history', path: '/history?demo=1' },
  { file: '03-settings', path: '/settings' },
];

const shouldBuild = process.argv.includes('--build');

/** @type {string | null} */
let simulatorUdid = null;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function spawn(command, args) {
  return spawnSync(command, args, { encoding: 'utf8' });
}

function runQuiet(command, args) {
  const result = spawn(command, args);
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  return (result.stdout ?? '').trim();
}

function sleep(ms) {
  return delay(ms);
}

function getDeviceInfo() {
  const lines = runQuiet('xcrun', ['simctl', 'list', 'devices', 'available', '-j']);
  const parsed = JSON.parse(lines);
  const available = new Map();
  for (const runtime of Object.values(parsed.devices)) {
    for (const device of runtime) {
      if (device.isAvailable) {
        available.set(device.name, device);
      }
    }
  }

  for (const name of preset.devices) {
    const device = available.get(name);
    if (device) {
      DEVICE = name;
      return device;
    }
  }

  throw new Error(
    `No compatible simulator found for ${preset.label}. Install one of: ${preset.devices.join(', ')}`,
  );
}

function ensureSimulatorReady() {
  const device = getDeviceInfo();
  simulatorUdid = device.udid;

  if (device.state !== 'Booted') {
    const boot = spawn('xcrun', ['simctl', 'boot', device.udid]);
    if (boot.status !== 0) {
      const message = `${boot.stderr ?? ''}${boot.stdout ?? ''}`;
      if (!message.includes('current state: Booted')) {
        console.error(message);
        process.exit(boot.status ?? 1);
      }
    }
  }

  run('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', device.udid]);
}

function simctlArgs(subcommand, ...rest) {
  if (!simulatorUdid) {
    throw new Error('Simulator UDID not set');
  }
  return ['simctl', subcommand, simulatorUdid, ...rest];
}

function prepareStatusBar() {
  run('xcrun', [
    'simctl',
    'status_bar',
    simulatorUdid,
    'override',
    '--time',
    '9:41',
    '--batteryState',
    'charged',
    '--batteryLevel',
    '100',
    '--wifiBars',
    '3',
    '--cellularBars',
    '4',
  ]);
}

function isAppInstalled() {
  const result = spawn('xcrun', simctlArgs('get_app_container', BUNDLE_ID));
  return result.status === 0;
}

function buildAndInstall() {
  console.log(`\nBuilding and installing on ${DEVICE} (Release, embedded bundle)…`);
  run(
    'npx',
    [
      'expo',
      'run:ios',
      '--device',
      DEVICE,
      '--configuration',
      'Release',
      '--no-bundler',
    ],
    {
      env: {
        ...process.env,
        CI: '1',
        EXPO_NO_DOTENV: '1',
      },
    },
  );
}

function terminateApp() {
  spawn('xcrun', simctlArgs('terminate', BUNDLE_ID));
}

function openDeepLink(path, lang) {
  const query = path.includes('?') ? `${path}&lang=${lang}` : `${path}?lang=${lang}`;
  const url = `${SCHEME}://${query.replace(/^\//, '')}`;
  run('xcrun', simctlArgs('openurl', url));
}

function capture(filePath) {
  run('xcrun', simctlArgs('io', 'screenshot', filePath));
}

function readImageSize(filePath) {
  const result = spawn('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', filePath]);
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  const width = Number(result.stdout.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const height = Number(result.stdout.match(/pixelHeight:\s*(\d+)/)?.[1]);
  if (!width || !height) {
    throw new Error(`Could not read image dimensions: ${filePath}`);
  }
  return { width, height };
}

function normalizeToPresetDimensions(filePath) {
  const { width, height } = readImageSize(filePath);
  if (width === preset.width && height === preset.height) {
    return;
  }

  console.log(`  ↻ Resizing ${width}×${height} → ${preset.width}×${preset.height}`);
  const result = spawn('sips', [
    '-z',
    String(preset.height),
    String(preset.width),
    filePath,
  ]);
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
}

function assertAcceptedDimensions(filePath) {
  const { width, height } = readImageSize(filePath);
  if (width !== preset.width || height !== preset.height) {
    console.error(
      `\nScreenshot has wrong dimensions: ${width}×${height}px`,
      `\nExpected ${preset.width}×${preset.height}px for App Store Connect ${preset.label}.`,
      `\nSimulator: ${DEVICE}`,
    );
    process.exit(1);
  }
}

async function main() {
  if (process.platform !== 'darwin') {
    console.error('iOS screenshots require macOS with Xcode simulators.');
    process.exit(1);
  }

  ensureSimulatorReady();
  console.log(`Target: ${preset.label} via ${DEVICE}`);
  prepareStatusBar();

  if (shouldBuild || !isAppInstalled()) {
    if (!shouldBuild) {
      console.log('App not installed on simulator — building…');
    }
    buildAndInstall();
  }

  rmSync(OUTPUT_ROOT, { recursive: true, force: true });

  for (const lang of LOCALES) {
    const outDir = join(OUTPUT_ROOT, lang);
    mkdirSync(outDir, { recursive: true });

    console.log(`\nCapturing ${lang.toUpperCase()} screenshots…`);

    for (const screen of SCREENS) {
      terminateApp();
      await sleep(LAUNCH_WAIT_MS);
      openDeepLink(screen.path, lang);
      await sleep(RENDER_WAIT_MS);
      const outFile = resolve(outDir, `${screen.file}.png`);
      capture(outFile);
      normalizeToPresetDimensions(outFile);
      assertAcceptedDimensions(outFile);
      console.log(`  ✓ ${outFile} (${preset.width}×${preset.height})`);
    }
  }

  console.log(
    `\nDone. Upload PNGs from ${OUTPUT_ROOT}/ to App Store Connect → ${preset.label}.`,
  );
}

void main();
