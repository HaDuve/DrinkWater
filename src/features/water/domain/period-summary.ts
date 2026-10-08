import type { DailyHistoryEntry } from '@/lib/storage';

export type PeriodSummary = {
  totalDays: number;
  hitDays: number;
  totalMl: number;
  averageMl: number;
  hitRate: number;
  meaningfulDays: number;
};

/** Hit rate, averages, and meaningful days for a history window. */
export function buildPeriodSummary(history: DailyHistoryEntry[], goalMl: number): PeriodSummary {
  const totalDays = history.length;
  const hitDays = history.filter((item) => goalMl > 0 && item.intakeMl >= goalMl).length;
  const totalMl = history.reduce((sum, item) => sum + item.intakeMl, 0);
  const averageMl = totalDays > 0 ? Math.round(totalMl / totalDays) : 0;
  const hitRate = totalDays > 0 ? Math.round((hitDays / totalDays) * 100) : 0;
  const meaningfulDays = history.filter((item) => item.intakeMl > 0).length;
  return { totalDays, hitDays, totalMl, averageMl, hitRate, meaningfulDays };
}
