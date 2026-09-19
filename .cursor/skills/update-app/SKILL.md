---
name: update-app
description: Publish an OTA JS update with EAS Update, fully non-interactive. Always resolves the latest live store runtimeVersion from EAS before publish. Use for update-app, eas update, OTA update, or publishing to preview/production.
---

# Update App (EAS Update)

Ship DrinkWater OTA with **no prompts**. Ask only when channel/runtime cannot be resolved safely.

**Version-agnostic:** never assume a numeric app version from the repo or from memory. **Always** query EAS for the **latest finished store build** on the target channel and publish against that runtime.

## Constraints (2026 EAS)

- Publish: `eas update --channel …` (project uses **channels**, not `--auto` / git-branch-as-branch).
- **No** publish flag for runtime. Runtime comes from app config at publish time ([runtime versions](https://docs.expo.dev/eas-update/runtime-versions/), [how it works](https://docs.expo.dev/eas-update/how-it-works/)).
- DrinkWater: `"runtimeVersion": { "policy": "appVersion" }` → **`expo.version` at publish time must equal the live store runtime** you resolved from EAS.
- A build receives an update only when **channel + platform + runtimeVersion** all match.
- `eas build:list --json`: newer EAS CLI uses `runtime.version`; older output uses `runtimeVersion`. Accept either when reading builds.

## Resolve

### Channel

| User | Channel |
|------|---------|
| production / prod / release / unspecified | `production` |
| preview / staging / internal | `preview` |

Never `development` unless explicit.

### Message

1. User message → 2. `git log -1 --pretty=%s` → 3. `OTA update YYYY-MM-DD`  
Shell-quote; one line.

### Latest live runtime (required before publish)

Run from repo root (substitute channel if not production):

```bash
node .cursor/skills/update-app/resolve-live-runtimes.cjs <channel>
```

Example output:

```json
{
  "channel": "production",
  "ios": "<runtime-from-newest-store-build>",
  "android": null
}
```

**Rules**

- **ios** / **android** = `runtimeVersion` of the **most recently completed** `finished` **store** build on that channel for that platform (script sorts by `completedAt`, then `updatedAt`, then `createdAt`).
- **null** = no qualifying store build on that channel; do not publish for that platform.
- Repo `app.json` `expo.version` is **not** the publish target unless it already equals the resolved live runtime (informational only).

**Override (rare):** user gives an explicit runtime string → publish only that runtime; still verify CLI output matches. Do not override with repo version when user did not ask.

### Publish plan from resolved runtimes

`eas update` stamps **one** runtime per invocation.

| Case | Action |
|------|--------|
| User named one runtime | Publish once for that runtime (platforms per user or default all) |
| iOS + Android both non-null and **same** runtime | One publish, default `--platform all` |
| Only one platform non-null | One publish with `--platform ios` or `--platform android` |
| iOS ≠ Android runtimes | **Two** publishes: ios runtime on `--platform ios`, then android runtime on `--platform android` |
| Both null | **Stop** — no store binaries to target; do not guess from `app.json` |

Never default to repo `expo.version` when it differs from the resolved live runtime.

## Temporary config align (never commit)

Before each publish whose target ≠ current `expo.version`:

1. Save original `app.json` `expo.version`.
2. Set `expo.version` = **resolved live runtime** for this invocation (`appVersion` policy).
3. Publish.
4. **Always restore** original version (success or fail) — `trap`/finally.
5. Leave `package.json` untouched; do not `git add`/`commit` `app.json`.

If `runtimeVersion` is a fixed string (not a policy), temporarily set that string instead.

## Publish

Repo root:

```bash
CI=1 eas update --channel <channel> --message "<message>" --non-interactive
# dual runtime:
CI=1 eas update --channel <channel> --platform ios --message "<message>" --non-interactive
CI=1 eas update --channel <channel> --platform android --message "<message>" --non-interactive
```

`CI=1` required so Expo CLI stays non-interactive; `--non-interactive` alone is not enough for the bundler.

User-only extras: `--clear-cache`, `--json`.

**Do not:** interactive update, bare `npm run update:*`, `--auto`, sticky version bumps, `eas build` / store submit unless asked.

## Verify (fail closed)

Each publish CLI output must include:

- `Published!`
- `Runtime version` **===** the live runtime you resolved for that platform in this invocation
- Update group ID + EAS Dashboard URL

Mismatch → restore config, stop, report failure.

**Report:** channel, resolved live runtime(s) + platform(s), message, group id(s), dashboard URL(s).  
**Note:** first cold start after install may still run the embedded bundle — kill/reopen once.

## Auth

EAS auth failure → stop; user must `eas login`. No credential prompts.
