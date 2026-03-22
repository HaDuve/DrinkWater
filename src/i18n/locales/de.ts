import type { TranslationResources } from "./en";

export const de: TranslationResources = {
  tabs: {
    home: "Start",
    settings: "Einstellungen",
    docs: "Doku",
  },
  brand: {
    name: "DrinkWater",
  },
  home: {
    subtitle: "Heutiger Fortschritt",
    goalReached: "Ziel erreicht!",
    percentToGo: "Noch {{percent}} %",
    addGlass: "+ Glas ({{ml}} ml)",
    undoGlass: "Glas rückgängig",
    intakeGoal: "{{intake}} / {{goal}} ml",
  },
  settings: {
    title: "Einstellungen",
    dailyGoalMl: "Tagesziel (ml)",
    glassSizeMl: "Glasmenge (ml)",
    reminderIntervalHours: "Erinnerungsintervall (Stunden)",
    reminderHint:
      "Wiederholende lokale Benachrichtigung alle N Stunden (1–12).",
    reminders: "Erinnerungen",
    save: "Einstellungen speichern",
    alertInvalidGoalTitle: "Ungültiges Ziel",
    alertInvalidGoalMessage: "Das Tagesziel muss mindestens 100 ml betragen.",
    alertInvalidGlassTitle: "Ungültige Glasmenge",
    alertInvalidGlassMessage: "Die Glasmenge muss mindestens 50 ml betragen.",
    alertInvalidIntervalTitle: "Ungültiges Intervall",
    alertInvalidIntervalMessage:
      "Das Erinnerungsintervall muss zwischen 1 und 12 Stunden liegen.",
    alertSavedTitle: "Gespeichert",
    alertSavedNotificationsHint:
      "Erlaube Benachrichtigungen, falls danach gefragt wird.",
    alertSavedGeneric: "Deine Einstellungen wurden aktualisiert.",
  },
  reminder: {
    web: "Erinnerungen sind unter iOS und Android verfügbar.",
    appOff: "Erinnerungen aus.",
    noPermission: "Benachrichtigungen deaktiviert.",
    inactive: "Keine Erinnerung geplant.",
    nextIn: "Nächste Erinnerung in {{time}}.",
    linkSettings: "Einstellungen",
    linkTurnOn: "In Einstellungen aktivieren",
    linkSetup: "In Einstellungen einrichten",
    a11yScheduled: "Erinnerung geplant",
    a11yNotScheduled: "Keine Erinnerung geplant",
    timeSoon: "bald",
    timeLessThanMinute: "weniger als 1 Min.",
    timeMinutes: "{{count}} Min.",
    timeHoursWhole: "{{count}} Std.",
    timeHoursDecimal: "{{hours}} Std.",
  },
  notifications: {
    channelName: "Wasser-Erinnerungen",
    title: "Zeit zu trinken",
    body: "Trag ein Glas Wasser in DrinkWater ein.",
  },
  hintRow: {
    tryEditing: "Zum Bearbeiten",
    defaultHint: "app/index.tsx",
  },
};
