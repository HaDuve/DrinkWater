import type { DailyHistoryEntry } from '@/lib/storage';

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
  const totalDays = history.length;
  const hitDays = history.filter((item) => goalMl > 0 && item.intakeMl >= goalMl).length;
  const totalMl = history.reduce((sum, item) => sum + item.intakeMl, 0);
  const averageMl = totalDays > 0 ? Math.round(totalMl / totalDays) : 0;
  const meaningfulDays = history.filter((item) => item.intakeMl > 0).length;
  return { hitDays, totalDays, averageMl, meaningfulDays };
}
