#!/usr/bin/env node
/**
 * Latest finished store runtimeVersion per platform on a channel.
 * stdout: JSON { channel, ios, android } — null when no store build exists.
 */
const { execSync } = require('child_process');

const channel = process.argv[2] || 'production';

function readRuntime(build) {
  if (!build || typeof build !== 'object') return null;
  if (build.runtime && typeof build.runtime.version === 'string') {
    return build.runtime.version;
  }
  if (typeof build.runtimeVersion === 'string') return build.runtimeVersion;
  return null;
}

function latestStoreRuntime(platform) {
  const cmd = [
    'eas',
    'build:list',
    '--platform',
    platform,
    '--channel',
    channel,
    '--distribution',
    'store',
    '--status',
    'finished',
    '--limit',
    '20',
    '--json',
    '--non-interactive',
  ].join(' ');

  let raw;
  try {
    raw = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  } catch {
    return null;
  }

  let builds;
  try {
    builds = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(builds) || builds.length === 0) return null;

  const sorted = [...builds].sort((a, b) => {
    const ta = Date.parse(a.completedAt || a.updatedAt || a.createdAt || 0);
    const tb = Date.parse(b.completedAt || b.updatedAt || b.createdAt || 0);
    return tb - ta;
  });

  return readRuntime(sorted[0]);
}

const result = {
  channel,
  ios: latestStoreRuntime('ios'),
  android: latestStoreRuntime('android'),
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
