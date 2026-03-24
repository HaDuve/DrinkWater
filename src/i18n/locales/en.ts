export const en = {
  tabs: {
    home: "Home",
    history: "History",
    settings: "Settings",
    docs: "Docs",
  },
  brand: {
    name: "DrinkWater",
  },
  home: {
    subtitle: "Today's progress",
    goalReached: "Goal reached!",
    percentToGo: "{{percent}}% to go",
    addGlass: "+ Glass ({{ml}} ml)",
    undoGlass: "Undo glass",
    intakeGoal: "{{intake}} / {{goal}} ml",
  },
  settings: {
    title: "Settings",
    dailyGoalMl: "Daily goal (ml)",
    glassSizeMl: "Glass size (ml)",
    reminderIntervalHours: "Reminder interval (hours)",
    reminderHint: "Repeating local notification every N hours (1–12).",
    reminders: "Reminders",
    save: "Save settings",
    alertInvalidGoalTitle: "Invalid goal",
    alertInvalidGoalMessage: "Daily goal must be at least 100 ml.",
    alertInvalidGlassTitle: "Invalid glass size",
    alertInvalidGlassMessage: "Glass size must be at least 50 ml.",
    alertInvalidIntervalTitle: "Invalid interval",
    alertInvalidIntervalMessage:
      "Reminder interval must be between 1 and 12 hours.",
    alertSavedTitle: "Saved",
    alertSavedNotificationsHint: "Allow notifications if prompted.",
    alertSavedGeneric: "Your settings were updated.",
  },
  history: {
    title: "History",
    subtitle: "Previous days",
    today: "Today",
    previousDays: "Previous days",
    empty: "No water intake history yet.",
    emptyTitle: "No history yet",
    emptyHint: "Log your first glass from Home to start tracking progress.",
    lowHistoryHint: "Keep logging for a few more days to unlock clearer trends.",
    periodSummaryTitle: "Period summary",
    hitRate: "Goal hit rate",
    hitRateValue: "{{hitDays}} / {{totalDays}} days ({{hitRate}}%)",
    averagePerDay: "Average per day",
    totalIntake: "Total intake",
    remainingToGoal: "{{ml}} ml left to goal",
    overGoal: "+{{ml}} ml over goal",
    statusAchieved: "Achieved",
    statusMissed: "Missed",
    statusInProgress: "In progress",
    range7: "7d",
    range30: "30d",
    range90: "90d",
    debugModeOn: "Debug mode: fake data on",
    debugModeOff: "Debug mode: off",
    chartModeDaily: "Daily view",
    chartModeTwoDayAverage: "2-day average",
    chartModeWeeklyAverage: "Weekly average",
    goalLineLabel: "Goal line (100%)",
    mlValue: "{{ml}} ml",
    percentOfGoal: "{{percent}}% of goal",
  },
  reminder: {
    web: "Reminders are available on iOS and Android.",
    appOff: "Reminders off.",
    noPermission: "Notifications disabled.",
    inactive: "Reminder not scheduled.",
    nextIn: "Next reminder in {{time}}.",
    linkSettings: "Settings",
    linkTurnOn: "Turn on in Settings",
    linkSetup: "Set up in Settings",
    a11yScheduled: "Reminder scheduled",
    a11yNotScheduled: "No reminder scheduled",
    timeSoon: "soon",
    timeLessThanMinute: "less than 1 min",
    timeMinutes: "{{count}} min",
    timeHoursWhole: "{{count}} h",
    timeHoursDecimal: "{{hours}} h",
  },
  notifications: {
    channelName: "Water reminders",
    title: "Time to hydrate",
    body: "Log a glass of water in DrinkWater.",
  },
  hintRow: {
    tryEditing: "Try editing",
    defaultHint: "app/index.tsx",
  },
} as const;

type TranslationValue<V> = V extends string
  ? string
  : V extends Record<string, unknown>
    ? { [K in keyof V]: TranslationValue<V[K]> }
    : never;

/** Shape of `en` / `de` trees; leaf values are widened to `string` for locale files. */
export type TranslationResources = TranslationValue<typeof en>;
