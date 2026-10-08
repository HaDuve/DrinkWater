import type { DailyHistoryEntry } from '@/lib/storage';

import { buildPeriodSummary } from './period-summary';

export type WeekTeaserSummary = {
  hitDays: number;
  totalDays: number;
  averageMl: number;
  meaningfulDays: number;
};

/** Period summary for the home “this week” teaser (same math as history period summary). */
export function buildWeekTeaserSummary(
  history: DailyHistoryEntry[],
  goalMl: number,
): WeekTeaserSummary {
  const summary = buildPeriodSummary(history, goalMl);
  return {
    hitDays: summary.hitDays,
    totalDays: summary.totalDays,
    averageMl: summary.averageMl,
    meaningfulDays: summary.meaningfulDays,
  };
}
