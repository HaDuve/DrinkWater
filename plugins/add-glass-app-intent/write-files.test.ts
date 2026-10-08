import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { writeAddGlassAppIntentFiles } from './write-files';

describe('writeAddGlassAppIntentFiles', () => {
  it('writes the App Intent Swift sources and AppShortcuts.xcstrings', () => {
    const nativeProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-add-glass-'));
    const projectName = 'DrinkWater';
    fs.mkdirSync(path.join(nativeProjectRoot, projectName));

    writeAddGlassAppIntentFiles({ nativeProjectRoot, projectName });

    const intentPath = path.join(nativeProjectRoot, projectName, 'AddGlassIntent.swift');
    const shortcutsPath = path.join(nativeProjectRoot, projectName, 'DrinkWaterAppShortcuts.swift');
    const catalogPath = path.join(nativeProjectRoot, projectName, 'AppShortcuts.xcstrings');

    expect(fs.readFileSync(intentPath, 'utf8')).toContain('drinkwater://add-glass');
    expect(fs.readFileSync(shortcutsPath, 'utf8')).toContain('AppShortcutsProvider');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    expect(catalog.strings['Add a glass in ${applicationName}'].localizations.de.stringUnit.value).toBe(
      'Glas in ${applicationName} hinzufügen'
    );
  });
});
