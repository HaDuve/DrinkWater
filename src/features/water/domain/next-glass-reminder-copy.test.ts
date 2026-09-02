import type { TFunction } from 'i18next';

import { formatTimeOfDay } from './glass-schedule';
import {
  buildNextGlassReminderBody,
  formatRelativeReminderTime,
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
