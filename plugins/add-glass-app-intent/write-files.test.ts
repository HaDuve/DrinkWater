import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { writeAddGlassAppIntentFiles } from './write-files';

describe('writeAddGlassAppIntentFiles', () => {
  it('writes the App Intent Swift sources and localized AppShortcuts.strings', () => {
    const nativeProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-add-glass-'));
    const projectName = 'DrinkWater';
    const appDir = path.join(nativeProjectRoot, projectName);
    fs.mkdirSync(appDir);
    // Simulate leftover catalog from an older plugin version.
    fs.writeFileSync(path.join(appDir, 'AppShortcuts.xcstrings'), '{}', 'utf8');

    writeAddGlassAppIntentFiles({ nativeProjectRoot, projectName });

    const intentPath = path.join(appDir, 'AddGlassIntent.swift');
    const shortcutsPath = path.join(appDir, 'DrinkWaterAppShortcuts.swift');
    const enStringsPath = path.join(appDir, 'en.lproj', 'AppShortcuts.strings');
    const deStringsPath = path.join(appDir, 'de.lproj', 'AppShortcuts.strings');
    const localizablePath = path.join(appDir, 'Localizable.xcstrings');

    expect(fs.readFileSync(intentPath, 'utf8')).toContain('drinkwater://add-glass');
    expect(fs.readFileSync(shortcutsPath, 'utf8')).toContain('AppShortcutsProvider');
    expect(fs.existsSync(path.join(appDir, 'AppShortcuts.xcstrings'))).toBe(false);
    expect(fs.readFileSync(enStringsPath, 'utf8')).toContain(
      '"Add a glass in ${applicationName}" = "Add a glass in ${applicationName}";'
    );
    expect(fs.readFileSync(deStringsPath, 'utf8')).toContain(
      '"Add a glass in ${applicationName}" = "Glas in ${applicationName} hinzufügen";'
    );
    const localizable = JSON.parse(fs.readFileSync(localizablePath, 'utf8'));
    expect(localizable.strings['Add Glass'].localizations.de.stringUnit.value).toBe('Glas hinzufügen');
  });
});
