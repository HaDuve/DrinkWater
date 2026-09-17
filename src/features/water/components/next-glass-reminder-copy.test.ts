import type { TFunction } from 'i18next';

import { formatTimeOfDay } from '@/features/water/domain/glass-schedule';

import { buildNextGlassReminderBody } from './next-glass-reminder-copy';

const mockT = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as TFunction;

describe('buildNextGlassReminderBody', () => {
  it('shows the next slot clock time for today', () => {
    expect(
      buildNextGlassReminderBody({ hour: 8, minute: 30 }, 'today', mockT),
    ).toBe('reminder.nextAtToday:{"clockTime":"08:30"}');
  });

  it("shows tomorrow's first slot after today's last slot", () => {
    expect(
      buildNextGlassReminderBody({ hour: 8, minute: 30 }, 'tomorrow', mockT),
    ).toBe('reminder.doneForToday:{"clockTime":"08:30"}');
  });

  it('uses the shared clock formatter for slot times', () => {
    expect(formatTimeOfDay({ hour: 8, minute: 30 })).toBe('08:30');
  });
});
