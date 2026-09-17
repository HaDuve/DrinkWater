import type { TFunction } from 'i18next';

import { formatTimeOfDay } from '@/features/water/domain/glass-schedule';

import {
  buildNextGlassReminderBody,
  buildRemainingAwareReminderBody,
  formatRelativeReminderTime,
  formatTodayRemainingPreviewBody,
} from './next-glass-reminder-copy';

const mockT = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as TFunction;

describe('formatRelativeReminderTime', () => {
  it('formats non-positive waits as soon', () => {
    expect(formatRelativeReminderTime(0, mockT)).toBe('reminder.timeSoon');
  });

  it('formats whole hours', () => {
    expect(formatRelativeReminderTime(2 * 60 * 60_000, mockT)).toBe(
      'reminder.timeHoursWhole:{"count":2}',
    );
  });
});

describe('buildNextGlassReminderBody', () => {
  it('shows the next slot clock time and countdown for today', () => {
    expect(
      buildNextGlassReminderBody(
        { hour: 8, minute: 30 },
        'today',
        2 * 60 * 60_000,
        mockT,
      ),
    ).toBe(
      'reminder.nextAtToday:{"clockTime":"08:30","time":"reminder.timeHoursWhole:{\\"count\\":2}"}',
    );
  });

  it('shows tomorrow\'s first slot after today\'s last slot', () => {
    expect(
      buildNextGlassReminderBody(
        { hour: 8, minute: 30 },
        'tomorrow',
        14 * 60 * 60_000,
        mockT,
      ),
    ).toBe(
      'reminder.doneForToday:{"clockTime":"08:30","time":"reminder.timeHoursWhole:{\\"count\\":14}"}',
    );
  });

  it('uses the shared clock formatter for slot times', () => {
    expect(formatTimeOfDay({ hour: 8, minute: 30 })).toBe('08:30');
  });
});

describe('formatTodayRemainingPreviewBody', () => {
  it('summarizes Remaining Glasses, Remaining Window, and next clock', () => {
    expect(
      formatTodayRemainingPreviewBody(
        {
          kind: 'active',
          remainingGlasses: 4,
          windowStart: '10:01',
          windowEnd: '17:00',
          nextClockTime: '10:01',
        },
        mockT,
      ),
    ).toBe(
      'settings.todayRemainingPreview:{"count":4,"start":"10:01","end":"17:00","clockTime":"10:01"}',
    );
  });

  it('states silence when Remaining Plan is empty', () => {
    expect(formatTodayRemainingPreviewBody({ kind: 'silent' }, mockT)).toBe(
      'settings.todayRemainingSilent',
    );
  });
});

describe('buildRemainingAwareReminderBody', () => {
  it('names Remaining Glasses with next clock and countdown', () => {
    expect(
      buildRemainingAwareReminderBody(
        {
          kind: 'active',
          remainingGlasses: 4,
          nextClockTime: '10:01',
        },
        2 * 60 * 60_000,
        mockT,
      ),
    ).toBe(
      'reminder.remainingNextAt:{"count":4,"clockTime":"10:01","time":"reminder.timeHoursWhole:{\\"count\\":2}"}',
    );
  });

  it('states silence then points at the next Default Plan slot', () => {
    expect(
      buildRemainingAwareReminderBody(
        { kind: 'silent' },
        14 * 60 * 60_000,
        mockT,
        { clockTime: '08:30' },
      ),
    ).toBe(
      'reminder.remainingSilentNext:{"clockTime":"08:30","time":"reminder.timeHoursWhole:{\\"count\\":14}"}',
    );
  });
});
