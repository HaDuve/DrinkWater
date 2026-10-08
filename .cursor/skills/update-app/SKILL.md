---
name: update-app
description: Ship DrinkWater via EAS non-interactively — first classify native vs JS (binary TestFlight vs OTA), resolve live store runtime from EAS, then publish. Use for update-app, eas update, OTA, TestFlight, eas build, auto-submit, or production/preview release.
---

# Update App (EAS)

Ship DrinkWater with **no prompts**. Ask only when channel/runtime/path cannot be resolved safely.

**Version-agnostic:** never assume app version from the repo or memory. **Always** query EAS for the latest finished **store** build on the target channel.

## 1. Decide path (required first)

Compare **current HEAD** (or the user’s stated tip) to the **git commit of the latest finished store build** on the channel (`eas build:list` → `gitCommitHash`).

| Signal in the delta | Path |
|---------------------|------|
| Native / prebuild / store-binary required (below) | **Binary** → § Binary (TestFlight) |
| JS/TS/assets only, and live binary already has needed native deps | **OTA** → § OTA |
| No forward delta (HEAD ≤ live binary content) | **Stop** — report already shipped; do not OTA a regression |

**Native / binary-required** (any one → Binary):

- `plugins/**` that inject native code (e.g. App Intents / Siri Shortcuts)
- `ios/**`, `android/**`, Podfile, gradle, `.swift` / `.m` / `.mm` / `.podspec`
- New or upgraded native modules in `package.json` (anything that changes the native binary / autolinking)
- `app.json` / app config changes that affect native entitlements, URL schemes, permissions, locales plugins, splash/icon **when they require a new binary**
- User explicitly asks for TestFlight / store binary / `eas build` / submit

**JS-only (OTA OK)** when none of the above: screens, hooks, domain, styles, i18n JSON, most `src/**` UI — including Skia/Reanimated **if** those native libs are already in the live binary.

Always state the verdict (native vs JS + path) before shipping.

### Channel

| User | Channel |
|------|---------|
| production / prod / release / unspecified | `production` |
| preview / staging / internal | `preview` |

Never `development` unless explicit.

### Latest live runtime

```bash
node .cursor/skills/update-app/resolve-live-runtimes.cjs <channel>
```

```json
{ "channel": "production", "ios": "<runtime>", "android": null }
```

- Platform value = `runtimeVersion` of newest finished **store** build on that channel (script sorts `completedAt` → `updatedAt` → `createdAt`).
- `null` = no store build — do not OTA that platform; for Binary, you may still create the first store build.
- `eas build:list --json`: accept `runtime.version` or `runtimeVersion`.

---

## 2. Binary (TestFlight) — new store IPA

iOS production → App Store Connect / TestFlight (not App Review unless user asks).

### Version

- User-facing `expo.version` comes from app config; remote `appVersionSource` + `autoIncrement` only bumps **buildNumber**.
- Before build: live store `appVersion`/`runtimeVersion` from EAS. If shipping a new marketing version, set `app.json` `expo.version` **≥** live (usually bump minor/patch). Commit the bump — EAS uploads git state; uncommitted version won’t ship.
- Do **not** leave `expo.version` below the live store version.

### Build + submit (non-interactive)

```bash
CI=1 eas build \
  --platform ios \
  --profile production \
  --auto-submit \
  --non-interactive \
  --no-wait \
  --message "<short why>"
```

- `CI=1` + `--non-interactive`. Prefer `--no-wait`; poll build/submission URLs.
- **Do not** pass `--what-to-test` / changelog — EAS returns *Changelog submission is currently available for Enterprise plan only* and can fail scheduling submit even after the build uploads.
- If build is created but auto-submit fails:  
  `CI=1 eas submit --platform ios --profile production --id <buildId> --non-interactive --no-wait`
- Do **not** spam extra submits while one is `IN_QUEUE` / `IN_PROGRESS`. Poll until `FINISHED` / `ERRORED`.
- Submission may sit in `IN_QUEUE` for many minutes on free/hobby — wait; don’t rebuild.

`eas.json`: production `channel`, `autoIncrement: true`, submit `ascAppId` already set. Auto-submit → TestFlight, not App Review.

### Localized store texts (required on Binary)

After kicking off (or when reporting), give copy-paste **App Store “What’s New”** for **en** and **de** (app locales). User-friendly bullets: product changes only, no commit hashes/PR numbers. Cover the full release delta the user asked for (e.g. “everything today”), not only the tip commit.

### Binary verify / report

- Build finished; `appVersion` / `runtimeVersion` / `appBuildVersion` as expected
- Submission `FINISHED` (Expo submission URL)
- Channel, message, build URL, submission URL, en+de What’s New

---

## 3. OTA (EAS Update) — JS only

DrinkWater: `"runtimeVersion": { "policy": "appVersion" }` → at publish time `expo.version` must equal the **resolved live runtime**. Channel + platform + runtimeVersion must all match the binary.

### Message

1. User message → 2. `git log -1 --pretty=%s` → 3. `OTA update YYYY-MM-DD`  
Shell-quote; one line.

### Publish plan from resolved runtimes

| Case | Action |
|------|--------|
| User named one runtime | Publish once for that runtime |
| iOS + Android both non-null and **same** | One publish, default `--platform all` |
| Only one platform non-null | `--platform ios` or `--platform android` |
| iOS ≠ Android runtimes | Two publishes (per platform) |
| Both null | **Stop** — no store binary to target |

Never default to repo `expo.version` when it differs from the resolved live runtime.

### Temporary config align (never commit)

If target runtime ≠ current `expo.version`:

1. Save original `app.json` `expo.version`
2. Set `expo.version` = resolved live runtime for this invocation
3. Publish
4. **Always restore** original (success or fail)
5. Do not touch `package.json`; do not commit `app.json`

### Publish

```bash
CI=1 eas update --channel <channel> --message "<message>" --non-interactive
```

`CI=1` required (bundler); `--non-interactive` alone is not enough.

**Do not:** interactive update, bare `npm run update:*`, `--auto`, sticky version bumps, or `eas build`/submit on the OTA path.

### OTA verify (fail closed)

CLI must show `Published!`, runtime **===** resolved live runtime, update group ID + dashboard URL. Mismatch → restore config, stop.

**Report:** channel, runtime(s)+platform(s), message, group id(s), URL(s).  
Note: first cold start may still run the embedded bundle — kill/reopen once.

---

## Auth

EAS auth failure → stop; user must `eas login`. No credential prompts.
