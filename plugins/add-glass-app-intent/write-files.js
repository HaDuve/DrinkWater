const fs = require('fs');
const path = require('path');

const {
  buildAddGlassIntentSwift,
  buildAppShortcutsStrings,
  buildDrinkWaterAppShortcutsSwift,
  buildLocalizableXcstrings,
} = require('./sources');

const APP_SHORTCUT_LOCALES = ['en', 'de'];

/** Writes tracked App Intent Swift + localized App Shortcuts / Localizable catalogs. */
function writeAddGlassAppIntentFiles({ nativeProjectRoot, projectName }) {
  const appDir = path.join(nativeProjectRoot, projectName);

  fs.writeFileSync(path.join(appDir, 'AddGlassIntent.swift'), buildAddGlassIntentSwift(), 'utf8');
  fs.writeFileSync(
    path.join(appDir, 'DrinkWaterAppShortcuts.swift'),
    buildDrinkWaterAppShortcutsSwift(),
    'utf8'
  );

  for (const locale of APP_SHORTCUT_LOCALES) {
    const lprojDir = path.join(appDir, `${locale}.lproj`);
    fs.mkdirSync(lprojDir, { recursive: true });
    fs.writeFileSync(
      path.join(lprojDir, 'AppShortcuts.strings'),
      buildAppShortcutsStrings(locale),
      'utf8'
    );
  }

  // Drop legacy catalog if a prior prebuild wrote it (iOS 17+ only; breaks 15.1 builds).
  const legacyCatalog = path.join(appDir, 'AppShortcuts.xcstrings');
  if (fs.existsSync(legacyCatalog)) {
    fs.unlinkSync(legacyCatalog);
  }

  fs.writeFileSync(path.join(appDir, 'Localizable.xcstrings'), buildLocalizableXcstrings(), 'utf8');
}

module.exports = { writeAddGlassAppIntentFiles, APP_SHORTCUT_LOCALES };
