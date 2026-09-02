import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadWaterState, saveReminderWindow } from './storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('loadWaterState reminder window', () => {
  it('defaults to 08:30–17:00 when nothing is stored yet', async () => {
    const state = await loadWaterState();

    expect(state.reminderWindow).toEqual({
      start: { hour: 8, minute: 30 },
      end: { hour: 17, minute: 0 },
    });
  });
});

describe('saveReminderWindow', () => {
  it('round-trips a custom window through loadWaterState', async () => {
    const window = {
      start: { hour: 7, minute: 15 },
      end: { hour: 19, minute: 45 },
    };

    await saveReminderWindow(window, { goalMl: 2000, glassMl: 250 });
    const state = await loadWaterState();

    expect(state.reminderWindow).toEqual(window);
  });
});

describe('legacy intervalHours migration', () => {
  it('migrates upgrading users to the default window and stops reading interval hours', async () => {
    await AsyncStorage.setItem('@water_interval_hours', '3');

    const firstLoad = await loadWaterState();
    expect(firstLoad.reminderWindow).toEqual({
      start: { hour: 8, minute: 30 },
      end: { hour: 17, minute: 0 },
    });

    await AsyncStorage.setItem('@water_interval_hours', '6');
    const secondLoad = await loadWaterState();
    expect(secondLoad.reminderWindow).toEqual({
      start: { hour: 8, minute: 30 },
      end: { hour: 17, minute: 0 },
    });

    expect(await AsyncStorage.getItem('@water_interval_hours')).toBeNull();
    expect(await AsyncStorage.getItem('@water_reminder_window_start')).toBe('08:30');
    expect(await AsyncStorage.getItem('@water_reminder_window_end')).toBe('17:00');
  });
});

describe('saveReminderWindow validation', () => {
  const context = { goalMl: 2000, glassMl: 250 };

  it('rejects overnight windows before persisting', async () => {
    const result = await saveReminderWindow(
      {
        start: { hour: 17, minute: 0 },
        end: { hour: 8, minute: 30 },
      },
      context,
    );

    expect(result).toEqual({ ok: false, error: 'overnight_window' });
    expect(await AsyncStorage.getItem('@water_reminder_window_start')).toBeNull();
    expect(await AsyncStorage.getItem('@water_reminder_window_end')).toBeNull();
  });

  it('rejects windows where slots would be too close before persisting', async () => {
    const result = await saveReminderWindow(
      {
        start: { hour: 8, minute: 0 },
        end: { hour: 8, minute: 30 },
      },
      { goalMl: 5000, glassMl: 50 },
    );

    expect(result).toEqual({ ok: false, error: 'slots_too_close' });
    expect(await AsyncStorage.getItem('@water_reminder_window_start')).toBeNull();
    expect(await AsyncStorage.getItem('@water_reminder_window_end')).toBeNull();
  });

  it('persists when domain validation passes', async () => {
    const window = {
      start: { hour: 9, minute: 0 },
      end: { hour: 18, minute: 0 },
    };

    const result = await saveReminderWindow(window, context);

    expect(result).toEqual({ ok: true });
    const state = await loadWaterState();
    expect(state.reminderWindow).toEqual(window);
  });
});

describe('loadWaterState reminder window repair', () => {
  it('self-heals when both window keys exist but one value is unparseable', async () => {
    await AsyncStorage.multiSet([
      ['@water_reminder_window_start', '08:30'],
      ['@water_reminder_window_end', 'bad'],
    ]);

    const state = await loadWaterState();

    expect(state.reminderWindow).toEqual({
      start: { hour: 8, minute: 30 },
      end: { hour: 17, minute: 0 },
    });
    expect(await AsyncStorage.getItem('@water_reminder_window_start')).toBe('08:30');
    expect(await AsyncStorage.getItem('@water_reminder_window_end')).toBe('17:00');
  });

  it('self-heals when only one window key is stored', async () => {
    await AsyncStorage.setItem('@water_reminder_window_start', '09:00');

    const state = await loadWaterState();

    expect(state.reminderWindow).toEqual({
      start: { hour: 8, minute: 30 },
      end: { hour: 17, minute: 0 },
    });
    expect(await AsyncStorage.getItem('@water_reminder_window_start')).toBe('08:30');
    expect(await AsyncStorage.getItem('@water_reminder_window_end')).toBe('17:00');
  });

  it('does not write window keys on a fresh install', async () => {
    await loadWaterState();

    expect(await AsyncStorage.getItem('@water_reminder_window_start')).toBeNull();
    expect(await AsyncStorage.getItem('@water_reminder_window_end')).toBeNull();
  });
});
