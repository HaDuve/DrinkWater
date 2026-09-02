import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ReminderWindow } from '@/features/water/domain/glass-schedule';

import {
  cancelWaterReminders,
  getWaterReminderUiState,
  scheduledGlassSlotsMatch,
  syncWaterReminders,
  waterReminderTriggerFromSlot,
} from './notifications';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('@/i18n/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockGetAllScheduledNotificationsAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetNextTriggerDateAsync = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    TIME_INTERVAL: 'timeInterval',
  },
  AndroidImportance: { DEFAULT: 3 },
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) =>
    mockCancelScheduledNotificationAsync(...args),
  getAllScheduledNotificationsAsync: () => mockGetAllScheduledNotificationsAsync(),
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  getNextTriggerDateAsync: (...args: unknown[]) => mockGetNextTriggerDateAsync(...args),
  setNotificationChannelAsync: (...args: unknown[]) => mockSetNotificationChannelAsync(...args),
}));

const defaultWindow: ReminderWindow = {
  start: { hour: 8, minute: 30 },
  end: { hour: 17, minute: 0 },
};

const defaultScheduleInput = {
  goalMl: 2000,
  glassMl: 250,
  window: defaultWindow,
};

const expectedDefaultSlots = [
  { hour: 8, minute: 30 },
  { hour: 9, minute: 43 },
  { hour: 10, minute: 56 },
  { hour: 12, minute: 9 },
  { hour: 13, minute: 21 },
  { hour: 14, minute: 34 },
  { hour: 15, minute: 47 },
  { hour: 17, minute: 0 },
];

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockScheduleNotificationAsync.mockImplementation(
    async () => `id-${mockScheduleNotificationAsync.mock.calls.length}`,
  );
  mockCancelScheduledNotificationAsync.mockResolvedValue(undefined);
  mockGetAllScheduledNotificationsAsync.mockResolvedValue([]);
  mockGetNextTriggerDateAsync.mockResolvedValue(null);
});

describe('waterReminderTriggerFromSlot', () => {
  it('builds a daily trigger at the slot hour and minute', () => {
    expect(waterReminderTriggerFromSlot({ hour: 8, minute: 30 })).toEqual({
      type: 'daily',
      hour: 8,
      minute: 30,
    });
  });
});

describe('scheduledGlassSlotsMatch', () => {
  it('returns true when scheduled daily triggers match expected slots', () => {
    const scheduled = expectedDefaultSlots.map((slot) => ({
      trigger: { type: 'daily', hour: slot.hour, minute: slot.minute },
    }));

    expect(scheduledGlassSlotsMatch(scheduled, expectedDefaultSlots)).toBe(true);
  });

  it('returns false when slot count or times differ', () => {
    const scheduled = [{ trigger: { type: 'daily', hour: 8, minute: 30 } }];

    expect(scheduledGlassSlotsMatch(scheduled, expectedDefaultSlots)).toBe(false);
  });
});

describe('syncWaterReminders', () => {
  it('schedules one daily notification per computed glass slot', async () => {
    await syncWaterReminders(true, defaultScheduleInput);

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(8);
    expect(mockScheduleNotificationAsync.mock.calls.map(([request]) => request.trigger)).toEqual(
      expectedDefaultSlots.map((slot) => ({
        type: 'daily',
        hour: slot.hour,
        minute: slot.minute,
      })),
    );

    const storedIds = JSON.parse(
      (await AsyncStorage.getItem('@water_reminder_notification_ids')) ?? '[]',
    ) as string[];
    expect(storedIds).toHaveLength(8);
  });

  it('cancels previous reminder ids before rescheduling', async () => {
    await AsyncStorage.setItem(
      '@water_reminder_notification_ids',
      JSON.stringify(['old-a', 'old-b']),
    );

    await syncWaterReminders(true, defaultScheduleInput);

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('old-a');
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('old-b');
  });

  it('cancels legacy single-id reminders before rescheduling', async () => {
    await AsyncStorage.setItem('@water_reminder_notification_id', 'legacy-id');

    await syncWaterReminders(true, defaultScheduleInput);

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('legacy-id');
    expect(await AsyncStorage.getItem('@water_reminder_notification_id')).toBeNull();
  });

  it('cancels all reminders when disabled', async () => {
    await AsyncStorage.setItem(
      '@water_reminder_notification_ids',
      JSON.stringify(['slot-1', 'slot-2']),
    );

    await syncWaterReminders(false, defaultScheduleInput);

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('slot-1');
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('slot-2');
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('@water_reminder_notification_ids')).toBeNull();
  });

  it('leaves the OS schedule unchanged when slots already match', async () => {
    const ids = ['slot-1', 'slot-2'];
    await AsyncStorage.setItem('@water_reminder_notification_ids', JSON.stringify(ids));
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: 'slot-1',
        trigger: { type: 'daily', hour: 8, minute: 30 },
      },
      {
        identifier: 'slot-2',
        trigger: { type: 'daily', hour: 17, minute: 0 },
      },
    ]);

    await syncWaterReminders(true, {
      goalMl: 500,
      glassMl: 250,
      window: defaultWindow,
    });

    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  it('does not depend on intake — static timetable when goal changes', async () => {
    await syncWaterReminders(true, defaultScheduleInput);
    mockScheduleNotificationAsync.mockClear();
    mockCancelScheduledNotificationAsync.mockClear();

    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      expectedDefaultSlots.map((slot, index) => ({
        identifier: `id-${index + 1}`,
        trigger: { type: 'daily', hour: slot.hour, minute: slot.minute },
      })),
    );
    await AsyncStorage.setItem(
      '@water_reminder_notification_ids',
      JSON.stringify(expectedDefaultSlots.map((_, index) => `id-${index + 1}`)),
    );

    await syncWaterReminders(true, defaultScheduleInput);

    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cancelWaterReminders', () => {
  it('cancels every stored glass-slot notification id', async () => {
    await AsyncStorage.setItem(
      '@water_reminder_notification_ids',
      JSON.stringify(['a', 'b', 'c']),
    );

    await cancelWaterReminders();

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
    expect(await AsyncStorage.getItem('@water_reminder_notification_ids')).toBeNull();
  });
});

describe('getWaterReminderUiState', () => {
  it('returns the chronologically next upcoming slot among scheduled notifications', async () => {
    const now = Date.now();
    const ids = expectedDefaultSlots.map((_, index) => `slot-${index}`);
    await AsyncStorage.setItem('@water_reminder_notification_ids', JSON.stringify(ids));
    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      expectedDefaultSlots.map((slot, index) => ({
        identifier: `slot-${index}`,
        trigger: { type: 'daily', hour: slot.hour, minute: slot.minute },
      })),
    );
    mockGetNextTriggerDateAsync.mockImplementation(async (trigger: { hour: number; minute: number }) => {
      if (trigger.hour === 8 && trigger.minute === 30) return now + 15 * 60_000;
      return now + 8 * 60 * 60_000;
    });

    const state = await getWaterReminderUiState(true, defaultScheduleInput);

    expect(state).toEqual({ kind: 'active', nextTriggerMs: now + 15 * 60_000 });
  });
});
