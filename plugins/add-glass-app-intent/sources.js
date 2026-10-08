/** Deep link the Siri App Intent opens so JS logs one Glass. */
const ADD_GLASS_DEEP_LINK = 'drinkwater://add-glass';

/** Document-directory handoff for cold start (must match JS pending-add-glass-deep-link). */
const PENDING_ADD_GLASS_FILENAME = 'pending-add-glass.url';

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
  // OpenURLIntent requires universal links; custom schemes must use openURL for warm opens.
  // Cold start: openAppWhenRun launches without Linking launchOptions, and openURL often fires
  // before JS subscribes — so also write a document-directory handoff for JS to consume.
  return `import AppIntents
import Foundation
import SwiftUI

@available(iOS 16.0, *)
struct AddGlassIntent: AppIntent {
  static var title: LocalizedStringResource = "Add Glass"
  static var description = IntentDescription("Log one Glass")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    writePendingAddGlassHandoff()
    guard let url = URL(string: "${ADD_GLASS_DEEP_LINK}") else {
      return .result()
    }
    EnvironmentValues().openURL(url)
    return .result()
  }
}

private func writePendingAddGlassHandoff() {
  guard let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
    return
  }
  let fileURL = documents.appendingPathComponent("${PENDING_ADD_GLASS_FILENAME}")
  try? "${ADD_GLASS_DEEP_LINK}".data(using: .utf8)?.write(to: fileURL, options: .atomic)
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

function escapeStringsValue(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

/**
 * AppShortcuts.strings per locale — required when deployment target is below iOS 17
 * (AppShortcuts.xcstrings is iOS 17+ only). Keys are the English development phrases.
 */
function buildAppShortcutsStrings(locale) {
  const lines = APP_SHORTCUT_PHRASES.map(({ en, de }) => {
    const value = locale === 'de' ? de : en;
    return `"${escapeStringsValue(en)}" = "${escapeStringsValue(value)}";`;
  });
  return `${lines.join('\n')}\n`;
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
  PENDING_ADD_GLASS_FILENAME,
  APP_SHORTCUT_PHRASES,
  buildAddGlassIntentSwift,
  buildDrinkWaterAppShortcutsSwift,
  buildAppShortcutsStrings,
  buildLocalizableXcstrings,
};
