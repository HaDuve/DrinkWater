/** Deep link the Siri App Intent opens so JS logs one Glass. */
const ADD_GLASS_DEEP_LINK = 'drinkwater://add-glass';

/**
 * Development-language (en) App Shortcut phrases + de localizations.
 * Every phrase must include ${applicationName} for Siri discovery.
 */
const APP_SHORTCUT_PHRASES = [
  {
    en: 'Add a glass in ${applicationName}',
    de: 'Glas in ${applicationName} hinzufügen',
  },
  {
    en: 'Log a glass in ${applicationName}',
    de: 'Ein Glas in ${applicationName} eintragen',
  },
  {
    en: 'Add glass in ${applicationName}',
    de: 'Glas hinzufügen in ${applicationName}',
  },
  {
    en: 'Add a glass to the ${applicationName} app',
    de: 'Füge der ${applicationName} App ein Glas hinzu',
  },
];

function buildAddGlassIntentSwift() {
  // OpenURLIntent requires universal links; custom schemes must use openURL.
  return `import AppIntents
import SwiftUI

@available(iOS 16.0, *)
struct AddGlassIntent: AppIntent {
  static var title: LocalizedStringResource = "Add Glass"
  static var description = IntentDescription("Log one Glass")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    guard let url = URL(string: "${ADD_GLASS_DEEP_LINK}") else {
      return .result()
    }
    EnvironmentValues().openURL(url)
    return .result()
  }
}
`;
}

function phraseToSwiftLiteral(enPhrase) {
  return enPhrase.replaceAll('${applicationName}', '\\(.applicationName)');
}

function buildDrinkWaterAppShortcutsSwift() {
  const phraseLines = APP_SHORTCUT_PHRASES.map(
    ({ en }) => `        "${phraseToSwiftLiteral(en)}"`
  ).join(',\n');

  return `import AppIntents

@available(iOS 16.0, *)
struct DrinkWaterAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AddGlassIntent(),
      phrases: [
${phraseLines}
      ],
      shortTitle: "Add Glass",
      systemImageName: "drop.fill"
    )
  }
}
`;
}

function localizedStringEntry(en, de) {
  return {
    localizations: {
      en: { stringUnit: { state: 'translated', value: en } },
      de: { stringUnit: { state: 'translated', value: de } },
    },
  };
}

/** Single string catalog — avoids PBX basename collisions from en/de AppShortcuts.strings. */
function buildAppShortcutsXcstrings() {
  const strings = Object.fromEntries(
    APP_SHORTCUT_PHRASES.map(({ en, de }) => [en, localizedStringEntry(en, de)])
  );

  return `${JSON.stringify(
    {
      sourceLanguage: 'en',
      strings,
      version: '1.0',
    },
    null,
    2
  )}\n`;
}

/** Titles / shortTitle use LocalizedStringResource → Localizable.xcstrings. */
function buildLocalizableXcstrings() {
  return `${JSON.stringify(
    {
      sourceLanguage: 'en',
      strings: {
        'Add Glass': localizedStringEntry('Add Glass', 'Glas hinzufügen'),
        'Log one Glass': localizedStringEntry('Log one Glass', 'Ein Glas eintragen'),
      },
      version: '1.0',
    },
    null,
    2
  )}\n`;
}

module.exports = {
  ADD_GLASS_DEEP_LINK,
  APP_SHORTCUT_PHRASES,
  buildAddGlassIntentSwift,
  buildDrinkWaterAppShortcutsSwift,
  buildAppShortcutsXcstrings,
  buildLocalizableXcstrings,
};
