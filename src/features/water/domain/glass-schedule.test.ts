import { buildGlassSchedule, countDailyGlasses, formatTimeOfDay, type ReminderWindow } from './glass-schedule';

describe('countDailyGlasses', () => {
  it('uses ceil(goalMl / glassMl) so slight over-plan is intentional', () => {
    expect(countDailyGlasses(2000, 250)).toBe(8);
    expect(countDailyGlasses(2001, 250)).toBe(9);
    expect(countDailyGlasses(100, 250)).toBe(1);
  });
});

const defaultWindow: ReminderWindow = {
  start: { hour: 8, minute: 30 },
  end: { hour: 17, minute: 0 },
};

describe('buildGlassSchedule', () => {
  it('spaces 8 glasses evenly from 08:30 through 17:00 inclusive', () => {
    const result = buildGlassSchedule({
      goalMl: 2000,
      glassMl: 250,
      window: defaultWindow,
    });

    expect(result).toEqual({
      ok: true,
      schedule: {
        glassCount: 8,
        slots: [
          { hour: 8, minute: 30 },
          { hour: 9, minute: 43 },
          { hour: 10, minute: 56 },
          { hour: 12, minute: 9 },
          { hour: 13, minute: 21 },
          { hour: 14, minute: 34 },
          { hour: 15, minute: 47 },
          { hour: 17, minute: 0 },
        ],
      },
    });

    expect(result.ok && result.schedule.slots.map(formatTimeOfDay)).toEqual([
      '08:30',
      '09:43',
      '10:56',
      '12:09',
      '13:21',
      '14:34',
      '15:47',
      '17:00',
    ]);
  });

  it('places the only glass at the window midpoint when count is 1', () => {
    const result = buildGlassSchedule({
      goalMl: 100,
      glassMl: 250,
      window: defaultWindow,
    });

    expect(result).toEqual({
      ok: true,
      schedule: {
        glassCount: 1,
        slots: [{ hour: 12, minute: 45 }],
      },
    });
  });

  it('rejects end equal to start', () => {
    const result = buildGlassSchedule({
      goalMl: 2000,
      glassMl: 250,
      window: {
        start: { hour: 9, minute: 0 },
        end: { hour: 9, minute: 0 },
      },
    });

    expect(result).toEqual({ ok: false, error: 'end_before_or_equal_start' });
  });

  it('rejects end before start on the same day', () => {
    const result = buildGlassSchedule({
      goalMl: 2000,
      glassMl: 250,
      window: {
        start: { hour: 17, minute: 0 },
        end: { hour: 8, minute: 30 },
      },
    });

    expect(result).toEqual({ ok: false, error: 'overnight_window' });
  });

  it('rejects schedules where rounded consecutive slots are less than 5 minutes apart', () => {
    const result = buildGlassSchedule({
      goalMl: 5000,
      glassMl: 50,
      window: {
        start: { hour: 8, minute: 0 },
        end: { hour: 8, minute: 30 },
      },
    });

    expect(result).toEqual({ ok: false, error: 'slots_too_close' });
  });
});
