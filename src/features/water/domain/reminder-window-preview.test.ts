import {
  buildReminderWindowPreview,
  type ReminderWindowPreviewInput,
} from './reminder-window-preview';

const defaultInput: ReminderWindowPreviewInput = {
  goalMl: 2000,
  glassMl: 250,
  window: {
    start: { hour: 8, minute: 30 },
    end: { hour: 17, minute: 0 },
  },
};

describe('buildReminderWindowPreview', () => {
  it('summarizes glass count and same-day window range for a valid plan', () => {
    expect(buildReminderWindowPreview(defaultInput)).toEqual({
      ok: true,
      glassCount: 8,
      windowStart: '08:30',
      windowEnd: '17:00',
    });
  });

  it('rejects windows where consecutive slots would be under 5 minutes apart', () => {
    expect(
      buildReminderWindowPreview({
        goalMl: 5000,
        glassMl: 50,
        window: {
          start: { hour: 8, minute: 0 },
          end: { hour: 8, minute: 30 },
        },
      }),
    ).toEqual({ ok: false, error: 'slots_too_close' });
  });
});
