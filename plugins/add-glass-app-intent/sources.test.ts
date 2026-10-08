import {
  ADD_GLASS_DEEP_LINK,
  buildAddGlassIntentSwift,
  buildAppShortcutsXcstrings,
  buildDrinkWaterAppShortcutsSwift,
  buildLocalizableXcstrings,
} from './sources';

describe('Add Glass App Intent sources', () => {
  it('opens drinkwater://add-glass via openURL under openAppWhenRun', () => {
    const swift = buildAddGlassIntentSwift();

    expect(ADD_GLASS_DEEP_LINK).toBe('drinkwater://add-glass');
    expect(swift).toContain('static var openAppWhenRun: Bool = true');
    expect(swift).toContain(`URL(string: "${ADD_GLASS_DEEP_LINK}")`);
    // OpenURLIntent requires universal links; custom schemes use openURL.
    expect(swift).toContain('EnvironmentValues().openURL(url)');
    expect(swift).not.toContain('UIApplication.shared.open');
    expect(swift).not.toContain('OpenURLIntent');
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

  it('localizes Add Glass title for German in Localizable.xcstrings', () => {
    const catalog = JSON.parse(buildLocalizableXcstrings());

    expect(catalog.strings['Add Glass'].localizations.de.stringUnit.value).toBe('Glas hinzufügen');
    expect(catalog.strings['Log one Glass'].localizations.de.stringUnit.value).toBe(
      'Ein Glas eintragen'
    );
  });
});
