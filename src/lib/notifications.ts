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

  const seconds = Math.max(60, Math.round(intervalHours * 3600));
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to hydrate',
      body: 'Log a glass of water in DrinkWater.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: true,
    },
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
