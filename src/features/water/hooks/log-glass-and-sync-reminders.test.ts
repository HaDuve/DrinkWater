import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadWaterState, saveGlassMl, setIntakeMl } from '@/lib/storage';

import { logGlassAndSyncReminders } from './log-glass-and-sync-reminders';

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
  mockSyncWaterReminders.mockResolvedValue(undefined);
});

describe('logGlassAndSyncReminders', () => {
  it('increases Intake by the configured glass size and syncs reminders with that Intake', async () => {
    await saveGlassMl(300);
    await loadWaterState();
    await setIntakeMl(100);

    await logGlassAndSyncReminders();

    expect(await loadWaterState()).toMatchObject({ intakeMl: 400, glassMl: 300 });
    expect(mockSyncWaterReminders).toHaveBeenCalledWith(true, {
      goalMl: 2000,
      glassMl: 300,
      intakeMl: 400,
      window: {
        start: { hour: 8, minute: 30 },
        end: { hour: 17, minute: 0 },
      },
    });
  });
});
