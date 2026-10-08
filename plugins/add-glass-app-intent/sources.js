/** Deep link the Siri App Intent opens so JS logs one Glass. */
const ADD_GLASS_DEEP_LINK = 'drinkwater://add-glass';

const APP_SHORTCUT_PHRASE_KEY = 'Add a glass in ${applicationName}';

function buildAddGlassIntentSwift() {
  return `import AppIntents
import UIKit

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
    await UIApplication.shared.open(url)
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

/** Single string catalog — avoids PBX basename collisions from en/de AppShortcuts.strings. */
function buildAppShortcutsXcstrings() {
  return `${JSON.stringify(
    {
      sourceLanguage: 'en',
      strings: {
        [APP_SHORTCUT_PHRASE_KEY]: {
          localizations: {
            en: {
              stringUnit: {
                state: 'translated',
                value: APP_SHORTCUT_PHRASE_KEY,
              },
            },
            de: {
              stringUnit: {
                state: 'translated',
                value: 'Glas in ${applicationName} hinzufügen',
              },
            },
          },
        },
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
};
