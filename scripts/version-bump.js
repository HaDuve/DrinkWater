#!/usr/bin/env node

/**
 * Bumps app version (semver) in package.json, app.json, package-lock.json, and store.config.json.
 * Usage:
 *   npm run version:bump [-- patch|minor|major]
 *   require("./version-bump").bumpVersion("patch")
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();

const RELEASES = new Set(["patch", "minor", "major"]);

function bumpSemver(version, release) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!m) {
    throw new Error(`Invalid semver (expected x.y.z): ${version}`);
  }
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]);
  if (release === "major") {
    return `${major + 1}.0.0`;
  }
  if (release === "minor") {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function parseReleaseArg(arg) {
  if (!arg) return "patch";
  if (!RELEASES.has(arg)) {
    throw new Error(`Unknown release "${arg}". Use: patch | minor | major`);
  }
  return arg;
}

/**
 * @param {"patch"|"minor"|"major"} [release]
 * @returns {{ current: string, next: string, release: string }}
 */
function bumpVersion(release = "patch") {
  const kind = parseReleaseArg(release);

  const pkgPath = path.join(root, "package.json");
  const appPath = path.join(root, "app.json");
  const lockPath = path.join(root, "package-lock.json");
  const storePath = path.join(root, "store.config.json");

  const pkg = readJson(pkgPath);
  const current = pkg.version;
  if (!current) {
    throw new Error("package.json has no version field");
  }

  const next = bumpSemver(current, kind);
  pkg.version = next;
  writeJson(pkgPath, pkg);

  const app = readJson(appPath);
  if (!app.expo) {
    throw new Error("app.json has no expo block");
  }
  app.expo.version = next;
  writeJson(appPath, app);

  if (fs.existsSync(lockPath)) {
    const lock = readJson(lockPath);
    lock.version = next;
    if (lock.packages && lock.packages[""]) {
      lock.packages[""].version = next;
    }
    writeJson(lockPath, lock);
  }

  if (fs.existsSync(storePath)) {
    const store = readJson(storePath);
    if (store.apple) {
      store.apple.version = next;
      writeJson(storePath, store);
    }
  }

  console.log(`Version ${current} → ${next} (${kind})`);
  return { current, next, release: kind };
}

function main() {
  bumpVersion(parseReleaseArg(process.argv[2]));
}

module.exports = { bumpVersion, parseReleaseArg, RELEASES };

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
