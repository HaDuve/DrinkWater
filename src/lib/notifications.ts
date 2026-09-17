import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  buildGlassSchedule,
  type GlassScheduleInput,
  type TimeOfDay,
} from '@/features/water/domain/glass-schedule';
import { buildDefaultPlanFireDates } from '@/features/water/domain/default-plan-fire-dates';
import { pickNextGlassSlot } from '@/features/water/domain/next-glass-slot';
import i18next from '@/i18n/i18n';

const LEGACY_NOTIFICATION_ID_KEY = '@water_reminder_notification_id';
/** Persists `{ ids, fireMs }` for the queued today+tomorrow Default Plan one-shots. */
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

export type WaterReminderScheduleInput = GlassScheduleInput;

export type WaterReminderUiState =
  | { kind: 'web' }
  | { kind: 'app_off' }
  | { kind: 'no_permission' }
  | { kind: 'inactive' }
  | { kind: 'active'; nextTriggerMs: number; nextSlot: TimeOfDay; slotDay: 'today' | 'tomorrow' };

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

type StoredReminderSchedule = {
  ids: string[];
  fireMs: number[];
};

function fireMsListsEqual(actual: number[], expected: number[]): boolean {
  if (actual.length !== expected.length) return false;
  const sortedActual = [...actual].sort((a, b) => a - b);
  const sortedExpected = [...expected].sort((a, b) => a - b);
  return sortedActual.every((ms, index) => ms === sortedExpected[index]);
}

async function readStoredReminderSchedule(): Promise<StoredReminderSchedule> {
  const raw = await AsyncStorage.getItem(REMINDER_SCHEDULE_KEY);
  if (!raw) return { ids: [], fireMs: [] };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        ids: parsed.filter((id): id is string => typeof id === 'string'),
        fireMs: [],
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
      return { ids, fireMs };
    }
    return { ids: [], fireMs: [] };
  } catch {
    return { ids: [], fireMs: [] };
  }
}

async function saveStoredReminderSchedule(schedule: StoredReminderSchedule): Promise<void> {
  await AsyncStorage.setItem(REMINDER_SCHEDULE_KEY, JSON.stringify(schedule));
}

/**
 * Queued Default Plan is still valid when remaining (still-future) stored fires
 * match the expected future set and those ids are still present in the OS.
 * Past one-shots may already have delivered and left the queue.
 */
function storedScheduleMatchesOs(
  stored: StoredReminderSchedule,
  scheduled: { identifier: string }[],
  expectedFireMs: number[],
  nowMs: number,
): boolean {
  if (stored.ids.length === 0 || stored.ids.length !== stored.fireMs.length) {
    return false;
  }

  const remainingEntries = stored.ids
    .map((id, index) => ({ id, fireMs: stored.fireMs[index] }))
    .filter((entry) => entry.fireMs > nowMs);

  if (!fireMsListsEqual(
    remainingEntries.map((entry) => entry.fireMs),
    expectedFireMs,
  )) {
    return false;
  }

  return remainingEntries.every((entry) =>
    scheduled.some((request) => request.identifier === entry.id),
  );
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
    const expectedFireDates = buildDefaultPlanFireDates(scheduleResult.schedule.slots, now);
    const expectedFireMs = expectedFireDates.map((date) => date.getTime());

    const stored = await readStoredReminderSchedule();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    if (!storedScheduleMatchesOs(stored, scheduled, expectedFireMs, now.getTime())) {
      return { kind: 'inactive' };
    }

    const hasFutureFire = expectedFireMs.some((ms) => ms > now.getTime());
    if (!hasFutureFire) return { kind: 'inactive' };

    const nextSlot = pickNextGlassSlot(scheduleResult.schedule.slots, now);
    if (!nextSlot) return { kind: 'inactive' };

    return {
      kind: 'active',
      nextTriggerMs: nextSlot.triggerMs,
      nextSlot: nextSlot.slot,
      slotDay: nextSlot.kind,
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
 * Schedules dated one-shot local notifications for today's and tomorrow's Default Plans.
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

  const fireDates = buildDefaultPlanFireDates(scheduleResult.schedule.slots, new Date());
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
  });
  return true;
}

/**
 * Applies reminder settings: schedules today + tomorrow Default Plan one-shots when enabled,
 * cancels when disabled. When reminders stay on with the same fire times, leaves the OS schedule.
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
  const expectedFireDates = buildDefaultPlanFireDates(scheduleResult.schedule.slots, now);
  const expectedFireMs = expectedFireDates.map((date) => date.getTime());

  const stored = await readStoredReminderSchedule();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  if (storedScheduleMatchesOs(stored, scheduled, expectedFireMs, now.getTime())) {
    return;
  }

  await scheduleWaterReminders(input);
}
