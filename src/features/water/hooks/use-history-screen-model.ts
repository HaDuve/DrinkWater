import { useMemo } from 'react';

import type { WaterHistoryChartEntry } from '@/components/water-history-chart';
import {
  aggregateChartEntries,
  groupPastEntriesByWeek,
  todayISO,
  type HistoryRange,
  type WeeklyPastGroup,
} from '@/features/water/domain/history';
import { buildPeriodSummary } from '@/features/water/domain/period-summary';
import type { DailyHistoryEntry, WaterSettings } from '@/lib/storage';

type HistoryPeriodSummary = {
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
  periodSummary: HistoryPeriodSummary;
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

  const { periodSummary, meaningfulDays } = useMemo(() => {
    const summary = buildPeriodSummary(visibleHistory, state?.goalMl ?? 0);
    return {
      periodSummary: {
        totalDays: summary.totalDays,
        hitDays: summary.hitDays,
        totalMl: summary.totalMl,
        averageMl: summary.averageMl,
        hitRate: summary.hitRate,
      },
      meaningfulDays: summary.meaningfulDays,
    };
  }, [state?.goalMl, visibleHistory]);

  return {
    visibleHistory,
    todayEntry,
    weeklyPastGroups,
    chartEntries,
    periodSummary,
    meaningfulDays,
  };
}
