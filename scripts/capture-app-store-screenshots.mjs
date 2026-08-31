#!/usr/bin/env node
/**
 * Capture App Store screenshots on iPhone 16 Pro Max (6.9") simulator.
 *
 * Usage:
 *   npm run screenshots              # capture (app must be installed)
 *   npm run screenshots:build        # build/install, then capture
 *
 * Output: store-screenshots/{en,de}/*.png (1320×2868 class, ready for App Store Connect)
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const DEVICE = 'iPhone 16 Pro Max';
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
  for (const runtime of Object.values(parsed.devices)) {
    for (const device of runtime) {
      if (device.name === DEVICE && device.isAvailable) {
        return device;
      }
    }
  }
  throw new Error(`Simulator not found: ${DEVICE}`);
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

async function main() {
  if (process.platform !== 'darwin') {
    console.error('iOS screenshots require macOS with Xcode simulators.');
    process.exit(1);
  }

  ensureSimulatorReady();
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
      console.log(`  ✓ ${outFile}`);
    }
  }

  console.log(`\nDone. Upload PNGs from ${OUTPUT_ROOT}/ to App Store Connect.`);
}

void main();
