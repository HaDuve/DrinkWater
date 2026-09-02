import {
  buildGlassSchedule,
  countDailyGlasses,
  dateToTimeOfDay,
  parseTimeOfDayInput,
  timeOfDayToDate,
  type ReminderWindow,
} from './glass-schedule';

describe('timeOfDayToDate and dateToTimeOfDay', () => {
  it('round-trips hour and minute through a Date', () => {
    const reference = new Date('2026-01-15T12:00:00');
    const time = { hour: 8, minute: 30 };
    expect(dateToTimeOfDay(timeOfDayToDate(time, reference))).toEqual(time);
  });
});

describe('parseTimeOfDayInput', () => {
  it('parses HH:MM strings into hour and minute', () => {
    expect(parseTimeOfDayInput('08:30')).toEqual({ hour: 8, minute: 30 });
    expect(parseTimeOfDayInput('17:00')).toEqual({ hour: 17, minute: 0 });
  });

  it('rejects invalid or out-of-range values', () => {
    expect(parseTimeOfDayInput('25:00')).toBeNull();
    expect(parseTimeOfDayInput('12:60')).toBeNull();
    expect(parseTimeOfDayInput('')).toBeNull();
    expect(parseTimeOfDayInput('noon')).toBeNull();
  });

  it('accepts single-digit hours for stored values', () => {
    expect(parseTimeOfDayInput('8:30')).toEqual({ hour: 8, minute: 30 });
    expect(parseTimeOfDayInput(' 09:00 ')).toEqual({ hour: 9, minute: 0 });
  });
});

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
  });

  it('rejects non-positive glass size instead of throwing', () => {
    expect(
      buildGlassSchedule({
        goalMl: 2000,
        glassMl: 0,
        window: defaultWindow,
      }),
    ).toEqual({ ok: false, error: 'invalid_glass_size' });

    expect(
      buildGlassSchedule({
        goalMl: 2000,
        glassMl: -50,
        window: defaultWindow,
      }),
    ).toEqual({ ok: false, error: 'invalid_glass_size' });
  });

  it('pins first and last slots to the window when count is at least 2', () => {
    const window: ReminderWindow = {
      start: { hour: 7, minute: 15 },
      end: { hour: 18, minute: 45 },
    };
    const result = buildGlassSchedule({
      goalMl: 1500,
      glassMl: 300,
      window,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.schedule.glassCount).toBeGreaterThanOrEqual(2);
    expect(result.schedule.slots[0]).toEqual(window.start);
    expect(result.schedule.slots.at(-1)).toEqual(window.end);
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
