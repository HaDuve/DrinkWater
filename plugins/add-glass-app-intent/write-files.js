const fs = require('fs');
const path = require('path');

const {
  buildAddGlassIntentSwift,
  buildAppShortcutsXcstrings,
  buildDrinkWaterAppShortcutsSwift,
  buildLocalizableXcstrings,
} = require('./sources');

/** Writes tracked App Intent Swift + string catalogs into the generated iOS app folder. */
function writeAddGlassAppIntentFiles({ nativeProjectRoot, projectName }) {
  const appDir = path.join(nativeProjectRoot, projectName);

  fs.writeFileSync(path.join(appDir, 'AddGlassIntent.swift'), buildAddGlassIntentSwift(), 'utf8');
  fs.writeFileSync(
    path.join(appDir, 'DrinkWaterAppShortcuts.swift'),
    buildDrinkWaterAppShortcutsSwift(),
    'utf8'
  );
  fs.writeFileSync(path.join(appDir, 'AppShortcuts.xcstrings'), buildAppShortcutsXcstrings(), 'utf8');
  fs.writeFileSync(path.join(appDir, 'Localizable.xcstrings'), buildLocalizableXcstrings(), 'utf8');
}

module.exports = { writeAddGlassAppIntentFiles };
