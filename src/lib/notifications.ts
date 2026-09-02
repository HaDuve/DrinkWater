import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  buildGlassSchedule,
  type GlassScheduleInput,
  type TimeOfDay,
} from '@/features/water/domain/glass-schedule';
import { pickNextGlassSlot } from '@/features/water/domain/next-glass-slot';
import i18next from '@/i18n/i18n';

const LEGACY_NOTIFICATION_ID_KEY = '@water_reminder_notification_id';
const NOTIFICATION_IDS_KEY = '@water_reminder_notification_ids';

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

function timeOfDaySortKey(time: TimeOfDay): number {
  return time.hour * 60 + time.minute;
}

function sortTimeOfDaySlots(slots: TimeOfDay[]): TimeOfDay[] {
  return [...slots].sort((a, b) => timeOfDaySortKey(a) - timeOfDaySortKey(b));
}

export function timeOfDayFromDailyTrigger(
  trigger: import('expo-notifications').NotificationTrigger,
): TimeOfDay | null {
  if (trigger === null || typeof trigger !== 'object') return null;
  if (!('hour' in trigger) || !('minute' in trigger)) return null;

  const hour = (trigger as { hour: unknown }).hour;
  const minute = (trigger as { minute: unknown }).minute;
  if (typeof hour !== 'number' || typeof minute !== 'number') return null;

  return { hour, minute };
}

export function scheduledGlassSlotsMatch(
  scheduled: { trigger: import('expo-notifications').NotificationTrigger }[],
  expectedSlots: TimeOfDay[],
): boolean {
  const fromOs = scheduled
    .map((request) => timeOfDayFromDailyTrigger(request.trigger))
    .filter((slot): slot is TimeOfDay => slot !== null);

  if (fromOs.length !== expectedSlots.length) return false;

  const actual = sortTimeOfDaySlots(fromOs);
  const expected = sortTimeOfDaySlots(expectedSlots);
  return actual.every(
    (slot, index) =>
      slot.hour === expected[index].hour && slot.minute === expected[index].minute,
  );
}

/** Trigger input for one daily glass-slot reminder. */
export function waterReminderTriggerFromSlot(
  slot: TimeOfDay,
): import('expo-notifications').SchedulableNotificationTriggerInput {
  const Notifications = getNotificationsModule();
  if (Notifications) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: slot.hour,
      minute: slot.minute,
    };
  }
  return {
    type: 'daily' as unknown as import('expo-notifications').SchedulableTriggerInputTypes.DAILY,
    hour: slot.hour,
    minute: slot.minute,
  };
}

async function readStoredNotificationIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
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

    const storedIds = await readStoredNotificationIds();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matched = storedIds
      .map((id) => scheduled.find((request) => request.identifier === id))
      .filter((request): request is import('expo-notifications').NotificationRequest => request !== undefined);

    if (!scheduledGlassSlotsMatch(matched, scheduleResult.schedule.slots)) {
      return { kind: 'inactive' };
    }

    const nextTriggerDates = await Promise.all(
      matched.map(async (request) => {
        const slot = timeOfDayFromDailyTrigger(request.trigger);
        if (!slot) return null;
        return Notifications.getNextTriggerDateAsync(waterReminderTriggerFromSlot(slot));
      }),
    );
    const hasScheduledTrigger = nextTriggerDates.some((value) => value != null);
    if (!hasScheduledTrigger) return { kind: 'inactive' };

    const nextSlot = pickNextGlassSlot(scheduleResult.schedule.slots, new Date());
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
    await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);
  }

  const legacyId = await AsyncStorage.getItem(LEGACY_NOTIFICATION_ID_KEY);
  if (legacyId) {
    await Notifications.cancelScheduledNotificationAsync(legacyId);
    await AsyncStorage.removeItem(LEGACY_NOTIFICATION_ID_KEY);
  }
}

/**
 * Schedules one daily local notification per computed glass slot.
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

  const ids: string[] = [];
  for (const slot of scheduleResult.schedule.slots) {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18next.t('notifications.title'),
        body: i18next.t('notifications.body'),
      },
      trigger: waterReminderTriggerFromSlot(slot),
    });
    ids.push(identifier);
  }

  await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  return true;
}

/**
 * Applies reminder settings: schedules daily glass slots when enabled, cancels when disabled.
 * When reminders stay on with the same slot timetable, leaves the existing schedule in place.
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

  const storedIds = await readStoredNotificationIds();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matched = storedIds
    .map((id) => scheduled.find((request) => request.identifier === id))
    .filter((request): request is import('expo-notifications').NotificationRequest => request !== undefined);

  if (scheduledGlassSlotsMatch(matched, scheduleResult.schedule.slots)) {
    return;
  }

  await scheduleWaterReminders(input);
}
