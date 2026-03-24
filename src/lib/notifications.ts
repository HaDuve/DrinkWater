import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import i18next from '@/i18n/i18n';

const NOTIFICATION_ID_KEY = '@water_reminder_notification_id';

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

const notifications = getNotificationsModule();

notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Seconds between water reminders from interval hours (minimum 60s). */
export function waterReminderIntervalSeconds(intervalHours: number): number {
  return Math.max(60, Math.round(intervalHours * 3600));
}

/** Trigger input used when scheduling and when resolving next fire time. */
export function waterReminderTriggerFromIntervalHours(
  intervalHours: number,
): import('expo-notifications').SchedulableNotificationTriggerInput {
  const Notifications = getNotificationsModule();
  if (Notifications) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: waterReminderIntervalSeconds(intervalHours),
      repeats: true,
    };
  }
  return {
    type: 'timeInterval' as unknown as import('expo-notifications').SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: waterReminderIntervalSeconds(intervalHours),
    repeats: true,
  };
}

export type WaterReminderUiState =
  | { kind: 'web' }
  | { kind: 'app_off' }
  | { kind: 'no_permission' }
  | { kind: 'inactive' }
  | { kind: 'active'; nextTriggerMs: number };

function timeIntervalFromNotificationTrigger(
  trigger: import('expo-notifications').NotificationTrigger,
): { seconds: number; repeats: boolean } | null {
  if (
    trigger === null ||
    typeof trigger !== 'object' ||
    !('seconds' in trigger) ||
    !('repeats' in trigger)
  ) {
    return null;
  }
  const seconds = (trigger as { seconds: unknown }).seconds;
  const repeats = (trigger as { repeats: unknown }).repeats;
  if (typeof seconds !== 'number' || typeof repeats !== 'boolean') return null;
  return { seconds, repeats };
}

function scheduledReminderMatchesInterval(
  request: import('expo-notifications').NotificationRequest,
  intervalHours: number,
): boolean {
  const fromOs = timeIntervalFromNotificationTrigger(request.trigger);
  if (!fromOs || !fromOs.repeats) return false;
  return fromOs.seconds === waterReminderIntervalSeconds(intervalHours);
}

async function resolveWaterReminderUiState(
  remindersEnabled: boolean,
  intervalHours: number,
): Promise<WaterReminderUiState> {
  if (Platform.OS === 'web') return { kind: 'web' };
  if (!remindersEnabled) return { kind: 'app_off' };

  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return { kind: 'web' };

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return { kind: 'no_permission' };

    const storedId = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const match = storedId
      ? scheduled.find((n) => n.identifier === storedId)
      : undefined;

    if (!match) return { kind: 'inactive' };

    const fromOs = timeIntervalFromNotificationTrigger(match.trigger);
    const triggerForNext: import('expo-notifications').SchedulableNotificationTriggerInput = fromOs
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: fromOs.seconds,
          repeats: fromOs.repeats,
        }
      : waterReminderTriggerFromIntervalHours(intervalHours);

    const next = await Notifications.getNextTriggerDateAsync(triggerForNext);
    if (next == null) return { kind: 'inactive' };
    return { kind: 'active', nextTriggerMs: next };
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
  intervalHours: number,
): Promise<WaterReminderUiState> {
  const first = await resolveWaterReminderUiState(remindersEnabled, intervalHours);
  if (
    first.kind !== 'inactive' ||
    !remindersEnabled ||
    Platform.OS === 'web'
  ) {
    return first;
  }
  const Notifications = getNotificationsModule();
  if (!Notifications) return { kind: 'web' };
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return first;

  await new Promise((r) => setTimeout(r, 280));
  return resolveWaterReminderUiState(remindersEnabled, intervalHours);
}

export async function ensureAndroidChannel(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('water-reminders', {
      name: i18next.t('notifications.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;
  if (Platform.OS === 'web') return false;
  await ensureAndroidChannel();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelWaterReminders(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  if (Platform.OS === 'web') return;
  const id = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(NOTIFICATION_ID_KEY);
  }
}

/**
 * Schedules one repeating local notification. Cancels any previous water reminder schedule.
 */
export async function scheduleWaterReminders(intervalHours: number): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;
  if (Platform.OS === 'web') return false;
  await cancelWaterReminders();
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  const trigger = waterReminderTriggerFromIntervalHours(intervalHours);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: i18next.t('notifications.title'),
      body: i18next.t('notifications.body'),
    },
    trigger,
  });
  await AsyncStorage.setItem(NOTIFICATION_ID_KEY, identifier);
  return true;
}

/**
 * Applies reminder settings: schedules when enabled, cancels when disabled.
 * When reminders stay on with the same interval, leaves the existing schedule in place so
 * AsyncStorage id and OS state are not briefly cleared (which broke the home reminder line on restart).
 */
export async function syncWaterReminders(
  enabled: boolean,
  intervalHours: number,
): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  if (Platform.OS === 'web') return;
  if (!enabled) {
    await cancelWaterReminders();
    return;
  }

  const storedId = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const match = storedId
    ? scheduled.find((n) => n.identifier === storedId)
    : undefined;

  if (match && scheduledReminderMatchesInterval(match, intervalHours)) {
    return;
  }

  await scheduleWaterReminders(intervalHours);
}
