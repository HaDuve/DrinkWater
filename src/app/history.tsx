import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WaterHistoryChart, type WaterHistoryChartEntry } from '@/components/water-history-chart';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTabBarBottomInset } from '@/hooks/use-tab-bar-bottom-inset';
import { useTheme } from '@/hooks/use-theme';
import { loadDailyHistory, loadWaterState, type DailyHistoryEntry, type WaterSettings } from '@/lib/storage';

type HistoryRange = 7 | 30 | 90;

function formatDateLabel(dateIso: string): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const date = new Date(year || 1970, (month || 1) - 1, day || 1);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateFromIso(dateIso: string): Date {
  const [year, month, day] = dateIso.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

function isoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekStartMonday(dateIso: string): string {
  const date = dateFromIso(dateIso);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return isoFromDate(date);
}

function formatWeekRangeLabel(weekStartIso: string): string {
  const weekStart = dateFromIso(weekStartIso);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();

  if (sameMonth && sameYear) {
    const month = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(weekStart);
    return `${month} ${weekStart.getDate()}-${weekEnd.getDate()}`;
  }

  const left = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(weekStart);
  const right = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(weekEnd);
  return `${left} - ${right}`;
}

function formatAxisTickLabel(dateIso: string, range: HistoryRange): string {
  const date = dateFromIso(dateIso);
  if (range === 30) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  }
  if (range === 90) {
    return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(date);
}

function aggregateChartEntries(
  history: DailyHistoryEntry[],
  range: HistoryRange,
): WaterHistoryChartEntry[] {
  const chronological = history.slice(0, range).reverse();
  if (chronological.length === 0) return [];

  if (range === 7) {
    return chronological.map((item) => ({
      id: item.date,
      intakeMl: item.intakeMl,
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(dateFromIso(item.date)),
      showLabel: true,
      labelAlign: 'center' as const,
    }));
  }

  const groupSize = range === 30 ? 2 : 7;
  const groups: DailyHistoryEntry[][] = [];
  for (let i = 0; i < chronological.length; i += groupSize) {
    groups.push(chronological.slice(i, i + groupSize));
  }

  return groups.map((group, index) => {
    const startDate = group[0]?.date ?? '';
    const endDate = group[group.length - 1]?.date ?? startDate;
    const avgMl = Math.round(
      group.reduce((sum, entry) => sum + entry.intakeMl, 0) / Math.max(1, group.length),
    );
    const middleIndex = Math.floor((groups.length - 1) / 2);
    const shouldShowLabel = index === 0 || index === middleIndex || index === groups.length - 1;

    return {
      id: `${startDate}_${endDate}`,
      intakeMl: avgMl,
      label: formatAxisTickLabel(endDate, range),
      showLabel: shouldShowLabel,
      labelAlign:
        index === 0
          ? ('left' as const)
          : index === middleIndex
            ? ('center' as const)
            : index === groups.length - 1
              ? ('right' as const)
              : ('left' as const),
    };
  });
}

function generateFakeHistory(days: number, goalMl: number): DailyHistoryEntry[] {
  const now = new Date();
  const safeGoal = Math.max(100, goalMl);
  const generated: DailyHistoryEntry[] = [];

  for (let index = 0; index < Math.max(1, Math.round(days)); index += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateIso = `${y}-${m}-${d}`;

    const trend = 0.75 + 0.2 * Math.sin(index / 6);
    const variance = 0.6 + Math.random() * 0.8;
    const dropout = Math.random() < 0.08;
    const intakeMl = dropout
      ? 0
      : Math.round((safeGoal * trend * variance) / 10) * 10;

    generated.push({ date: dateIso, intakeMl });
  }

  return generated;
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const tabBarBottomInset = useTabBarBottomInset();
  const [selectedRange, setSelectedRange] = useState<HistoryRange>(7);
  const [state, setState] = useState<WaterSettings | null>(null);
  const [history, setHistory] = useState<DailyHistoryEntry[] | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugHistory, setDebugHistory] = useState<DailyHistoryEntry[] | null>(null);

  const refresh = useCallback(() => {
    void (async () => {
      const [nextState, nextHistory] = await Promise.all([
        loadWaterState(),
        loadDailyHistory(selectedRange),
      ]);
      setState(nextState);
      setHistory(nextHistory);
    })();
  }, [selectedRange]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const visibleHistory = useMemo(() => {
    if (isDebugMode) {
      return (debugHistory ?? []).slice(0, selectedRange);
    }
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

  const weeklyPastGroups = useMemo(() => {
    const goalMl = state?.goalMl ?? 0;
    const groups: {
      weekStart: string;
      entries: DailyHistoryEntry[];
      weeklyPercent: number;
    }[] = [];

    for (const item of pastEntries) {
      const weekStart = getWeekStartMonday(item.date);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.weekStart !== weekStart) {
        groups.push({ weekStart, entries: [item], weeklyPercent: 0 });
      } else {
        lastGroup.entries.push(item);
      }
    }

    return groups.map((group) => {
      const totalMl = group.entries.reduce((sum, entry) => sum + entry.intakeMl, 0);
      const totalGoalMl = goalMl > 0 ? goalMl * group.entries.length : 0;
      const weeklyPercent = totalGoalMl > 0 ? Math.round((totalMl / totalGoalMl) * 100) : 0;
      return { ...group, weeklyPercent };
    });
  }, [pastEntries, state?.goalMl]);

  const chartEntries = useMemo(() => {
    return aggregateChartEntries(visibleHistory, selectedRange);
  }, [selectedRange, visibleHistory]);

  const periodSummary = useMemo(() => {
    const entries = visibleHistory;
    const totalDays = entries.length;
    const hitDays = entries.filter((item) => item.intakeMl >= (state?.goalMl ?? 0) && (state?.goalMl ?? 0) > 0).length;
    const totalMl = entries.reduce((sum, item) => sum + item.intakeMl, 0);
    const averageMl = totalDays > 0 ? Math.round(totalMl / totalDays) : 0;
    const hitRate = totalDays > 0 ? Math.round((hitDays / totalDays) * 100) : 0;
    return { totalDays, hitDays, totalMl, averageMl, hitRate };
  }, [state?.goalMl, visibleHistory]);

  const meaningfulDays = useMemo(
    () => visibleHistory.filter((item) => item.intakeMl > 0).length,
    [visibleHistory],
  );

  if (!state || !history) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.loadingSafe} edges={['top', 'left', 'right']}>
          <ActivityIndicator size="large" />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView
        style={[styles.safeArea, { paddingBottom: tabBarBottomInset + Spacing.three }]}
        edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.title}>
            {t('history.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {t('history.subtitle')}
          </ThemedText>

          <View style={styles.rangeSelector}>
            {([7, 30, 90] as HistoryRange[]).map((range) => {
              const isActive = selectedRange === range;
              return (
                <Pressable
                  key={range}
                  onPress={() => {
                    setSelectedRange(range as HistoryRange);
                  }}
                  style={[
                    styles.rangeButton,
                    isActive && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <ThemedText type="smallBold" themeColor={isActive ? 'text' : 'textSecondary'}>
                    {range === 7
                      ? t('history.range7')
                      : range === 30
                        ? t('history.range30')
                        : t('history.range90')}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => {
              if (!state) return;
              if (isDebugMode) {
                setIsDebugMode(false);
                return;
              }
              setDebugHistory(generateFakeHistory(90, state.goalMl));
              setIsDebugMode(true);
            }}
            style={[
              styles.debugButton,
              { backgroundColor: isDebugMode ? '#24A148' : theme.backgroundSelected },
            ]}>
            <ThemedText type="smallBold" themeColor={isDebugMode ? 'background' : 'textSecondary'}>
              {isDebugMode ? t('history.debugModeOn') : t('history.debugModeOff')}
            </ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary">
            {selectedRange === 7
              ? t('history.chartModeDaily')
              : selectedRange === 30
                ? t('history.chartModeTwoDayAverage')
                : t('history.chartModeWeeklyAverage')}
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.summaryCard}>
            <ThemedText type="smallBold">{t('history.periodSummaryTitle')}</ThemedText>
            <View style={styles.summaryRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.hitRate')}
              </ThemedText>
              <ThemedText type="smallBold">{t('history.hitRateValue', periodSummary)}</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.averagePerDay')}
              </ThemedText>
              <ThemedText type="smallBold">{t('history.mlValue', { ml: periodSummary.averageMl })}</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.totalIntake')}
              </ThemedText>
              <ThemedText type="smallBold">{t('history.mlValue', { ml: periodSummary.totalMl })}</ThemedText>
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.todayCard}>
            <ThemedText type="smallBold">{t('history.today')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {todayEntry.intakeMl >= state.goalMl && state.goalMl > 0
                ? t('history.statusAchieved')
                : t('history.statusInProgress')}
            </ThemedText>
            <View style={styles.todayMetrics}>
              <ThemedText type="smallBold">{t('history.mlValue', { ml: todayEntry.intakeMl })}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {todayEntry.intakeMl > state.goalMl && state.goalMl > 0
                  ? t('history.overGoal', { ml: todayEntry.intakeMl - state.goalMl })
                  : t('history.remainingToGoal', {
                      ml: Math.max(0, state.goalMl - todayEntry.intakeMl),
                    })}
              </ThemedText>
            </View>
          </ThemedView>

          {chartEntries.length > 0 && <WaterHistoryChart entries={chartEntries} goalMl={state.goalMl} />}

          {meaningfulDays === 0 && (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="smallBold">{t('history.emptyTitle')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.empty')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.emptyHint')}
              </ThemedText>
            </ThemedView>
          )}

          {meaningfulDays > 0 && meaningfulDays < 3 && (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.lowHistoryHint')}
              </ThemedText>
            </ThemedView>
          )}

          <View style={styles.list}>
            <ThemedText type="smallBold">{t('history.previousDays')}</ThemedText>
            {weeklyPastGroups.map((group) => (
              <View key={group.weekStart} style={styles.weekGroup}>
                <View style={styles.weekHeader}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {formatWeekRangeLabel(group.weekStart)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('history.percentOfGoal', { percent: group.weeklyPercent })}
                  </ThemedText>
                </View>
                {group.entries.map((item) => {
                  const percent = state.goalMl > 0 ? Math.round((item.intakeMl / state.goalMl) * 100) : 0;
                  const status =
                    item.intakeMl >= state.goalMl && state.goalMl > 0
                      ? t('history.statusAchieved')
                      : t('history.statusMissed');
                  return (
                    <ThemedView key={item.date} type="backgroundElement" style={styles.row}>
                      <View style={styles.rowLeft}>
                        <ThemedText type="smallBold">{formatDateLabel(item.date)}</ThemedText>
                        <ThemedText
                          type="small"
                          themeColor="textSecondary"
                          numberOfLines={1}
                          ellipsizeMode="tail">
                          {status} -{' '}
                          {item.intakeMl > state.goalMl && state.goalMl > 0
                            ? t('history.overGoal', { ml: item.intakeMl - state.goalMl })
                            : t('history.percentOfGoal', { percent })}
                        </ThemedText>
                      </View>
                      <ThemedText type="smallBold" style={styles.rowRightValue}>
                        {t('history.mlValue', { ml: item.intakeMl })}
                      </ThemedText>
                    </ThemedView>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingSafe: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: Spacing.two,
  },
  subtitle: {
    marginBottom: Spacing.two,
  },
  emptyCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  rangeButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  debugButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  summaryCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  todayMetrics: {
    marginTop: Spacing.one,
    gap: Spacing.half,
  },
  list: {
    gap: Spacing.two,
  },
  weekGroup: {
    gap: Spacing.one,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  row: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  rowRightValue: {
    flexShrink: 0,
    marginLeft: Spacing.one,
  },
});
