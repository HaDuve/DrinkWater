/** Deep link the Siri App Intent opens so JS logs one Glass. */
const ADD_GLASS_DEEP_LINK = 'drinkwater://add-glass';

const APP_SHORTCUT_PHRASE_KEY = 'Add a glass in ${applicationName}';

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

function buildDrinkWaterAppShortcutsSwift() {
  return `import AppIntents

@available(iOS 16.0, *)
struct DrinkWaterAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AddGlassIntent(),
      phrases: [
        "Add a glass in \\(.applicationName)"
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
  return `${JSON.stringify(
    {
      sourceLanguage: 'en',
      strings: {
        [APP_SHORTCUT_PHRASE_KEY]: localizedStringEntry(
          APP_SHORTCUT_PHRASE_KEY,
          'Glas in ${applicationName} hinzufügen'
        ),
      },
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
  buildAddGlassIntentSwift,
  buildDrinkWaterAppShortcutsSwift,
  buildAppShortcutsXcstrings,
  buildLocalizableXcstrings,
};
