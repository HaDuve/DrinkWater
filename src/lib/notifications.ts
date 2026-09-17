import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  buildGlassSchedule,
  dateToTimeOfDay,
  type GlassScheduleInput,
  type TimeOfDay,
} from '@/features/water/domain/glass-schedule';
import { buildReminderPlanFireDates } from '@/features/water/domain/remaining-plan';
import i18next from '@/i18n/i18n';
import { loadWaterState } from '@/lib/storage';

const LEGACY_NOTIFICATION_ID_KEY = '@water_reminder_notification_id';
/** Persists `{ ids, fireMs, signature }` for the queued Remaining + tomorrow Default Plan. */
const REMINDER_SCHEDULE_KEY = '@water_reminder_notification_ids';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;

function getNotificationsModule(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  if (notificationsModule) return notificationsModule;
  // Lazy require avoids importing expo-notifications during web static export.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  notificationsModule = require('expo-notifications') as NotificationsModule;
  return notificationsModule;
}

function getNativeNotificationsOrNull(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  return getNotificationsModule();
}

const notifications = getNotificationsModule();

notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type WaterReminderScheduleInput = GlassScheduleInput & {
  intakeMl: number;
};

export type WaterReminderUiState =
  | { kind: 'web' }
  | { kind: 'app_off' }
  | { kind: 'no_permission' }
  | { kind: 'inactive' }
  | { kind: 'active'; nextTriggerMs: number; nextSlot: TimeOfDay; slotDay: 'today' | 'tomorrow' };

type PlanSignature = {
  goalMl: number;
  glassMl: number;
  intakeMl: number;
  windowStartMinutes: number;
  windowEndMinutes: number;
  /** Local calendar day the plan was built for (YYYY-MM-DD). */
  planDate: string;
};

type StoredReminderSchedule = {
  ids: string[];
  fireMs: number[];
  signature: PlanSignature | null;
};

/** Trigger input for one dated glass-slot reminder. */
export function waterReminderTriggerFromDate(
  date: Date,
): import('expo-notifications').SchedulableNotificationTriggerInput {
  const Notifications = getNotificationsModule();
  if (Notifications) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    };
  }
  return {
    type: 'date' as unknown as import('expo-notifications').SchedulableTriggerInputTypes.DATE,
    date,
  };
}

async function readStoredNotificationIds(): Promise<string[]> {
  const stored = await readStoredReminderSchedule();
  return stored.ids;
}

function localPlanDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildPlanSignature(input: WaterReminderScheduleInput, now: Date): PlanSignature {
  return {
    goalMl: input.goalMl,
    glassMl: input.glassMl,
    intakeMl: input.intakeMl,
    windowStartMinutes: input.window.start.hour * 60 + input.window.start.minute,
    windowEndMinutes: input.window.end.hour * 60 + input.window.end.minute,
    planDate: localPlanDate(now),
  };
}

function planSignaturesEqual(
  actual: PlanSignature | null,
  expected: PlanSignature,
): boolean {
  if (!actual) return false;
  return (
    actual.goalMl === expected.goalMl &&
    actual.glassMl === expected.glassMl &&
    actual.intakeMl === expected.intakeMl &&
    actual.windowStartMinutes === expected.windowStartMinutes &&
    actual.windowEndMinutes === expected.windowEndMinutes &&
    actual.planDate === expected.planDate
  );
}

async function readStoredReminderSchedule(): Promise<StoredReminderSchedule> {
  const raw = await AsyncStorage.getItem(REMINDER_SCHEDULE_KEY);
  if (!raw) return { ids: [], fireMs: [], signature: null };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        ids: parsed.filter((id): id is string => typeof id === 'string'),
        fireMs: [],
        signature: null,
      };
    }
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { ids?: unknown }).ids) &&
      Array.isArray((parsed as { fireMs?: unknown }).fireMs)
    ) {
      const ids = (parsed as { ids: unknown[] }).ids.filter(
        (id): id is string => typeof id === 'string',
      );
      const fireMs = (parsed as { fireMs: unknown[] }).fireMs.filter(
        (ms): ms is number => typeof ms === 'number',
      );
      const signatureRaw = (parsed as { signature?: unknown }).signature;
      const signature =
        signatureRaw !== null &&
        typeof signatureRaw === 'object' &&
        typeof (signatureRaw as PlanSignature).goalMl === 'number' &&
        typeof (signatureRaw as PlanSignature).glassMl === 'number' &&
        typeof (signatureRaw as PlanSignature).intakeMl === 'number' &&
        typeof (signatureRaw as PlanSignature).windowStartMinutes === 'number' &&
        typeof (signatureRaw as PlanSignature).windowEndMinutes === 'number' &&
        typeof (signatureRaw as PlanSignature).planDate === 'string'
          ? (signatureRaw as PlanSignature)
          : null;
      return { ids, fireMs, signature };
    }
    return { ids: [], fireMs: [], signature: null };
  } catch {
    return { ids: [], fireMs: [], signature: null };
  }
}

async function saveStoredReminderSchedule(schedule: StoredReminderSchedule): Promise<void> {
  await AsyncStorage.setItem(REMINDER_SCHEDULE_KEY, JSON.stringify(schedule));
}

/**
 * Queued plan stays when the Pacing signature still matches and every still-future
 * stored id remains in the OS queue. Opening the app mid-day is not a rebuild.
 */
function storedScheduleStillQueued(
  stored: StoredReminderSchedule,
  scheduled: { identifier: string }[],
  expectedSignature: PlanSignature,
  nowMs: number,
): boolean {
  if (!planSignaturesEqual(stored.signature, expectedSignature)) {
    return false;
  }
  if (stored.ids.length === 0 || stored.ids.length !== stored.fireMs.length) {
    return false;
  }

  const remainingEntries = stored.ids
    .map((id, index) => ({ id, fireMs: stored.fireMs[index] }))
    .filter((entry) => entry.fireMs > nowMs);

  if (remainingEntries.length === 0) {
    return false;
  }

  return remainingEntries.every((entry) =>
    scheduled.some((request) => request.identifier === entry.id),
  );
}

function pickNextQueuedFire(
  fireMs: number[],
  now: Date,
): { nextTriggerMs: number; nextSlot: TimeOfDay; slotDay: 'today' | 'tomorrow' } | null {
  const nowMs = now.getTime();
  const future = fireMs.filter((ms) => ms > nowMs).sort((a, b) => a - b);
  if (future.length === 0) return null;

  const nextTriggerMs = future[0];
  const trigger = new Date(nextTriggerMs);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterStart = new Date(tomorrowStart);
  dayAfterStart.setDate(dayAfterStart.getDate() + 1);

  let slotDay: 'today' | 'tomorrow' = 'today';
  if (nextTriggerMs >= tomorrowStart.getTime() && nextTriggerMs < dayAfterStart.getTime()) {
    slotDay = 'tomorrow';
  } else if (nextTriggerMs >= dayAfterStart.getTime()) {
    slotDay = 'tomorrow';
  }

  return {
    nextTriggerMs,
    nextSlot: dateToTimeOfDay(trigger),
    slotDay,
  };
}

async function resolveWaterReminderUiState(
  remindersEnabled: boolean,
  input: WaterReminderScheduleInput,
): Promise<WaterReminderUiState> {
  if (Platform.OS === 'web') return { kind: 'web' };
  if (!remindersEnabled) return { kind: 'app_off' };

  try {
    const Notifications = getNativeNotificationsOrNull();
    if (!Notifications) return { kind: 'web' };

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return { kind: 'no_permission' };

    const scheduleResult = buildGlassSchedule(input);
    if (!scheduleResult.ok) return { kind: 'inactive' };

    const now = new Date();
    const stored = await readStoredReminderSchedule();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const signature = buildPlanSignature(input, now);

    if (!storedScheduleStillQueued(stored, scheduled, signature, now.getTime())) {
      return { kind: 'inactive' };
    }

    const next = pickNextQueuedFire(stored.fireMs, now);
    if (!next) return { kind: 'inactive' };

    return {
      kind: 'active',
      nextTriggerMs: next.nextTriggerMs,
      nextSlot: next.nextSlot,
      slotDay: next.slotDay,
    };
  } catch {
    return { kind: 'inactive' };
  }
}

/**
 * Resolves home-screen reminder status: settings, permission, OS schedule, next trigger.
 * Retries once after a short delay when the UI would look "inactive" while reminders are on —
 * avoids a race with {@link syncWaterReminders} (cancel-then-schedule) on cold start.
 */
export async function getWaterReminderUiState(
  remindersEnabled: boolean,
  input: WaterReminderScheduleInput,
): Promise<WaterReminderUiState> {
  const first = await resolveWaterReminderUiState(remindersEnabled, input);
  if (first.kind !== 'inactive' || !remindersEnabled || Platform.OS === 'web') {
    return first;
  }
  const Notifications = getNotificationsModule();
  if (!Notifications) return { kind: 'web' };
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return first;

  await new Promise((r) => setTimeout(r, 280));
  return resolveWaterReminderUiState(remindersEnabled, input);
}

export async function ensureAndroidChannel(): Promise<void> {
  const Notifications = getNativeNotificationsOrNull();
  if (!Notifications) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('water-reminders', {
      name: i18next.t('notifications.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNativeNotificationsOrNull();
  if (!Notifications) return false;
  await ensureAndroidChannel();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelWaterReminders(): Promise<void> {
  const Notifications = getNativeNotificationsOrNull();
  if (!Notifications) return;

  const ids = await readStoredNotificationIds();
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  if (ids.length > 0) {
    await AsyncStorage.removeItem(REMINDER_SCHEDULE_KEY);
  }

  const legacyId = await AsyncStorage.getItem(LEGACY_NOTIFICATION_ID_KEY);
  if (legacyId) {
    await Notifications.cancelScheduledNotificationAsync(legacyId);
    await AsyncStorage.removeItem(LEGACY_NOTIFICATION_ID_KEY);
  }
}

/**
 * Schedules dated one-shots for today's Remaining Plan and tomorrow's Default Plan.
 * Cancels any previous water reminder schedule first.
 */
export async function scheduleWaterReminders(input: WaterReminderScheduleInput): Promise<boolean> {
  const Notifications = getNativeNotificationsOrNull();
  if (!Notifications) return false;

  const scheduleResult = buildGlassSchedule(input);
  if (!scheduleResult.ok) return false;

  await cancelWaterReminders();
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  const now = new Date();
  const fireDates = buildReminderPlanFireDates({
    goalMl: input.goalMl,
    glassMl: input.glassMl,
    intakeMl: input.intakeMl,
    window: input.window,
    now,
  });
  const ids: string[] = [];
  for (const date of fireDates) {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18next.t('notifications.title'),
        body: i18next.t('notifications.body'),
      },
      trigger: waterReminderTriggerFromDate(date),
    });
    ids.push(identifier);
  }

  await saveStoredReminderSchedule({
    ids,
    fireMs: fireDates.map((date) => date.getTime()),
    signature: buildPlanSignature(input, now),
  });
  return true;
}

/**
 * Applies reminder settings. Rebuilds on Pacing Event signature changes or empty queue;
 * leaves the OS schedule when Intake and plan settings are unchanged.
 */
export async function syncWaterReminders(
  enabled: boolean,
  input: WaterReminderScheduleInput,
): Promise<void> {
  const Notifications = getNativeNotificationsOrNull();
  if (!Notifications) return;
  if (!enabled) {
    await cancelWaterReminders();
    return;
  }

  const scheduleResult = buildGlassSchedule(input);
  if (!scheduleResult.ok) {
    await cancelWaterReminders();
    return;
  }

  const now = new Date();
  const stored = await readStoredReminderSchedule();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const signature = buildPlanSignature(input, now);

  if (storedScheduleStillQueued(stored, scheduled, signature, now.getTime())) {
    return;
  }

  await scheduleWaterReminders(input);
}

/** Loads current water state and syncs the reminder plan (Pacing Event helper). */
export async function syncWaterRemindersFromState(): Promise<void> {
  const state = await loadWaterState();
  await syncWaterReminders(state.remindersEnabled, {
    goalMl: state.goalMl,
    glassMl: state.glassMl,
    intakeMl: state.intakeMl,
    window: state.reminderWindow,
  });
}
