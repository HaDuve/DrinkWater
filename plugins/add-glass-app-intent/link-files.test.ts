import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getPbxproj } from '@expo/config-plugins/build/ios/utils/Xcodeproj';

import { linkAddGlassAppIntentFiles } from './link-files';

const repoIos = path.join(__dirname, '..', '..', 'ios');

const describeIfIos = fs.existsSync(repoIos) ? describe : describe.skip;

describeIfIos('linkAddGlassAppIntentFiles', () => {
  it('adds Swift sources and AppShortcuts.xcstrings to the Xcode project', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-link-glass-'));
    copyDirSync(repoIos, path.join(tempRoot, 'ios'));

    const projectRoot = tempRoot;
    const nativeProjectRoot = path.join(tempRoot, 'ios');
    const projectName = 'DrinkWater';
    const project = getPbxproj(projectRoot);

    linkAddGlassAppIntentFiles({
      project,
      nativeProjectRoot,
      projectName,
    });

    expect(project.hasFile(`${projectName}/AddGlassIntent.swift`)).toBeTruthy();
    expect(project.hasFile(`${projectName}/DrinkWaterAppShortcuts.swift`)).toBeTruthy();
    expect(project.hasFile(`${projectName}/AppShortcuts.xcstrings`)).toBeTruthy();
    expect(
      fs.readFileSync(path.join(nativeProjectRoot, projectName, 'AddGlassIntent.swift'), 'utf8')
    ).toContain('openAppWhenRun');
  });
});

function copyDirSync(from: string, to: string) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === 'Pods' || entry.name === 'build') continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}
