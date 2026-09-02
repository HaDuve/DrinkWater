import type { TFunction } from 'i18next';

import { formatTimeOfDay, type TimeOfDay } from './glass-schedule';

export function formatRelativeReminderTime(msFromNow: number, t: TFunction): string {
  if (!Number.isFinite(msFromNow) || msFromNow <= 0) return t('reminder.timeSoon');
  if (msFromNow < 60_000) return t('reminder.timeLessThanMinute');
  const mins = Math.round(msFromNow / 60_000);
  if (mins < 60) return t('reminder.timeMinutes', { count: mins });
  const h = mins / 60;
  if (Math.abs(h - Math.round(h)) < 0.06) {
    return t('reminder.timeHoursWhole', { count: Math.round(h) });
  }
  return t('reminder.timeHoursDecimal', { hours: h.toFixed(1) });
}

export function buildNextGlassReminderBody(
  nextSlot: TimeOfDay,
  slotDay: 'today' | 'tomorrow',
  msFromNow: number,
  t: TFunction,
): string {
  const clockTime = formatTimeOfDay(nextSlot);
  const time = formatRelativeReminderTime(msFromNow, t);

  if (slotDay === 'today') {
    return t('reminder.nextAtToday', { clockTime, time });
  }

  return t('reminder.doneForToday', { clockTime, time });
}
