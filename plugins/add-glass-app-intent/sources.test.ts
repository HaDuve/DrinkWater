import {
  ADD_GLASS_DEEP_LINK,
  APP_SHORTCUT_PHRASES,
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

  it('registers English App Shortcut phrases for Siri discovery', () => {
    const swift = buildDrinkWaterAppShortcutsSwift();

    expect(swift).toContain('AppShortcutsProvider');
    expect(swift).toContain('AddGlassIntent()');
    for (const { en } of APP_SHORTCUT_PHRASES) {
      const swiftPhrase = en.replaceAll('${applicationName}', '\\(.applicationName)');
      expect(swift).toContain(`"${swiftPhrase}"`);
    }
  });

  it('localizes App Shortcut phrases for German in AppShortcuts.xcstrings', () => {
    const catalog = JSON.parse(buildAppShortcutsXcstrings());

    expect(catalog.sourceLanguage).toBe('en');
    for (const { en, de } of APP_SHORTCUT_PHRASES) {
      expect(catalog.strings[en].localizations.en.stringUnit.value).toBe(en);
      expect(catalog.strings[en].localizations.de.stringUnit.value).toBe(de);
    }
  });

  it('localizes Add Glass title for German in Localizable.xcstrings', () => {
    const catalog = JSON.parse(buildLocalizableXcstrings());

    expect(catalog.strings['Add Glass'].localizations.de.stringUnit.value).toBe('Glas hinzufügen');
    expect(catalog.strings['Log one Glass'].localizations.de.stringUnit.value).toBe(
      'Ein Glas eintragen'
    );
  });
});
