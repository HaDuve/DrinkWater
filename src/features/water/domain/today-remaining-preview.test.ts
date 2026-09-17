import { buildTodayRemainingPreview } from './today-remaining-preview';

const reminderWindow = {
  start: { hour: 8, minute: 30 },
  end: { hour: 17, minute: 0 },
};

describe('buildTodayRemainingPreview', () => {
  it('is hidden before Reminder Window start with zero Intake', () => {
    expect(
      buildTodayRemainingPreview({
        goalMl: 2000,
        glassMl: 250,
        intakeMl: 0,
        window: reminderWindow,
        now: new Date(2026, 8, 2, 7, 0, 0),
      }),
    ).toEqual({ kind: 'hidden' });
  });

  it('shows Remaining Glasses, Remaining Window, and next clock when Today Differs', () => {
    expect(
      buildTodayRemainingPreview({
        goalMl: 1000,
        glassMl: 250,
        intakeMl: 0,
        window: reminderWindow,
        now: new Date(2026, 8, 2, 10, 0, 0),
      }),
    ).toEqual({
      kind: 'active',
      remainingGlasses: 4,
      windowStart: '10:01',
      windowEnd: '17:00',
      nextClockTime: '11:46',
    });
  });

  it('is silent when Intake meets the Daily Goal', () => {
    expect(
      buildTodayRemainingPreview({
        goalMl: 1000,
        glassMl: 250,
        intakeMl: 1000,
        window: reminderWindow,
        now: new Date(2026, 8, 2, 10, 0, 0),
      }),
    ).toEqual({ kind: 'silent' });
  });

  it('is silent after Reminder Window end', () => {
    expect(
      buildTodayRemainingPreview({
        goalMl: 1000,
        glassMl: 250,
        intakeMl: 0,
        window: reminderWindow,
        now: new Date(2026, 8, 2, 18, 0, 0),
      }),
    ).toEqual({ kind: 'silent' });
  });

  it('differs before window start once Intake has begun', () => {
    expect(
      buildTodayRemainingPreview({
        goalMl: 1000,
        glassMl: 250,
        intakeMl: 250,
        window: reminderWindow,
        now: new Date(2026, 8, 2, 7, 0, 0),
      }),
    ).toEqual({
      kind: 'active',
      remainingGlasses: 3,
      windowStart: '08:30',
      windowEnd: '17:00',
      nextClockTime: '08:30',
    });
  });
});
