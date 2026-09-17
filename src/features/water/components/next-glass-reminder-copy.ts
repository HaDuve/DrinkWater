import type { TFunction } from 'i18next';

import { formatTimeOfDay, type TimeOfDay } from '@/features/water/domain/glass-schedule';

export function buildNextGlassReminderBody(
  nextSlot: TimeOfDay,
  slotDay: 'today' | 'tomorrow',
  t: TFunction,
): string {
  const clockTime = formatTimeOfDay(nextSlot);

  if (slotDay === 'today') {
    return t('reminder.nextAtToday', { clockTime });
  }

  return t('reminder.doneForToday', { clockTime });
}
