# iOS App Store publishing — DrinkWater (2026)

Research date: 2026-08-31  
Stack: Expo SDK 54, EAS Build/Submit, local-only data (`AsyncStorage`), local notifications (`expo-notifications`), OTA updates (`expo-updates`).

Sources: [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/), [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), [Expo Submit iOS](https://docs.expo.dev/submit/ios/), [Expo App stores best practices](https://docs.expo.dev/distribution/app-stores/).

---

## Executive summary

Most **technical plumbing is already in place** for this repo (bundle ID, EAS project, production profile, `ascAppId`, export compliance flag). What remains is mostly **App Store Connect metadata**, **legal/privacy**, **store assets**, a **production build + submit**, and **review prep** (TestFlight, reviewer notes, iPad check).

---

## Already done in this repo

| Item | Status |
|------|--------|
| Bundle ID `de.drinkwaterreminder.app` | `app.json` |
| App Store Connect app ID | `eas.json` → `ascAppId: 6760930852` |
| EAS project + production profile | `eas.json` (`autoIncrement: true`) |
| Export compliance (no custom encryption) | `ITSAppUsesNonExemptEncryption: false` |
| App icon + splash | `app.json` |
| iOS locales en/de | `expo-localization` plugin |
| Expo account | configured (EAS CLI logged in) |
| Version | `1.0.3` |

---

## 1. Accounts & agreements

### Required

- **Apple Developer Program** — $99/year. Required to distribute on the App Store.  
  [Apple Developer Program](https://developer.apple.com/programs/)
- **Expo account** — for EAS Build/Submit (free tier works; paid improves queue/concurrency).  
  [EAS Build setup](https://docs.expo.dev/build/setup/)

### Agreements (App Store Connect → Agreements)

- **Apple Developer Program License Agreement** — required for any App Store distribution (including free apps).  
  [Sign agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements)
- **Paid Applications Agreement** — **not required** for a fully free app with no IAP.
- **Tax & banking** — only if you charge money or sell IAP.

### Enrollment type

- **Individual** — legal name on Apple Account, 2FA, ID verification via Apple Developer app.
- **Organization** — D-U-N-S, legal entity, signing authority. Organization name becomes **seller name** on the App Store.

---

## 2. 2026 Apple platform requirements (mandatory)

From [Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/):

| Requirement | Deadline | Impact on DrinkWater |
|-------------|----------|----------------------|
| **Xcode 26+ / iOS 26 SDK** for uploads | Since 2026-04-28 | Use current EAS Build iOS image (EAS manages Xcode). Verify build logs show Xcode 26+. |
| **Privacy manifest + approved API reasons** | Since 2024-05-01 | Handled by Expo SDK + dependencies in prebuild; audit the built `.ipa` before submit. |
| **Updated age rating questions** | Since 2026-01-31 | Complete in App Store Connect → App Information or updates may be blocked. |
| **EU DSA trader status** | Since 2025-02-17 | Required to stay listed in the **EU** (Germany included). Set in App Store Connect. |

---

## 3. App Store Connect listing (metadata)

Complete in [App Store Connect](https://appstoreconnect.apple.com) for app `6760930852`.

### Required fields

- **App name** (30 chars) — e.g. DrinkWater
- **Subtitle** (30 chars, optional but recommended)
- **Description** — what the app does; mention local reminders, no account, data stays on device
- **Keywords** — discoverability
- **Support URL** — required (help/contact page)
- **Privacy Policy URL** — **required** ([Guideline 5.1.1](https://developer.apple.com/app-store/review/guidelines/))
- **Category** — likely **Health & Fitness** or **Lifestyle** (pick the most accurate)
- **Age rating** — complete questionnaire (water tracker, no social, no accounts → typically low rating)
- **Copyright** — e.g. `2026 Your Name or GmbH`
- **Screenshots** — min **1** set for iPhone 6.9" or 6.5" ([screenshot specs](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)); Expo recommends 2–10. Provide **en** and **de** sets if screenshots contain text.
- **Build** — attach production `.ipa` after EAS submit (appears in TestFlight first)

### Optional but useful

- Marketing URL
- App preview video (max 3 per size)
- Promotional text (can change without new review)

### iPad

Even phone-only apps must **render correctly on iPad** at phone resolution. Apple may reject broken layouts ([Expo app stores guide](https://docs.expo.dev/distribution/app-stores/)). Test on iPad simulator before submit.

---

## 4. Privacy & legal (project gaps)

### Privacy policy

Apple requires:

1. URL in App Store Connect metadata (`https://foodfornomads.com/datenschutzerklaerung/`)
2. Link **inside the app** in an easily accessible place ([5.1.1(i)](https://developer.apple.com/app-store/review/guidelines/)) — done in Settings

Suggested content for DrinkWater:

- Data stored **only on device** (water intake, settings, history via AsyncStorage)
- **No accounts**, no server sync, no analytics, no ads, no tracking
- **Local notifications** only (user can disable in iOS Settings)
- **expo-updates** may fetch JS bundles from Expo — state this if you keep OTA enabled
- Contact email for privacy questions
- GDPR note if seller is EU-based (Germany)

### App Privacy questionnaire (Nutrition Label)

In App Store Connect → App Privacy. For this app:

- **No user accounts** → no account deletion requirement
- **No ATT** → no App Tracking Transparency (no ads/tracking)
- **Data collection**: likely **“No, we do not collect data”** if nothing leaves the device

Caveat from [Expo docs](https://docs.expo.dev/distribution/app-stores/): if you use **`expo-updates`**, Apple may expect you to disclose **Diagnostics / Crash Data** depending on what Expo's update service logs. Read Expo's current guidance and answer consistently.

Apple defines “collect” as data transmitted off-device and retained beyond servicing a request ([App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)). On-device-only AsyncStorage does **not** need disclosure.

### Health / medical (Guideline 1.4.1)

Water tracking is adjacent to health. Apple scrutinizes medical claims. Safe approach:

- Do **not** claim medical accuracy or hydration prescriptions
- Optional short disclaimer in description or settings: “For general wellness only; not medical advice”
- You do **not** use HealthKit — no HealthKit entitlement needed

### EU DSA trader status

If distributing in the EU, provide **trader status** in App Store Connect ([Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)). Missing status can remove the app from EU storefronts.

---

## 5. Technical build & submit (Expo/EAS)

### Prerequisites

```bash
npm install -g eas-cli   # or npx eas-cli@latest
eas login
```

Apple credentials: EAS can create distribution cert + provisioning profile on first build.

### Production build

```bash
eas build --platform ios --profile production
```

`eas.json` production profile already has `autoIncrement: true` (build number bumps automatically).

### Submit to App Store Connect

```bash
eas submit --platform ios
# or one step:
eas build --platform ios --profile production --auto-submit
```

`ascAppId` is preconfigured in `eas.json`. First run may prompt for Apple ID or App Store Connect API key.

After upload, build appears in **TestFlight** (~10–15 min processing), then promote to App Review.

### Recommended pre-submit checks

- [ ] Test on **physical iPhone** (notifications require real device)
- [ ] Test on **iPad** simulator (layout)
- [ ] Test **en** and **de** locales
- [ ] Reminders on/off, permission denied path, history, settings save
- [ ] Fresh install → no crashes
- [ ] Confirm production build does **not** include dev-only tooling users shouldn't see

### OTA updates (`expo-updates`)

Configured in `app.json` with production channel. Rules:

- OTA may ship **bug fixes** and minor JS changes
- Must **not** materially change app purpose/features without review ([App Review Guidelines 3.3.9](https://developer.apple.com/app-store/review/guidelines/))
- For review builds: consider pinning to a known update or disabling OTA for the review binary to avoid reviewer/channel mismatch ([field reports 2026](https://www.72technologies.com/blog/react-native-app-store-rejections-2026))

### Notifications

Uses **local** repeating notifications only — no push server/APNs certificate needed for your own backend. `expo-notifications` plugin adds iOS permission strings at prebuild time.

---

## 6. App Review submission

In App Store Connect:

1. Create version (e.g. `1.0.3`)
2. Attach build from TestFlight
3. Fill **Export Compliance** — already declared non-exempt encryption `false` in `app.json`
4. Complete **App Privacy** + **Age Rating**
5. Add **App Review Information**:
   - Contact name, phone, email
   - **Notes**: “No login. All data local. Enable notifications in Settings → Reminders to test repeating local reminders.”
   - No demo account needed
6. **Submit for Review**

Review typically 24–48 hours; rejections are common for metadata/privacy gaps — fix and resubmit.

---

## 7. Checklist (ordered)

### Accounts
- [ ] Apple Developer Program active (individual or organization)
- [ ] Developer Program License Agreement signed
- [ ] EU trader status (if selling in EU)

### Legal / privacy
- [x] Publish privacy policy URL (website)
- [x] Add in-app link to privacy policy (Settings screen)
- [ ] Complete App Privacy questionnaire in ASC
- [ ] Complete age rating questionnaire

### Store presence
- [ ] Description, keywords, support URL (en + de if localized listing)
- [ ] Screenshots (6.9" iPhone minimum; de variants if text in images)
- [ ] App icon (from bundle — already configured)
- [ ] Category + copyright

### Build & ship
- [ ] `eas build --platform ios --profile production`
- [ ] `eas submit --platform ios`
- [ ] TestFlight smoke test on device
- [ ] Submit for App Review with reviewer notes

---

## 8. Cost estimate

| Item | Cost |
|------|------|
| Apple Developer Program | $99/year |
| EAS Build/Submit | Free tier available; paid plans optional |
| Privacy policy hosting | Free (GitHub Pages, simple site) |
| Domain for support/privacy URLs | Optional (~$10–15/year) |

---

## 9. Open questions for the team

1. **Seller identity** — publish as individual or organization?
2. **Support URL** — email only, or a simple support page?
3. **Category** — Health & Fitness vs Lifestyle?
4. **EU trader details** — legal entity info for DSA if distributing in Germany/EU?
5. **First release scope** — TestFlight-only beta first, or straight to public App Store?
