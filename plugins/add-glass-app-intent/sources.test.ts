import {
  ADD_GLASS_DEEP_LINK,
  buildAddGlassIntentSwift,
  buildAppShortcutsXcstrings,
  buildDrinkWaterAppShortcutsSwift,
} from './sources';

describe('Add Glass App Intent sources', () => {
  it('opens drinkwater://add-glass with openAppWhenRun', () => {
    const swift = buildAddGlassIntentSwift();

    expect(ADD_GLASS_DEEP_LINK).toBe('drinkwater://add-glass');
    expect(swift).toContain('static var openAppWhenRun: Bool = true');
    expect(swift).toContain(`URL(string: "${ADD_GLASS_DEEP_LINK}")`);
    expect(swift).toContain('UIApplication.shared.open(url)');
  });

  it('registers an App Shortcut phrase for English Siri discovery', () => {
    const swift = buildDrinkWaterAppShortcutsSwift();

    expect(swift).toContain('AppShortcutsProvider');
    expect(swift).toContain('AddGlassIntent()');
    expect(swift).toContain('"Add a glass in \\(.applicationName)"');
  });

  it('localizes the App Shortcut phrase for German in AppShortcuts.xcstrings', () => {
    const catalog = JSON.parse(buildAppShortcutsXcstrings());
    const entry = catalog.strings['Add a glass in ${applicationName}'];

    expect(catalog.sourceLanguage).toBe('en');
    expect(entry.localizations.en.stringUnit.value).toBe('Add a glass in ${applicationName}');
    expect(entry.localizations.de.stringUnit.value).toBe(
      'Glas in ${applicationName} hinzufügen'
    );
  });
});