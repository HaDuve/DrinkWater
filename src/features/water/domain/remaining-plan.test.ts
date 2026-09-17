import {
  countRemainingGlasses,
  buildRemainingWindow,
  buildRemainingPlanSlots,
  buildReminderPlanFireDates,
} from './remaining-plan';

describe('countRemainingGlasses', () => {
  it('is how many Glasses still needed for the Daily Goal', () => {
    expect(countRemainingGlasses(2000, 250, 0)).toBe(8);
    expect(countRemainingGlasses(2000, 250, 500)).toBe(6);
    expect(countRemainingGlasses(2000, 250, 2000)).toBe(0);
    expect(countRemainingGlasses(2000, 250, 2250)).toBe(0);
  });
});

const reminderWindow = {
  start: { hour: 8, minute: 30 },
  end: { hour: 17, minute: 0 },
};

describe('buildRemainingWindow', () => {
  it('starts at Reminder Window start when that is after the next future minute', () => {
    const now = new Date(2026, 8, 2, 7, 0, 0);
    expect(buildRemainingWindow(reminderWindow, now)).toEqual(reminderWindow);
  });

  it('starts at the next future minute when that is after Reminder Window start', () => {
    const now = new Date(2026, 8, 2, 10, 0, 0);
    expect(buildRemainingWindow(reminderWindow, now)).toEqual({
      start: { hour: 10, minute: 1 },
      end: { hour: 17, minute: 0 },
    });
  });

  it('is none after Reminder Window end', () => {
    const now = new Date(2026, 8, 2, 18, 0, 0);
    expect(buildRemainingWindow(reminderWindow, now)).toBeNull();
  });

  it('is none when the next future minute is not before window end', () => {
    expect(buildRemainingWindow(reminderWindow, new Date(2026, 8, 2, 16, 59, 0))).toBeNull();
    expect(buildRemainingWindow(reminderWindow, new Date(2026, 8, 2, 23, 59, 0))).toBeNull();
  });
});

describe('buildRemainingPlanSlots', () => {
  it('when pinned, even-spreads with first at Remaining Window start and last at end', () => {
    const remainingWindow = {
      start: { hour: 8, minute: 30 },
      end: { hour: 17, minute: 0 },
    };
    expect(
      buildRemainingPlanSlots(4, remainingWindow, { pinFirstToStart: true }),
    ).toEqual([
      { hour: 8, minute: 30 },
      { hour: 11, minute: 20 },
      { hour: 14, minute: 10 },
      { hour: 17, minute: 0 },
    ]);
  });

  it('when deferred, even-spreads interval ends so first is not at Remaining Window start', () => {
    const remainingWindow = {
      start: { hour: 10, minute: 1 },
      end: { hour: 17, minute: 0 },
    };
    expect(
      buildRemainingPlanSlots(4, remainingWindow, { pinFirstToStart: false }),
    ).toEqual([
      { hour: 11, minute: 46 },
      { hour: 13, minute: 31 },
      { hour: 15, minute: 15 },
      { hour: 17, minute: 0 },
    ]);
  });

  it('places a single Remaining Glass at window end', () => {
    expect(
      buildRemainingPlanSlots(
        1,
        {
          start: { hour: 10, minute: 1 },
          end: { hour: 17, minute: 0 },
        },
        { pinFirstToStart: false },
      ),
    ).toEqual([{ hour: 17, minute: 0 }]);
  });

  it('when deferred, schedules as many as fit at ≥5-minute gaps and keeps the last at window end', () => {
    expect(
      buildRemainingPlanSlots(
        10,
        {
          start: { hour: 16, minute: 45 },
          end: { hour: 17, minute: 0 },
        },
        { pinFirstToStart: false },
      ),
    ).toEqual([
      { hour: 16, minute: 50 },
      { hour: 16, minute: 55 },
      { hour: 17, minute: 0 },
    ]);
  });

  it('is empty when Remaining Glasses is zero', () => {
    expect(
      buildRemainingPlanSlots(
        0,
        {
          start: { hour: 10, minute: 1 },
          end: { hour: 17, minute: 0 },
        },
        { pinFirstToStart: false },
      ),
    ).toEqual([]);
  });
});

describe('buildReminderPlanFireDates', () => {
  it('after drinking, next today fire is spaced into the Remaining Window — not ~1 minute later', () => {
    // User: 2 glasses left in a 4h window → next ping should bump later, not fire almost immediately.
    const now = new Date(2026, 8, 2, 14, 0, 0);
    const fires = buildReminderPlanFireDates({
      goalMl: 500,
      glassMl: 250,
      intakeMl: 0,
      window: {
        start: { hour: 8, minute: 0 },
        end: { hour: 18, minute: 0 },
      },
      now,
    });
    const todayFires = fires.filter((date) => date.getDate() === 2);
    expect(todayFires).toEqual([
      new Date(2026, 8, 2, 16, 1, 0, 0),
      new Date(2026, 8, 2, 18, 0, 0, 0),
    ]);
    expect(todayFires[0].getTime() - now.getTime()).toBeGreaterThan(60_000);
  });

  it('queues today Remaining Plan slots plus tomorrow Default Plan slots', () => {
    const now = new Date(2026, 8, 2, 10, 0, 0);
    expect(
      buildReminderPlanFireDates({
        goalMl: 1000,
        glassMl: 250,
        intakeMl: 0,
        window: reminderWindow,
        now,
      }),
    ).toEqual([
      new Date(2026, 8, 2, 11, 46, 0, 0),
      new Date(2026, 8, 2, 13, 31, 0, 0),
      new Date(2026, 8, 2, 15, 15, 0, 0),
      new Date(2026, 8, 2, 17, 0, 0, 0),
      new Date(2026, 8, 3, 8, 30, 0, 0),
      new Date(2026, 8, 3, 11, 20, 0, 0),
      new Date(2026, 8, 3, 14, 10, 0, 0),
      new Date(2026, 8, 3, 17, 0, 0, 0),
    ]);
  });

  it('silences today when Intake meets the Daily Goal but keeps tomorrow Default Plan', () => {
    const now = new Date(2026, 8, 2, 10, 0, 0);
    expect(
      buildReminderPlanFireDates({
        goalMl: 500,
        glassMl: 250,
        intakeMl: 500,
        window: reminderWindow,
        now,
      }),
    ).toEqual([
      new Date(2026, 8, 3, 8, 30, 0, 0),
      new Date(2026, 8, 3, 17, 0, 0, 0),
    ]);
  });

  it('queues no today slots after Reminder Window end', () => {
    const now = new Date(2026, 8, 2, 18, 0, 0);
    expect(
      buildReminderPlanFireDates({
        goalMl: 1000,
        glassMl: 250,
        intakeMl: 0,
        window: reminderWindow,
        now,
      }),
    ).toEqual([
      new Date(2026, 8, 3, 8, 30, 0, 0),
      new Date(2026, 8, 3, 11, 20, 0, 0),
      new Date(2026, 8, 3, 14, 10, 0, 0),
      new Date(2026, 8, 3, 17, 0, 0, 0),
    ]);
  });
});
