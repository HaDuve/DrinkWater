import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadWaterState } from '@/lib/storage';

import { saveWaterSettings } from './save-water-settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockSyncWaterReminders = jest.fn();

jest.mock('@/lib/notifications', () => ({
  syncWaterReminders: (...args: unknown[]) => mockSyncWaterReminders(...args),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSyncWaterReminders.mockReset();
});

describe('saveWaterSettings', () => {
  it('rejects an invalid reminder window before persisting it', async () => {
    const result = await saveWaterSettings({
      goalMl: 5000,
      glassMl: 50,
      remindersEnabled: true,
      reminderWindow: {
        start: { hour: 8, minute: 0 },
        end: { hour: 8, minute: 30 },
      },
    });

    expect(result).toEqual({ ok: false, error: 'slots_too_close' });
    expect(await AsyncStorage.getItem('@water_reminder_window_start')).toBeNull();
    expect(mockSyncWaterReminders).not.toHaveBeenCalled();
  });

  it('persists window settings and syncs reminders when validation passes', async () => {
    const reminderWindow = {
      start: { hour: 7, minute: 0 },
      end: { hour: 19, minute: 0 },
    };

    const result = await saveWaterSettings({
      goalMl: 2000,
      glassMl: 250,
      remindersEnabled: true,
      reminderWindow,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.notificationsHint).toBe(true);
    expect(await loadWaterState()).toMatchObject({
      goalMl: 2000,
      glassMl: 250,
      remindersEnabled: true,
      reminderWindow,
    });
    expect(mockSyncWaterReminders).toHaveBeenCalledWith(true, {
      goalMl: 2000,
      glassMl: 250,
      window: reminderWindow,
    });
  });
});
