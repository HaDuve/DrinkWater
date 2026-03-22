#!/usr/bin/env node

/**
 * Bumps app version (semver) in package.json, app.json (expo.version), and package-lock.json root.
 * Usage: npm run version:bump [-- patch|minor|major]
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

function main() {
  const arg = process.argv[2];
  const release = arg && RELEASES.has(arg) ? arg : "patch";
  if (arg && !RELEASES.has(arg)) {
    console.error(`Unknown release "${arg}". Use: patch | minor | major`);
    process.exit(1);
  }

  const pkgPath = path.join(root, "package.json");
  const appPath = path.join(root, "app.json");
  const lockPath = path.join(root, "package-lock.json");

  const pkg = readJson(pkgPath);
  const current = pkg.version;
  if (!current) {
    throw new Error("package.json has no version field");
  }

  const next = bumpSemver(current, release);
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

  console.log(`Version ${current} → ${next} (${release})`);
}

try {
  main();
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
