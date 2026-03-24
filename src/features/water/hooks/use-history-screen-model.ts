import { useMemo } from 'react';

import {
  aggregateChartEntries,
  groupPastEntriesByWeek,
  todayISO,
  type HistoryRange,
  type WeeklyPastGroup,
} from '@/features/water/domain/history';
import type { WaterHistoryChartEntry } from '@/components/water-history-chart';
import type { DailyHistoryEntry, WaterSettings } from '@/lib/storage';

type PeriodSummary = {
  totalDays: number;
  hitDays: number;
  totalMl: number;
  averageMl: number;
  hitRate: number;
};

export type HistoryScreenModel = {
  visibleHistory: DailyHistoryEntry[];
  todayEntry: DailyHistoryEntry;
  weeklyPastGroups: WeeklyPastGroup[];
  chartEntries: WaterHistoryChartEntry[];
  periodSummary: PeriodSummary;
  meaningfulDays: number;
};

export function useHistoryScreenModel(
  selectedRange: HistoryRange,
  state: WaterSettings | null,
  history: DailyHistoryEntry[] | null,
  isDebugMode: boolean,
  debugHistory: DailyHistoryEntry[] | null,
): HistoryScreenModel {
  const visibleHistory = useMemo(() => {
    if (isDebugMode) return (debugHistory ?? []).slice(0, selectedRange);
    return history ?? [];
  }, [debugHistory, history, isDebugMode, selectedRange]);

  const todayKey = useMemo(() => todayISO(), []);

  const historyByDate = useMemo(() => {
    const map = new Map<string, DailyHistoryEntry>();
    for (const item of visibleHistory) map.set(item.date, item);
    return map;
  }, [visibleHistory]);

  const todayEntry = historyByDate.get(todayKey) ?? { date: todayKey, intakeMl: 0 };

  const pastEntries = useMemo(
    () => visibleHistory.filter((item) => item.date !== todayKey),
    [todayKey, visibleHistory],
  );

  const weeklyPastGroups = useMemo(
    () => groupPastEntriesByWeek(pastEntries, state?.goalMl ?? 0),
    [pastEntries, state?.goalMl],
  );

  const chartEntries = useMemo(
    () => aggregateChartEntries(visibleHistory, selectedRange),
    [selectedRange, visibleHistory],
  );

  const periodSummary = useMemo(() => {
    const totalDays = visibleHistory.length;
    const goalMl = state?.goalMl ?? 0;
    const hitDays = visibleHistory.filter((item) => goalMl > 0 && item.intakeMl >= goalMl).length;
    const totalMl = visibleHistory.reduce((sum, item) => sum + item.intakeMl, 0);
    const averageMl = totalDays > 0 ? Math.round(totalMl / totalDays) : 0;
    const hitRate = totalDays > 0 ? Math.round((hitDays / totalDays) * 100) : 0;
    return { totalDays, hitDays, totalMl, averageMl, hitRate };
  }, [state?.goalMl, visibleHistory]);

  const meaningfulDays = useMemo(
    () => visibleHistory.filter((item) => item.intakeMl > 0).length,
    [visibleHistory],
  );

  return {
    visibleHistory,
    todayEntry,
    weeklyPastGroups,
    chartEntries,
    periodSummary,
    meaningfulDays,
  };
}
