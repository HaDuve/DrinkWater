import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getPbxproj } from '@expo/config-plugins/build/ios/utils/Xcodeproj';

import { linkAddGlassAppIntentFiles } from './link-files';

const fixtureRoot = path.join(__dirname, '__fixtures__', 'ios-project');

describe('linkAddGlassAppIntentFiles', () => {
  it('adds Swift sources and AppShortcuts.strings as a PBXVariantGroup', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-link-glass-'));
    copyDirSync(fixtureRoot, tempRoot);

    const nativeProjectRoot = path.join(tempRoot, 'ios');
    const projectName = 'DrinkWater';
    const project = getPbxproj(tempRoot);

    linkAddGlassAppIntentFiles({
      project,
      nativeProjectRoot,
      projectName,
    });

    expect(project.hasFile(`${projectName}/AddGlassIntent.swift`)).toBeTruthy();
    expect(project.hasFile(`${projectName}/DrinkWaterAppShortcuts.swift`)).toBeTruthy();
    expect(project.hasFile(`${projectName}/Localizable.xcstrings`)).toBeTruthy();
    expect(project.findPBXVariantGroupKey({ name: 'AppShortcuts.strings' })).toBeTruthy();
    expect(project.hasFile(`${projectName}/AppShortcuts.xcstrings`)).toBeFalsy();
    expect(
      fs.existsSync(path.join(nativeProjectRoot, projectName, 'en.lproj', 'AppShortcuts.strings'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(nativeProjectRoot, projectName, 'de.lproj', 'AppShortcuts.strings'))
    ).toBe(true);
    expect(
      fs.readFileSync(path.join(nativeProjectRoot, projectName, 'AddGlassIntent.swift'), 'utf8')
    ).toContain('EnvironmentValues().openURL');

    const pbx = project.writeSync();
    expect(pbx).toContain('isa = "PBXVariantGroup"');
    expect(pbx).toContain('name = en;');
    expect(pbx).toContain('name = de;');
    expect(pbx).toContain('en.lproj/AppShortcuts.strings');
    expect(pbx).toContain('de.lproj/AppShortcuts.strings');
    expect(pbx).toContain('AppShortcuts.strings in Resources');
    expect(pbx).not.toContain('AppShortcuts.xcstrings');
  });
});

function copyDirSync(from: string, to: string) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}
