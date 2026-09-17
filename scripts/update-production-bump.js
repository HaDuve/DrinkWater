#!/usr/bin/env node

/**
 * Bump marketing/runtime version, then publish an EAS Update to production (non-interactive).
 *
 * Usage:
 *   npm run update:production:bump
 *   npm run update:production:bump -- patch --message "fix undo"
 *   npm run update:production:bump -- --dry-run
 *
 * Note: app.json uses runtimeVersion.policy = "appVersion". Bumping version changes
 * the OTA runtime — devices still on the previous native binary will not receive this
 * update. Prefer plain `npm run update:production` for JS hotfixes on the current binary.
 */

const { spawnSync } = require("child_process");
const { bumpVersion, parseReleaseArg, RELEASES } = require("./version-bump");

const root = process.cwd();

function parseArgs(argv) {
  const options = {
    release: "patch",
    dryRun: false,
    message: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (RELEASES.has(arg)) {
      options.release = parseReleaseArg(arg);
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--message" || arg === "-m") {
      i += 1;
      if (!argv[i]) throw new Error(`${arg} requires a value`);
      options.message = argv[i];
    } else {
      throw new Error(`Unknown arg "${arg}". Use: patch|minor|major [--message text] [--dry-run]`);
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

  console.warn(
    [
      "",
      "Warning: runtimeVersion policy is appVersion.",
      `This update targets runtime ${next} only (native builds already on ${next}).`,
      "For hotfixes on the current App Store binary, use: npm run update:production",
      "",
    ].join("\n"),
  );

  const message = options.message || `OTA ${next}`;
  const args = [
    "update",
    "--channel",
    "production",
    "--non-interactive",
    "--message",
    message,
  ];

  if (options.dryRun) {
    console.log("Dry run — no version write, no eas update.");
  } else {
    console.log("Publishing non-interactive production EAS update…");
  }
  runEas(args, options.dryRun);
}

try {
  main();
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
