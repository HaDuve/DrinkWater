import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  goalMl: '@water_goal_ml',
  glassMl: '@water_glass_ml',
  intakeMl: '@water_intake_ml',
  intervalHours: '@water_interval_hours',
  lastResetDate: '@water_last_reset_date',
  remindersEnabled: '@water_reminders_enabled',
} as const;

const DEFAULTS = {
  goalMl: 2000,
  glassMl: 250,
  intakeMl: 0,
  intervalHours: 2,
  remindersEnabled: true,
};

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseNumber(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export type WaterSettings = {
  goalMl: number;
  glassMl: number;
  intakeMl: number;
  intervalHours: number;
  lastResetDate: string;
  remindersEnabled: boolean;
};

/**
 * Loads persisted water tracker state and rolls daily intake when the calendar day changes.
 */
export async function loadWaterState(): Promise<WaterSettings> {
  const [
    goalMlEntry,
    glassMlEntry,
    intakeMlEntry,
    intervalEntry,
    lastResetEntry,
    remindersEntry,
  ] = await AsyncStorage.multiGet([
    KEYS.goalMl,
    KEYS.glassMl,
    KEYS.intakeMl,
    KEYS.intervalHours,
    KEYS.lastResetDate,
    KEYS.remindersEnabled,
  ]);

  const today = todayISO();
  const storedDate = lastResetEntry[1];
  let intakeMl = parseNumber(intakeMlEntry[1], DEFAULTS.intakeMl);

  if (storedDate !== today) {
    intakeMl = 0;
    await AsyncStorage.multiSet([
      [KEYS.intakeMl, '0'],
      [KEYS.lastResetDate, today],
    ]);
  }

  return {
    goalMl: Math.max(100, parseNumber(goalMlEntry[1], DEFAULTS.goalMl)),
    glassMl: Math.max(50, parseNumber(glassMlEntry[1], DEFAULTS.glassMl)),
    intakeMl: Math.max(0, intakeMl),
    intervalHours: Math.max(
      1,
      Math.min(12, parseNumber(intervalEntry[1], DEFAULTS.intervalHours)),
    ),
    lastResetDate: today,
    remindersEnabled: remindersEntry[1] !== 'false',
  };
}

export async function saveGoalMl(goalMl: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.goalMl, String(Math.max(100, goalMl)));
}

export async function saveGlassMl(glassMl: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.glassMl, String(Math.max(50, glassMl)));
}

export async function saveIntervalHours(hours: number): Promise<void> {
  const h = Math.max(1, Math.min(12, Math.round(hours)));
  await AsyncStorage.setItem(KEYS.intervalHours, String(h));
}

export async function saveRemindersEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.remindersEnabled, enabled ? 'true' : 'false');
}

export async function setIntakeMl(ml: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.intakeMl, String(Math.max(0, ml)));
}

export async function addGlassAmount(amountMl: number): Promise<void> {
  const state = await loadWaterState();
  await setIntakeMl(state.intakeMl + Math.max(0, amountMl));
}

export async function removeGlassAmount(amountMl: number): Promise<void> {
  const state = await loadWaterState();
  await setIntakeMl(Math.max(0, state.intakeMl - Math.max(0, amountMl)));
}
