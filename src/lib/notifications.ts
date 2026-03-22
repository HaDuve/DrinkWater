import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOTIFICATION_ID_KEY = '@water_reminder_notification_id';

Notifications.setNotificationHandler({
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
export function waterReminderTriggerFromIntervalHours(intervalHours: number) {
  return {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: waterReminderIntervalSeconds(intervalHours),
    repeats: true,
  } as const;
}

export type WaterReminderUiState =
  | { kind: 'web' }
  | { kind: 'app_off' }
  | { kind: 'no_permission' }
  | { kind: 'inactive' }
  | { kind: 'active'; nextTriggerMs: number };

function timeIntervalFromNotificationTrigger(
  trigger: Notifications.NotificationTrigger,
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

/**
 * Resolves home-screen reminder status: settings, permission, OS schedule, next trigger.
 */
export async function getWaterReminderUiState(
  remindersEnabled: boolean,
  intervalHours: number,
): Promise<WaterReminderUiState> {
  if (Platform.OS === 'web') return { kind: 'web' };
  if (!remindersEnabled) return { kind: 'app_off' };

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return { kind: 'no_permission' };

    const storedId = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const match = storedId
      ? scheduled.find((n) => n.identifier === storedId)
      : undefined;

    if (!match) return { kind: 'inactive' };

    const fromOs = timeIntervalFromNotificationTrigger(match.trigger);
    const triggerForNext: Notifications.SchedulableNotificationTriggerInput = fromOs
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

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('water-reminders', {
      name: 'Water reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureAndroidChannel();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelWaterReminders(): Promise<void> {
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
  if (Platform.OS === 'web') return false;
  await cancelWaterReminders();
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  const trigger = waterReminderTriggerFromIntervalHours(intervalHours);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to hydrate',
      body: 'Log a glass of water in DrinkWater.',
    },
    trigger,
  });
  await AsyncStorage.setItem(NOTIFICATION_ID_KEY, identifier);
  return true;
}

/**
 * Applies reminder settings: schedules when enabled, cancels when disabled.
 */
export async function syncWaterReminders(
  enabled: boolean,
  intervalHours: number,
): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!enabled) {
    await cancelWaterReminders();
    return;
  }
  await scheduleWaterReminders(intervalHours);
}
