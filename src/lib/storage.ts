import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  goalMl: '@water_goal_ml',
  glassMl: '@water_glass_ml',
  intakeMl: '@water_intake_ml',
  dailyHistory: '@water_daily_history_v1',
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

function parseIntOrFallback(value: string | null, fallback: number): number {
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

export type DailyHistoryEntry = {
  date: string;
  intakeMl: number;
};

const HISTORY_RETENTION_DAYS = 90;

function parseDailyHistory(value: string | null): Record<string, number> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const normalized: Record<string, number> = {};
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    for (const [date, amount] of Object.entries(parsed as Record<string, unknown>)) {
      if (!isoDatePattern.test(date)) continue;
      const ml = typeof amount === 'number' ? amount : Number.parseInt(String(amount), 10);
      if (!Number.isFinite(ml)) continue;
      normalized[date] = Math.max(0, Math.round(ml));
    }
    return normalized;
  } catch {
    return {};
  }
}

function dayToUtcEpoch(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map(Number);
  return Date.UTC(y || 1970, (m || 1) - 1, d || 1);
}

function pruneHistoryMap(
  history: Record<string, number>,
  keepDays: number = HISTORY_RETENTION_DAYS,
): Record<string, number> {
  const entries = Object.entries(history).sort((a, b) => dayToUtcEpoch(b[0]) - dayToUtcEpoch(a[0]));
  return Object.fromEntries(entries.slice(0, Math.max(1, keepDays)));
}

async function loadDailyHistoryMap(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(KEYS.dailyHistory);
  return parseDailyHistory(raw);
}

async function saveDailyHistoryMap(history: Record<string, number>): Promise<void> {
  const pruned = pruneHistoryMap(history);
  await AsyncStorage.setItem(KEYS.dailyHistory, JSON.stringify(pruned));
}

async function upsertHistoryForDate(date: string, intakeMl: number): Promise<void> {
  const history = await loadDailyHistoryMap();
  history[date] = Math.max(0, Math.round(intakeMl));
  await saveDailyHistoryMap(history);
}

function normalizeSettings(raw: {
  goalMl: string | null;
  glassMl: string | null;
  intervalHours: string | null;
  remindersEnabled: string | null;
}): Pick<WaterSettings, 'goalMl' | 'glassMl' | 'intervalHours' | 'remindersEnabled'> {
  return {
    goalMl: Math.max(100, parseIntOrFallback(raw.goalMl, DEFAULTS.goalMl)),
    glassMl: Math.max(50, parseIntOrFallback(raw.glassMl, DEFAULTS.glassMl)),
    intervalHours: Math.max(1, Math.min(12, parseIntOrFallback(raw.intervalHours, DEFAULTS.intervalHours))),
    remindersEnabled: raw.remindersEnabled !== 'false',
  };
}

function ensureTodayHistoryEntry(
  history: Record<string, number>,
  today: string,
  intakeMl: number,
): { changed: boolean; next: Record<string, number> } {
  const normalizedToday = Math.max(0, intakeMl);
  if (history[today] === normalizedToday) return { changed: false, next: history };
  return { changed: true, next: { ...history, [today]: normalizedToday } };
}

async function readRawWaterState(): Promise<{
  goalMl: string | null;
  glassMl: string | null;
  intakeMl: string | null;
  dailyHistory: string | null;
  intervalHours: string | null;
  lastResetDate: string | null;
  remindersEnabled: string | null;
}> {
  const entries = await AsyncStorage.multiGet([
    KEYS.goalMl,
    KEYS.glassMl,
    KEYS.intakeMl,
    KEYS.dailyHistory,
    KEYS.intervalHours,
    KEYS.lastResetDate,
    KEYS.remindersEnabled,
  ]);
  return {
    goalMl: entries[0]?.[1] ?? null,
    glassMl: entries[1]?.[1] ?? null,
    intakeMl: entries[2]?.[1] ?? null,
    dailyHistory: entries[3]?.[1] ?? null,
    intervalHours: entries[4]?.[1] ?? null,
    lastResetDate: entries[5]?.[1] ?? null,
    remindersEnabled: entries[6]?.[1] ?? null,
  };
}

async function rolloverIfNeeded(
  history: Record<string, number>,
  storedDate: string | null,
  today: string,
  intakeMl: number,
): Promise<{ intakeMl: number; history: Record<string, number> }> {
  if (storedDate !== today) {
    const nextHistory = { ...history };
    if (storedDate) nextHistory[storedDate] = Math.max(0, intakeMl);
    nextHistory[today] = 0;
    await AsyncStorage.multiSet([
      [KEYS.intakeMl, '0'],
      [KEYS.dailyHistory, JSON.stringify(pruneHistoryMap(nextHistory))],
      [KEYS.lastResetDate, today],
    ]);
    return { intakeMl: 0, history: nextHistory };
  }

  const { changed, next } = ensureTodayHistoryEntry(history, today, intakeMl);
  if (changed) await saveDailyHistoryMap(next);
  return { intakeMl: Math.max(0, intakeMl), history: next };
}

/**
 * Loads persisted water tracker state and rolls daily intake when the calendar day changes.
 */
export async function loadWaterState(): Promise<WaterSettings> {
  const raw = await readRawWaterState();
  const today = todayISO();
  const intakeMl = parseIntOrFallback(raw.intakeMl, DEFAULTS.intakeMl);
  const history = parseDailyHistory(raw.dailyHistory);
  const rolled = await rolloverIfNeeded(history, raw.lastResetDate, today, intakeMl);
  const settings = normalizeSettings(raw);

  return {
    goalMl: settings.goalMl,
    glassMl: settings.glassMl,
    intakeMl: rolled.intakeMl,
    intervalHours: settings.intervalHours,
    lastResetDate: today,
    remindersEnabled: settings.remindersEnabled,
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
  const nextMl = Math.max(0, Math.round(ml));
  await AsyncStorage.setItem(KEYS.intakeMl, String(nextMl));
  await upsertHistoryForDate(todayISO(), nextMl);
}

export async function addGlassAmount(amountMl: number): Promise<void> {
  const state = await loadWaterState();
  await setIntakeMl(state.intakeMl + Math.max(0, amountMl));
}

export async function removeGlassAmount(amountMl: number): Promise<void> {
  const state = await loadWaterState();
  await setIntakeMl(Math.max(0, state.intakeMl - Math.max(0, amountMl)));
}

export async function loadDailyHistory(days: number = 7): Promise<DailyHistoryEntry[]> {
  return loadAndSyncDailyHistory(days);
}

async function loadAndSyncDailyHistory(days: number): Promise<DailyHistoryEntry[]> {
  const keepDays = Math.max(1, Math.round(days));
  const today = todayISO();
  const state = await loadWaterState();
  const history = await loadDailyHistoryMap();
  const ensured = ensureTodayHistoryEntry(history, today, state.intakeMl);
  if (ensured.changed) await saveDailyHistoryMap(ensured.next);
  const sorted = Object.entries(ensured.next)
    .sort((a, b) => dayToUtcEpoch(b[0]) - dayToUtcEpoch(a[0]))
    .slice(0, keepDays)
    .map(([date, intake]) => ({
      date,
      intakeMl: Math.max(0, Math.round(intake)),
    }));
  return sorted;
}
