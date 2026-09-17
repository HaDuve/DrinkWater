import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ReminderWindow } from '@/features/water/domain/glass-schedule';

import {
  cancelWaterReminders,
  getWaterReminderUiState,
  syncWaterReminders,
  waterReminderTriggerFromDate,
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
    DATE: 'date',
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
  intakeMl: 0,
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

describe('waterReminderTriggerFromDate', () => {
  it('builds a dated one-shot trigger at the given Date', () => {
    const date = new Date(2026, 8, 2, 8, 30, 0, 0);
    expect(waterReminderTriggerFromDate(date)).toEqual({
      type: 'date',
      date,
    });
  });
});

describe('syncWaterReminders', () => {
  it('queues today Remaining Plan and tomorrow Default Plan as dated one-shots', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 2, 7, 0, 0));

    await syncWaterReminders(true, defaultScheduleInput);

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(16);
    expect(mockScheduleNotificationAsync.mock.calls.map(([request]) => request.trigger)).toEqual([
      ...expectedDefaultSlots.map((slot) => ({
        type: 'date',
        date: new Date(2026, 8, 2, slot.hour, slot.minute, 0, 0),
      })),
      ...expectedDefaultSlots.map((slot) => ({
        type: 'date',
        date: new Date(2026, 8, 3, slot.hour, slot.minute, 0, 0),
      })),
    ]);

    const stored = JSON.parse(
      (await AsyncStorage.getItem('@water_reminder_notification_ids')) ?? '{}',
    ) as { ids: string[]; fireMs: number[] };
    expect(stored.ids).toHaveLength(16);
    expect(stored.fireMs).toHaveLength(16);

    jest.useRealTimers();
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

  it('leaves the OS schedule unchanged when dated one-shots already match', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 2, 7, 0, 0));

    await syncWaterReminders(true, defaultScheduleInput);
    const scheduledRequests = mockScheduleNotificationAsync.mock.calls.map(([request], index) => ({
      identifier: `id-${index + 1}`,
      trigger: request.trigger,
    }));
    mockGetAllScheduledNotificationsAsync.mockResolvedValue(scheduledRequests);
    mockScheduleNotificationAsync.mockClear();
    mockCancelScheduledNotificationAsync.mockClear();

    await syncWaterReminders(true, defaultScheduleInput);

    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('keeps the queued plan after a Glass Slot time passes without rescheduling', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 2, 7, 0, 0));

    await syncWaterReminders(true, defaultScheduleInput);
    const scheduledAtSeven = mockScheduleNotificationAsync.mock.calls.map(([request], index) => ({
      identifier: `id-${index + 1}`,
      trigger: request.trigger,
      fireMs: (request.trigger as { date: Date }).date.getTime(),
    }));
    // Morning slots already delivered — only remaining OS entries stay queued.
    const remainingOs = scheduledAtSeven.filter(
      (request) => request.fireMs > new Date(2026, 8, 2, 12, 0, 0).getTime(),
    );
    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      remainingOs.map(({ identifier, trigger }) => ({ identifier, trigger })),
    );
    mockScheduleNotificationAsync.mockClear();
    mockCancelScheduledNotificationAsync.mockClear();

    jest.setSystemTime(new Date(2026, 8, 2, 12, 0, 0));
    await syncWaterReminders(true, defaultScheduleInput);

    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('reschedules today and tomorrow one-shots when goal changes the slot count', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 2, 7, 0, 0));

    await syncWaterReminders(true, defaultScheduleInput);
    const previousIds = mockScheduleNotificationAsync.mock.calls.map((_, index) => `id-${index + 1}`);
    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      previousIds.map((identifier) => ({
        identifier,
        trigger: { type: 'timeInterval', seconds: 60, repeats: false },
      })),
    );
    mockScheduleNotificationAsync.mockClear();
    mockCancelScheduledNotificationAsync.mockClear();

    await syncWaterReminders(true, {
      goalMl: 500,
      glassMl: 250,
      intakeMl: 0,
      window: defaultWindow,
    });

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(16);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(4);
    expect(mockScheduleNotificationAsync.mock.calls.map(([request]) => request.trigger)).toEqual([
      { type: 'date', date: new Date(2026, 8, 2, 8, 30, 0, 0) },
      { type: 'date', date: new Date(2026, 8, 2, 17, 0, 0, 0) },
      { type: 'date', date: new Date(2026, 8, 3, 8, 30, 0, 0) },
      { type: 'date', date: new Date(2026, 8, 3, 17, 0, 0, 0) },
    ]);

    jest.useRealTimers();
  });

  it('rebuilds today Remaining Plan after Intake rises early', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 2, 7, 0, 0));

    await syncWaterReminders(true, defaultScheduleInput);
    const previousIds = mockScheduleNotificationAsync.mock.calls.map((_, index) => `id-${index + 1}`);
    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      previousIds.map((identifier) => ({
        identifier,
        trigger: { type: 'timeInterval', seconds: 60, repeats: false },
      })),
    );
    mockScheduleNotificationAsync.mockClear();
    mockCancelScheduledNotificationAsync.mockClear();

    jest.setSystemTime(new Date(2026, 8, 2, 10, 0, 0));
    await syncWaterReminders(true, {
      ...defaultScheduleInput,
      intakeMl: 500,
    });

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalled();
    expect(mockScheduleNotificationAsync.mock.calls.map(([request]) => request.trigger)).toEqual([
      { type: 'date', date: new Date(2026, 8, 2, 10, 1, 0, 0) },
      { type: 'date', date: new Date(2026, 8, 2, 11, 25, 0, 0) },
      { type: 'date', date: new Date(2026, 8, 2, 12, 49, 0, 0) },
      { type: 'date', date: new Date(2026, 8, 2, 14, 12, 0, 0) },
      { type: 'date', date: new Date(2026, 8, 2, 15, 36, 0, 0) },
      { type: 'date', date: new Date(2026, 8, 2, 17, 0, 0, 0) },
      ...expectedDefaultSlots.map((slot) => ({
        type: 'date',
        date: new Date(2026, 8, 3, slot.hour, slot.minute, 0, 0),
      })),
    ]);

    jest.useRealTimers();
  });

  it('does not respread remaining slots when opening mid-day with unchanged Intake', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 2, 7, 0, 0));

    await syncWaterReminders(true, defaultScheduleInput);
    const scheduledAtSeven = mockScheduleNotificationAsync.mock.calls.map(([request], index) => ({
      identifier: `id-${index + 1}`,
      trigger: request.trigger,
      fireMs: (request.trigger as { date: Date }).date.getTime(),
    }));
    const noonMs = new Date(2026, 8, 2, 12, 0, 0).getTime();
    const remainingOs = scheduledAtSeven.filter((request) => request.fireMs > noonMs);
    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      remainingOs.map(({ identifier, trigger }) => ({ identifier, trigger })),
    );
    mockScheduleNotificationAsync.mockClear();
    mockCancelScheduledNotificationAsync.mockClear();

    jest.setSystemTime(new Date(2026, 8, 2, 12, 0, 0));
    await syncWaterReminders(true, defaultScheduleInput);

    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('silences today when Intake meets the Daily Goal and keeps tomorrow Default Plan', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 2, 10, 0, 0));

    await syncWaterReminders(true, {
      goalMl: 500,
      glassMl: 250,
      intakeMl: 500,
      window: defaultWindow,
    });

    expect(mockScheduleNotificationAsync.mock.calls.map(([request]) => request.trigger)).toEqual([
      { type: 'date', date: new Date(2026, 8, 3, 8, 30, 0, 0) },
      { type: 'date', date: new Date(2026, 8, 3, 17, 0, 0, 0) },
    ]);

    jest.useRealTimers();
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

  it('cancels ids from the persisted today+tomorrow schedule payload', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 2, 7, 0, 0));

    await syncWaterReminders(true, {
      goalMl: 500,
      glassMl: 250,
      intakeMl: 0,
      window: defaultWindow,
    });
    mockCancelScheduledNotificationAsync.mockClear();

    await cancelWaterReminders();

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(4);
    expect(await AsyncStorage.getItem('@water_reminder_notification_ids')).toBeNull();

    jest.useRealTimers();
  });
});

describe('getWaterReminderUiState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 2, 7, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays active after save when iOS returns timeInterval triggers for dated one-shots', async () => {
    await syncWaterReminders(true, defaultScheduleInput);

    const stored = JSON.parse(
      (await AsyncStorage.getItem('@water_reminder_notification_ids')) ?? '{}',
    ) as { ids: string[] };
    expect(stored.ids).toHaveLength(16);

    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      stored.ids.map((identifier) => ({
        identifier,
        trigger: { type: 'timeInterval', seconds: 3600, repeats: false },
      })),
    );
    mockGetNextTriggerDateAsync.mockResolvedValue(Date.now() + 90 * 60_000);

    const state = await getWaterReminderUiState(true, defaultScheduleInput);

    expect(state.kind).toBe('active');
    if (state.kind === 'active') {
      expect(state.nextSlot).toEqual({ hour: 8, minute: 30 });
      expect(state.slotDay).toBe('today');
    }
  });

  it('stays active at midday when morning one-shots have already left the OS queue', async () => {
    await syncWaterReminders(true, defaultScheduleInput);
    const stored = JSON.parse(
      (await AsyncStorage.getItem('@water_reminder_notification_ids')) ?? '{}',
    ) as { ids: string[]; fireMs: number[] };
    const noonMs = new Date(2026, 8, 2, 12, 0, 0).getTime();
    const remaining = stored.ids
      .map((id, index) => ({ id, fireMs: stored.fireMs[index] }))
      .filter((entry) => entry.fireMs > noonMs);

    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      remaining.map(({ id }) => ({
        identifier: id,
        trigger: { type: 'timeInterval', seconds: 3600, repeats: false },
      })),
    );
    mockGetNextTriggerDateAsync.mockResolvedValue(noonMs + 90 * 60_000);

    jest.setSystemTime(new Date(2026, 8, 2, 12, 0, 0));
    const state = await getWaterReminderUiState(true, defaultScheduleInput);

    expect(state.kind).toBe('active');
    if (state.kind === 'active') {
      expect(state.nextSlot).toEqual({ hour: 12, minute: 9 });
      expect(state.slotDay).toBe('today');
    }
  });

  it('returns the next domain slot and matching trigger time for display', async () => {
    const firstTrigger = new Date(2026, 8, 2, 8, 30, 0).getTime();
    await syncWaterReminders(true, defaultScheduleInput);
    const stored = JSON.parse(
      (await AsyncStorage.getItem('@water_reminder_notification_ids')) ?? '{}',
    ) as { ids: string[] };
    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      stored.ids.map((identifier) => ({
        identifier,
        trigger: { type: 'timeInterval', seconds: 3600, repeats: false },
      })),
    );
    mockGetNextTriggerDateAsync.mockResolvedValue(Date.now() + 15 * 60_000);

    const state = await getWaterReminderUiState(true, defaultScheduleInput);

    expect(state).toEqual({
      kind: 'active',
      nextTriggerMs: firstTrigger,
      nextSlot: { hour: 8, minute: 30 },
      slotDay: 'today',
    });
  });

  it('shows the next queued Glass Slot at a slot boundary even when OS next triggers differ', async () => {
    jest.setSystemTime(new Date(2026, 8, 2, 7, 0, 0));
    await syncWaterReminders(true, defaultScheduleInput);
    const stored = JSON.parse(
      (await AsyncStorage.getItem('@water_reminder_notification_ids')) ?? '{}',
    ) as { ids: string[]; fireMs: number[] };
    const boundaryMs = new Date(2026, 8, 2, 8, 30, 0).getTime();
    const remaining = stored.ids
      .map((id, index) => ({ id, fireMs: stored.fireMs[index] }))
      .filter((entry) => entry.fireMs > boundaryMs);
    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      remaining.map(({ id }) => ({
        identifier: id,
        trigger: { type: 'timeInterval', seconds: 3600, repeats: false },
      })),
    );
    mockGetNextTriggerDateAsync.mockResolvedValue(Date.now() + 24 * 60 * 60_000);

    jest.setSystemTime(new Date(2026, 8, 2, 8, 30, 0));
    const state = await getWaterReminderUiState(true, defaultScheduleInput);

    expect(state).toEqual({
      kind: 'active',
      nextTriggerMs: new Date(2026, 8, 2, 9, 43, 0).getTime(),
      nextSlot: { hour: 9, minute: 43 },
      slotDay: 'today',
    });
  });

  it('marks the next slot as tomorrow after today\'s last slot', async () => {
    jest.setSystemTime(new Date(2026, 8, 2, 18, 0, 0));
    const tomorrowFirst = new Date(2026, 8, 3, 8, 30, 0).getTime();
    await syncWaterReminders(true, defaultScheduleInput);
    const stored = JSON.parse(
      (await AsyncStorage.getItem('@water_reminder_notification_ids')) ?? '{}',
    ) as { ids: string[] };
    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      stored.ids.map((identifier) => ({
        identifier,
        trigger: { type: 'timeInterval', seconds: 3600, repeats: false },
      })),
    );
    mockGetNextTriggerDateAsync.mockResolvedValue(tomorrowFirst);

    const state = await getWaterReminderUiState(true, defaultScheduleInput);

    expect(state).toEqual({
      kind: 'active',
      nextTriggerMs: tomorrowFirst,
      nextSlot: { hour: 8, minute: 30 },
      slotDay: 'tomorrow',
    });
  });
});
