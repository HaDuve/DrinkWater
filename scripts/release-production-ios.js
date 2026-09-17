#!/usr/bin/env node

/**
 * Bump marketing version, then EAS production iOS build + App Store submit (non-interactive).
 *
 * Usage:
 *   npm run release:production:ios
 *   npm run release:production:ios -- patch
 *   npm run release:production:ios -- minor --dry-run
 *   npm run release:production:ios -- --message "1.0.4 home glass"
 *
 * Requires EAS login / EXPO_TOKEN and non-interactive Apple submit credentials
 * (ASC API key on EAS or configured submit profile).
 */

const { spawnSync } = require("child_process");
const { bumpVersion, parseReleaseArg, RELEASES } = require("./version-bump");

const root = process.cwd();

function parseArgs(argv) {
  const options = {
    release: "patch",
    dryRun: false,
    message: null,
    noWait: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (RELEASES.has(arg)) {
      options.release = parseReleaseArg(arg);
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--no-wait") {
      options.noWait = true;
    } else if (arg === "--message" || arg === "-m") {
      i += 1;
      if (!argv[i]) throw new Error(`${arg} requires a value`);
      options.message = argv[i];
    } else {
      throw new Error(`Unknown arg "${arg}". Use: patch|minor|major [--message text] [--dry-run] [--no-wait]`);
    }
  }

  return options;
}

function runEas(args, dryRun) {
  console.log(`$ eas ${args.join(" ")}`);
  if (dryRun) return;
  const res = spawnSync("eas", args, { stdio: "inherit", cwd: root });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const { next } = options.dryRun
    ? { next: `(would bump ${options.release})` }
    : bumpVersion(options.release);

  const args = [
    "build",
    "--platform",
    "ios",
    "--profile",
    "production",
    "--auto-submit",
    "--non-interactive",
  ];

  if (options.noWait) {
    args.push("--no-wait");
  }

  const message = options.message || `Release ${next}`;
  args.push("--message", message);

  if (options.dryRun) {
    console.log("Dry run — no version write, no eas build/submit.");
  } else {
    console.log("Starting non-interactive production iOS build + submit…");
  }
  runEas(args, options.dryRun);
}

try {
  main();
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
