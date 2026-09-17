import type { TFunction } from 'i18next';

import { formatTimeOfDay, type TimeOfDay } from '@/features/water/domain/glass-schedule';
import type { TodayRemainingPreview } from '@/features/water/domain/today-remaining-preview';

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

export type TodayRemainingCopyPreview =
  | Extract<TodayRemainingPreview, { kind: 'active' }>
  | Extract<TodayRemainingPreview, { kind: 'silent' }>;

export function formatTodayRemainingPreviewBody(
  preview: TodayRemainingCopyPreview,
  t: TFunction,
): string {
  if (preview.kind === 'silent') {
    return t('settings.todayRemainingSilent');
  }

  return t('settings.todayRemainingPreview', {
    count: preview.remainingGlasses,
    start: preview.windowStart,
    end: preview.windowEnd,
    clockTime: preview.nextClockTime,
  });
}

export type RemainingAwareHomePreview =
  | {
      kind: 'active';
      remainingGlasses: number;
      nextClockTime: string;
    }
  | { kind: 'silent' };

export function buildRemainingAwareReminderBody(
  preview: RemainingAwareHomePreview,
  msFromNow: number,
  t: TFunction,
  nextSlot?: { clockTime: string },
): string {
  const time = formatRelativeReminderTime(msFromNow, t);

  if (preview.kind === 'active') {
    return t('reminder.remainingNextAt', {
      count: preview.remainingGlasses,
      clockTime: preview.nextClockTime,
      time,
    });
  }

  return t('reminder.remainingSilentNext', {
    clockTime: nextSlot?.clockTime ?? '',
    time,
  });
}

export function buildHomeReminderBody(
  nextSlot: TimeOfDay,
  slotDay: 'today' | 'tomorrow',
  msFromNow: number,
  todayPreview: TodayRemainingPreview | null | undefined,
  t: TFunction,
): string {
  const clockTime = formatTimeOfDay(nextSlot);

  if (todayPreview?.kind === 'active') {
    return buildRemainingAwareReminderBody(
      {
        kind: 'active',
        remainingGlasses: todayPreview.remainingGlasses,
        nextClockTime: clockTime,
      },
      msFromNow,
      t,
    );
  }

  if (todayPreview?.kind === 'silent') {
    return buildRemainingAwareReminderBody({ kind: 'silent' }, msFromNow, t, {
      clockTime,
    });
  }

  return buildNextGlassReminderBody(nextSlot, slotDay, msFromNow, t);
}
